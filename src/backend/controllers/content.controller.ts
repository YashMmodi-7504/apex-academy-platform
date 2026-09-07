import { Request, Response } from 'express';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';
import { AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import { detectResourceType } from '../../utils/resourceType.ts';

const BUCKET_NAME = 'lesson-resources';

// Size limits in bytes
const SIZE_LIMITS: Record<string, number> = {
  VIDEO: 2 * 1024 * 1024 * 1024,      // 2 GB
  PDF: 100 * 1024 * 1024,            // 100 MB
  PPT: 100 * 1024 * 1024,            // 100 MB
  NOTE: 100 * 1024 * 1024,           // 100 MB
  CODE: 20 * 1024 * 1024,            // 20 MB
  DATASET: 200 * 1024 * 1024,        // 200 MB
  NOTEBOOK: 200 * 1024 * 1024,       // 200 MB
  SUBTITLE: 20 * 1024 * 1024,        // 20 MB
  LINK: 1 * 1024 * 1024              // 1 MB dummy limit for metadata
};

// Allowed MIME types
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/mkv'],
  PDF: ['application/pdf'],
  PPT: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  NOTE: ['text/markdown', 'text/plain', 'application/pdf', 'application/rtf'],
  CODE: ['text/plain', 'text/x-python', 'application/json', 'text/html', 'text/css', 'text/javascript', 'application/x-sh'],
  DATASET: ['text/csv', 'application/json', 'application/x-parquet', 'application/zip', 'text/plain'],
  NOTEBOOK: ['application/x-ipynb+json', 'application/json', 'text/plain'],
  SUBTITLE: ['text/vtt', 'application/x-subrip', 'text/plain']
};

/**
 * Helper to generate a short-lived signed URL for a storage object path
 */
export async function resolveSignedAssetUrl(urlOrPath?: string | null, expiresInSeconds = 3600): Promise<string | null> {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const storagePath = trimmed
    .replace(/^storage:\/\//, '')
    .replace(/^lesson-resources\//, '');

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn(`[resolveSignedAssetUrl] Failed to sign storage path: ${storagePath}`, error?.message);
      return trimmed;
    }

    return data.signedUrl;
  } catch (err: any) {
    console.error('[resolveSignedAssetUrl] Exception:', err);
    return trimmed;
  }
}

/**
 * POST /api/admin/content/upload/init
 * Direct-to-storage upload initialization & pre-signed URL generation
 */
export async function initContentUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { lessonId, filename, fileSize, mimeType, resourceType, isPrimary, languageCode, title } = req.body;

  if (!lessonId || !filename || typeof filename !== 'string') {
    res.status(400).json({ success: false, error: 'lessonId and filename are required.' });
    return;
  }

  const detectedType = detectResourceType(filename, mimeType, resourceType);
  const maxBytes = SIZE_LIMITS[detectedType] || SIZE_LIMITS.VIDEO;

  if (fileSize && fileSize > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    res.status(400).json({
      success: false,
      error: `File size exceeds the allowable limit of ${maxMb} MB for ${detectedType} assets.`
    });
    return;
  }

  try {
    // 1. Fetch lesson and parent module to construct path
    const { data: lesson, error: lErr } = await supabaseAdmin
      .from('lessons')
      .select('id, module_id, title, lesson_type')
      .eq('id', lessonId)
      .single();

    if (lErr || !lesson) {
      res.status(404).json({ success: false, error: 'Target lesson not found.' });
      return;
    }

    const { data: moduleItem } = await supabaseAdmin
      .from('modules')
      .select('id, course_id')
      .eq('id', lesson.module_id)
      .single();

    const courseId = moduleItem?.course_id || 'unassigned-course';

    // Sanitize filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const assetFolder = isPrimary ? 'primary' : 'resources';
    const storagePath = `courses/${courseId}/modules/${lesson.module_id}/lessons/${lessonId}/${assetFolder}/${timestamp}_${safeFilename}`;

    // 2. Generate signed upload URL from Supabase Storage
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(storagePath);

    if (uploadErr || !uploadData) {
      console.error('[initContentUpload] Error generating signed upload URL:', uploadErr);
      res.status(500).json({ success: false, error: uploadErr?.message || 'Failed to initialize upload session.' });
      return;
    }

    res.json({
      success: true,
      bucket: BUCKET_NAME,
      storagePath,
      signedUrl: uploadData.signedUrl,
      token: uploadData.token,
      fileInfo: {
        lessonId,
        filename: safeFilename,
        fileSize,
        mimeType,
        resourceType: detectedType,
        isPrimary: Boolean(isPrimary),
        languageCode: languageCode || 'en',
        title: title || filename
      }
    });
  } catch (err: any) {
    console.error('[initContentUpload] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error during upload initialization.' });
  }
}

/**
 * POST /api/admin/content/upload/complete
 * Confirm completed direct upload, register asset record & update lesson state
 */
export async function completeContentUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    lessonId,
    storagePath,
    title,
    resourceType,
    isPrimary,
    fileSize,
    mimeType,
    languageCode
  } = req.body;

  if (!lessonId || !storagePath) {
    res.status(400).json({ success: false, error: 'lessonId and storagePath are required.' });
    return;
  }

  try {
    // 1. Verify file exists in Supabase Storage
    const pathParts = storagePath.split('/');
    const folderPath = pathParts.slice(0, -1).join('/');
    const targetFileName = pathParts[pathParts.length - 1];

    const { data: fileList, error: listErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(folderPath);

    if (listErr) {
      console.warn('[completeContentUpload] Warning listing storage folder:', listErr.message);
    }

    const uploadedFile = (fileList || []).find((f: any) => f.name === targetFileName);

    // 2. Detect safe resource type from filename, mimeType, and requested type
    const detectedType = detectResourceType(targetFileName, mimeType, resourceType);
    const finalTitle = title && title.trim().length > 0 ? title.trim() : targetFileName;

    const resourcePayload: any = {
      lesson_id: lessonId,
      title: finalTitle,
      resource_type: detectedType,
      file_url: storagePath
    };

    const { data: newResource, error: rErr } = await supabaseAdmin
      .from('lesson_resources')
      .insert(resourcePayload)
      .select()
      .single();

    if (rErr) {
      console.error('[completeContentUpload] Error creating resource row:', rErr);
      res.status(500).json({ success: false, error: rErr.message });
      return;
    }

    // 3. Primary asset & Video lesson association
    if (isPrimary || detectedType === 'VIDEO') {
      const lessonUpdates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (detectedType === 'VIDEO') {
        lessonUpdates.video_url = storagePath;
        lessonUpdates.lesson_type = 'VIDEO';
      } else if (isPrimary) {
        // If primary non-video asset, still set as primary video if it's media stream
        if (storagePath) {
          lessonUpdates.video_url = storagePath;
        }
      }

      await supabaseAdmin
        .from('lessons')
        .update(lessonUpdates)
        .eq('id', lessonId);
    }

    // 4. Generate short-lived signed preview URL for response
    const signedPreviewUrl = await resolveSignedAssetUrl(storagePath, 3600);

    res.json({
      success: true,
      message: 'Learning content uploaded and attached successfully.',
      resource: {
        ...newResource,
        signed_url: signedPreviewUrl
      }
    });
  } catch (err: any) {
    console.error('[completeContentUpload] Exception:', err);
    res.status(500).json({ success: false, error: 'Failed to complete content ingestion.' });
  }
}

/**
 * GET /api/admin/content/assets/:lessonId
 * Fetch all learning assets (primary & supporting) with signed preview URLs for Admin
 */
export async function getLessonAssets(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { lessonId } = req.params;

  if (!lessonId) {
    res.status(400).json({ success: false, error: 'lessonId is required.' });
    return;
  }

  try {
    // 1. Fetch lesson
    const { data: lesson, error: lErr } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .maybeSingle();

    if (lErr || !lesson) {
      res.status(404).json({ success: false, error: 'Lesson not found.' });
      return;
    }

    // 2. Fetch lesson resources
    const { data: resources } = await supabaseAdmin
      .from('lesson_resources')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('display_order', { ascending: true });

    // 3. Resolve signed URLs for video_url and all resources
    const signedVideoUrl = lesson.video_url ? await resolveSignedAssetUrl(lesson.video_url, 3600) : null;

    const signedResources = await Promise.all((resources || []).map(async (r: any) => ({
      ...r,
      signed_url: await resolveSignedAssetUrl(r.file_url, 3600)
    })));

    res.json({
      success: true,
      lesson: {
        ...lesson,
        signed_video_url: signedVideoUrl
      },
      resources: signedResources
    });
  } catch (err: any) {
    console.error('[getLessonAssets] Exception:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch lesson assets.' });
  }
}

/**
 * POST /api/admin/content/attach
 * Directly attach an existing file path or external link to a lesson
 */
export async function attachContentAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { lessonId, title, resourceType, fileUrl, isPrimary } = req.body;

  if (!lessonId || !title || !fileUrl) {
    res.status(400).json({ success: false, error: 'lessonId, title, and fileUrl are required.' });
    return;
  }

  try {
    const typeUpper = (resourceType || 'LINK').toUpperCase();

    // Insert into lesson_resources
    const { data: resource, error } = await supabaseAdmin
      .from('lesson_resources')
      .insert({
        lesson_id: lessonId,
        title: title.trim(),
        resource_type: typeUpper,
        file_url: fileUrl.trim()
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    // If primary video, update lesson.video_url
    if (isPrimary || typeUpper === 'VIDEO') {
      await supabaseAdmin
        .from('lessons')
        .update({ video_url: fileUrl.trim() })
        .eq('id', lessonId);
    }

    const signedUrl = await resolveSignedAssetUrl(fileUrl.trim(), 3600);

    res.status(201).json({
      success: true,
      message: 'Asset attached successfully.',
      resource: {
        ...resource,
        signed_url: signedUrl
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to attach content asset.' });
  }
}

/**
 * PATCH /api/admin/content/assets/:assetId
 * Update metadata of an attached asset
 */
export async function updateContentAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { assetId } = req.params;
  const { title, resourceType, fileUrl, displayOrder } = req.body;

  if (!assetId) {
    res.status(400).json({ success: false, error: 'assetId is required.' });
    return;
  }

  try {
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (resourceType !== undefined) updateData.resource_type = resourceType.toUpperCase();
    if (fileUrl !== undefined) updateData.file_url = fileUrl.trim();
    if (displayOrder !== undefined) updateData.display_order = parseInt(displayOrder, 10);

    const { data: updated, error } = await supabaseAdmin
      .from('lesson_resources')
      .update(updateData)
      .eq('id', assetId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    const signedUrl = await resolveSignedAssetUrl(updated.file_url, 3600);

    res.json({
      success: true,
      resource: {
        ...updated,
        signed_url: signedUrl
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update asset metadata.' });
  }
}

/**
 * POST /api/admin/content/assets/:assetId/detach
 * Detach asset from lesson and optionally delete from storage
 */
export async function detachContentAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { assetId } = req.params;
  const { deleteFromStorage } = req.body;

  if (!assetId) {
    res.status(400).json({ success: false, error: 'assetId is required.' });
    return;
  }

  try {
    // 1. Fetch asset details
    const { data: resource, error: rErr } = await supabaseAdmin
      .from('lesson_resources')
      .select('*')
      .eq('id', assetId)
      .maybeSingle();

    if (rErr || !resource) {
      res.status(404).json({ success: false, error: 'Resource asset not found.' });
      return;
    }

    // 2. Delete database record
    await supabaseAdmin
      .from('lesson_resources')
      .delete()
      .eq('id', assetId);

    // 3. If primary video for a lesson, clear video_url
    if (resource.resource_type === 'VIDEO') {
      const { data: lesson } = await supabaseAdmin
        .from('lessons')
        .select('id, video_url')
        .eq('id', resource.lesson_id)
        .single();

      if (lesson && lesson.video_url === resource.file_url) {
        await supabaseAdmin
          .from('lessons')
          .update({ video_url: null })
          .eq('id', resource.lesson_id);
      }
    }

    // 4. Optionally remove storage object if requested
    if (deleteFromStorage && resource.file_url && !resource.file_url.startsWith('http')) {
      const cleanPath = resource.file_url
        .replace(/^storage:\/\//, '')
        .replace(/^lesson-resources\//, '');

      await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([cleanPath]);
    }

    res.json({
      success: true,
      message: 'Asset detached successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to detach asset.' });
  }
}

/**
 * GET /api/lessons/:lessonId/content-access
 * Student content authorization & signed URL delivery
 */
export async function getStudentLessonContentAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { lessonId } = req.params;

  if (!userId || !lessonId) {
    res.status(401).json({ success: false, error: 'Authentication and lessonId are required.' });
    return;
  }

  try {
    // 1. Fetch lesson
    const { data: lesson, error: lErr } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .maybeSingle();

    if (lErr || !lesson) {
      res.status(404).json({ success: false, error: 'Lesson not found.' });
      return;
    }

    // 2. Get course via module
    const { data: moduleItem } = await supabaseAdmin
      .from('modules')
      .select('id, course_id')
      .eq('id', lesson.module_id)
      .single();

    if (!moduleItem) {
      res.status(400).json({ success: false, error: 'Lesson module not found.' });
      return;
    }

    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id, slug, is_published')
      .eq('id', moduleItem.course_id)
      .single();

    // Check admin or enrollment access
    const isAdminUser = req.profile?.role === 'ADMIN';

    if (!isAdminUser) {
      if (!course || !course.is_published) {
        res.status(403).json({ success: false, error: 'Course is in draft mode.' });
        return;
      }

      const { data: enrollment } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', course.id)
        .maybeSingle();

      if (!enrollment) {
        res.status(403).json({ success: false, error: 'Active enrollment required to access content.' });
        return;
      }
    }

    // 3. Fetch lesson resources
    const { data: resources } = await supabaseAdmin
      .from('lesson_resources')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('display_order', { ascending: true });

    // 4. Resolve signed URLs
    const signedVideoUrl = lesson.video_url ? await resolveSignedAssetUrl(lesson.video_url, 3600) : null;

    const signedResources = await Promise.all((resources || []).map(async (r: any) => ({
      id: r.id,
      title: r.title,
      resource_type: r.resource_type,
      signed_url: await resolveSignedAssetUrl(r.file_url, 3600)
    })));

    res.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        lesson_type: lesson.lesson_type,
        content: lesson.content,
        signed_video_url: signedVideoUrl,
        duration_seconds: lesson.duration_seconds
      },
      resources: signedResources
    });
  } catch (err: any) {
    console.error('[getStudentLessonContentAccess] Exception:', err);
    res.status(500).json({ success: false, error: 'Failed to access content.' });
  }
}
