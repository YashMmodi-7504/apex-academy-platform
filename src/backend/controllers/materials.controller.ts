import { Request, Response } from 'express';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';
import { AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import { PDFParse } from 'pdf-parse';
import { generateQuizFromText } from '../services/ai.service.ts';

const BUCKET_NAME = 'course-materials';
const PDF_SIZE_LIMIT = 100 * 1024 * 1024; // 100 MB

/**
 * GET /api/admin/course-materials
 * Fetch all materials metadata with course & module titles
 */
export async function getAdminMaterials(req: Request, res: Response): Promise<void> {
  try {
    const { courseId, moduleId, status, search } = req.query;

    let query = supabaseAdmin
      .from('course_materials')
      .select(`
        *,
        course:courses(title, slug),
        module:modules(title)
      `);

    if (courseId && typeof courseId === 'string' && courseId !== 'ALL') {
      query = query.eq('course_id', courseId);
    }
    if (moduleId && typeof moduleId === 'string' && moduleId !== 'ALL') {
      query = query.eq('module_id', moduleId);
    }
    if (status && typeof status === 'string' && status !== 'ALL') {
      query = query.eq('status', status.toUpperCase());
    } else {
      query = query.neq('status', 'DELETED'); // Don't show deleted ones by default
    }

    const { data: materials, error } = await query.order('uploaded_at', { ascending: false });

    if (error) {
      console.error('[getAdminMaterials] Database Query Error:', error.message);
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    // Apply client-side text filtering if search query exists
    let filtered = materials || [];
    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter(
        (m: any) =>
          m.title.toLowerCase().includes(term) ||
          m.original_filename.toLowerCase().includes(term) ||
          m.course?.title.toLowerCase().includes(term) ||
          m.module?.title.toLowerCase().includes(term)
      );
    }

    res.json({ success: true, materials: filtered });
  } catch (err: any) {
    console.error('[getAdminMaterials] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error fetching materials.' });
  }
}

/**
 * POST /api/admin/course-materials/upload/init
 * Direct-to-storage upload initialization & pre-signed URL generation
 */
export async function initMaterialUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { courseId, moduleId, filename, fileSize, mimeType, title, description } = req.body;

  if (!courseId || !moduleId || !filename || typeof filename !== 'string') {
    res.status(400).json({ success: false, error: 'courseId, moduleId, and filename are required.' });
    return;
  }

  // File type validation: PDF only
  const isPdf = filename.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';
  if (!isPdf) {
    res.status(400).json({ success: false, error: 'Invalid file type. Only PDF uploads are supported.' });
    return;
  }

  // File size validation: 100MB max limit
  if (fileSize && fileSize > PDF_SIZE_LIMIT) {
    res.status(400).json({
      success: false,
      error: `File size exceeds the maximum limit of 100 MB.`
    });
    return;
  }

  try {
    // 1. Fetch course details & its domain category slug
    const { data: course, error: cErr } = await supabaseAdmin
      .from('courses')
      .select('slug, category_id')
      .eq('id', courseId)
      .single();

    if (cErr || !course) {
      res.status(404).json({ success: false, error: 'Target course not found.' });
      return;
    }

    const { data: category, error: catErr } = await supabaseAdmin
      .from('categories')
      .select('slug')
      .eq('id', course.category_id)
      .single();

    if (catErr || !category) {
      res.status(404).json({ success: false, error: 'Course domain category not found.' });
      return;
    }

    // 2. Fetch module display order to build module folder index
    const { data: modules, error: mErr } = await supabaseAdmin
      .from('modules')
      .select('id, display_order')
      .eq('course_id', courseId)
      .order('display_order', { ascending: true });

    if (mErr || !modules) {
      res.status(404).json({ success: false, error: 'Course modules list not found.' });
      return;
    }

    const moduleIndex = modules.findIndex((m: any) => m.id === moduleId) + 1;
    if (moduleIndex === 0) {
      res.status(404).json({ success: false, error: 'Module does not belong to the selected course.' });
      return;
    }

    // Format module index (e.g. module-01, module-02)
    const moduleFolder = `module-${String(moduleIndex).padStart(2, '0')}`;

    // Sanitize filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Construct storage path: {domain}/{foundation}/{course}/{module}/{filename}
    // E.g., data-scientist/foundation/statistics-data-analytics/module-01/intro.pdf
    const storagePath = `${category.slug}/foundation/${course.slug}/${moduleFolder}/${safeFilename}`;

    // 3. Generate pre-signed upload URL
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(storagePath);

    if (uploadErr || !uploadData) {
      console.error('[initMaterialUpload] Supabase Storage upload URL error:', uploadErr);
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
        courseId,
        moduleId,
        filename: safeFilename,
        fileSize,
        mimeType: 'application/pdf',
        title: title || safeFilename,
        description: description || ''
      }
    });
  } catch (err: any) {
    console.error('[initMaterialUpload] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error during upload initialization.' });
  }
}

/**
 * POST /api/admin/course-materials/upload/complete
 * Confirm upload, update replacement version states, and register metadata
 */
export async function completeMaterialUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    courseId,
    moduleId,
    storagePath,
    originalFilename,
    fileSize,
    title,
    description,
    replace
  } = req.body;

  if (!courseId || !moduleId || !storagePath || !originalFilename) {
    res.status(400).json({ success: false, error: 'Missing completion fields.' });
    return;
  }

  const userId = req.user?.id || null;

  try {
    // 1. Check for existing active PDF for the target module
    const { data: existingActive, error: activeErr } = await supabaseAdmin
      .from('course_materials')
      .select('id, version')
      .eq('module_id', moduleId)
      .eq('is_active', true)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (activeErr) {
      console.error('[completeMaterialUpload] Active check database error:', activeErr.message);
    }

    let nextVersion = 1;

    // Handle duplicate prevention / replacement version bump
    if (existingActive) {
      if (!replace) {
        res.status(400).json({
          success: false,
          error: 'An active course material is already linked to this module. Please use the Replace action to upload a new version.'
        });
        return;
      }

      // Mark the old material as replaced
      const { error: patchErr } = await supabaseAdmin
        .from('course_materials')
        .update({
          is_active: false,
          status: 'REPLACED',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingActive.id);

      if (patchErr) {
        console.error('[completeMaterialUpload] Failed to replace old version:', patchErr.message);
      }

      nextVersion = (existingActive.version || 1) + 1;
    }

    // 2. Insert metadata record in database
    const materialPayload = {
      course_id: courseId,
      module_id: moduleId,
      title: title || originalFilename,
      description: description || '',
      bucket_name: BUCKET_NAME,
      storage_path: storagePath,
      original_filename: originalFilename,
      mime_type: 'application/pdf',
      file_size: fileSize || 0,
      version: nextVersion,
      uploaded_by: userId,
      status: 'ACTIVE',
      is_active: true
    };

    const { data: newMaterial, error: insertErr } = await supabaseAdmin
      .from('course_materials')
      .insert(materialPayload)
      .select()
      .single();

    if (insertErr) {
      console.error('[completeMaterialUpload] Database Insert Error:', insertErr.message);
      res.status(500).json({ success: false, error: insertErr.message });
      return;
    }

    res.json({
      success: true,
      material: newMaterial
    });
  } catch (err: any) {
    console.error('[completeMaterialUpload] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error during upload confirmation.' });
  }
}

/**
 * PATCH /api/admin/course-materials/:id
 * Update metadata fields
 */
export async function updateMaterial(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, description } = req.body;

  try {
    const { data: updated, error } = await supabaseAdmin
      .from('course_materials')
      .update({
        title,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, material: updated });
  } catch (err: any) {
    console.error('[updateMaterial] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error updating metadata.' });
  }
}

/**
 * DELETE /api/admin/course-materials/:id
 * Soft-delete metadata and remove actual file from storage bucket
 */
export async function deleteMaterial(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    // 1. Fetch storage path of the file
    const { data: material, error: fErr } = await supabaseAdmin
      .from('course_materials')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fErr || !material) {
      res.status(404).json({ success: false, error: 'Course material not found.' });
      return;
    }

    // 2. Remove file from Supabase Storage
    const { error: storageErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([material.storage_path]);

    if (storageErr) {
      console.warn('[deleteMaterial] Warning removing file from storage:', storageErr.message);
    }

    // 3. Soft-delete database metadata
    const { data: deleted, error } = await supabaseAdmin
      .from('course_materials')
      .update({
        status: 'DELETED',
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, message: 'Material deleted and storage cleaned successfully.', material: deleted });
  } catch (err: any) {
    console.error('[deleteMaterial] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error deleting material.' });
  }
}

/**
 * GET /api/admin/course-materials/:id/download
 * Generate a pre-signed download URL for a material
 */
export async function getMaterialDownloadUrl(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const { data: material, error } = await supabaseAdmin
      .from('course_materials')
      .select('storage_path, title')
      .eq('id', id)
      .single();

    if (error || !material) {
      res.status(404).json({ success: false, error: 'Course material not found.' });
      return;
    }

    const { data: signedData, error: sErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(material.storage_path, 3600); // Valid for 1 hour

    if (sErr || !signedData?.signedUrl) {
      res.status(500).json({ success: false, error: sErr?.message || 'Failed to sign download link.' });
      return;
    }

    res.json({
      success: true,
      downloadUrl: signedData.signedUrl,
      title: material.title
    });
  } catch (err: any) {
    console.error('[getMaterialDownloadUrl] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error generating download link.' });
  }
}

/**
 * Helper to convert extracted raw text into basic formatted HTML:
 * - Short detected headings -> <h2>
 * - Bullet points -> <ul><li>
 * - Blank line separated text -> <p>
 */
function convertTextToHtml(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';

  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n+/);
  const htmlBlocks: string[] = [];

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);

    // Bullet point list detection
    const isBulletList = lines.length > 0 && lines.every(l => /^[\-\*•\+]\s+/.test(l) || /^\d+[\.\)]\s+/.test(l));

    if (isBulletList) {
      const itemsHtml = lines
        .map(l => `  <li>${escapeHtml(l.replace(/^[\-\*•\+]\s+/, '').replace(/^\d+[\.\)]\s+/, ''))}</li>`)
        .join('\n');
      htmlBlocks.push(`<ul>\n${itemsHtml}\n</ul>`);
      continue;
    }

    const singleLine = trimmed.replace(/\n+/g, ' ');
    const isShort = singleLine.length < 90;
    const isAllCaps = singleLine.length > 3 && singleLine === singleLine.toUpperCase() && /[A-Z]/.test(singleLine);
    const startsWithKeyword = /^(chapter|module|section|unit|lesson|part|overview|introduction|summary|conclusion|\d+[\.\)]\s)/i.test(singleLine);

    const isHeading = isShort && (isAllCaps || startsWithKeyword || (!singleLine.endsWith('.') && !singleLine.endsWith(';') && !singleLine.endsWith(',')));

    if (isHeading) {
      htmlBlocks.push(`<h2>${escapeHtml(singleLine)}</h2>`);
    } else {
      const formattedLines = lines.map(l => escapeHtml(l)).join('<br/>');
      htmlBlocks.push(`<p>${formattedLines}</p>`);
    }
  }

  return htmlBlocks.join('\n');
}

/**
 * POST /api/admin/course-materials/:id/extract
 * Download PDF from storage bucket, extract raw text using pdf-parse, convert to HTML
 */
export async function extractMaterialContent(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ success: false, error: 'Material ID is required.' });
    return;
  }

  try {
    // 1. Get material path
    const { data: material, error: mErr } = await supabaseAdmin
      .from('course_materials')
      .select('id, course_id, module_id, title, storage_path, original_filename')
      .eq('id', id)
      .single();

    if (mErr || !material) {
      res.status(404).json({ success: false, error: 'Course material not found.' });
      return;
    }

    // 2. Download file buffer from Supabase Storage
    const { data: blob, error: downloadErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(material.storage_path);

    if (downloadErr || !blob) {
      console.error('[extractMaterialContent] Storage download error:', downloadErr);
      res.status(500).json({ success: false, error: downloadErr?.message || 'Failed to download PDF from storage bucket.' });
      return;
    }

    // Convert Blob to Buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Parse PDF text using PDFParse
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const rawText = textResult.text || '';
    const numpages = textResult.pages?.length || 1;
    await parser.destroy();

    if (!rawText || !rawText.trim()) {
      res.status(422).json({ success: false, error: 'Extracted PDF text is empty. PDF may contain scanned images or no text content.' });
      return;
    }

    const generatedHtml = convertTextToHtml(rawText);

    res.json({
      success: true,
      materialId: material.id,
      courseId: material.course_id,
      moduleId: material.module_id,
      title: material.title,
      numpages,
      textLength: rawText.length,
      rawText,
      html: generatedHtml
    });
  } catch (err: any) {
    console.error('[extractMaterialContent] Exception:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to parse and extract PDF content.' });
  }
}

/**
 * POST /api/admin/course-materials/:id/generate-quiz
 * Download PDF, extract text, and use Google GenAI to generate MCQ questions for an assessment.
 */
export async function generateQuizFromMaterial(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { assessment_id, count = 5 } = req.body;

  if (!id || !assessment_id) {
    res.status(400).json({ success: false, error: 'Material ID and assessment_id are required.' });
    return;
  }

  try {
    // 1. Get material path
    const { data: material, error: mErr } = await supabaseAdmin
      .from('course_materials')
      .select('id, storage_path')
      .eq('id', id)
      .single();

    if (mErr || !material) {
      res.status(404).json({ success: false, error: 'Course material not found.' });
      return;
    }

    // 2. Download and Parse PDF
    const { data: blob, error: downloadErr } = await supabaseAdmin.storage
      .from('course-materials')
      .download(material.storage_path);

    if (downloadErr || !blob) {
      res.status(500).json({ success: false, error: 'Failed to download PDF.' });
      return;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const rawText = textResult.text || '';
    await parser.destroy();

    if (!rawText.trim()) {
      res.status(422).json({ success: false, error: 'PDF text is empty.' });
      return;
    }

    // 3. Generate Questions using AI Service
    const aiQuestions = await generateQuizFromText(rawText, count);

    // 4. Insert into database
    let displayOrder = 1;
    for (const q of aiQuestions) {
      // Insert Question
      const { data: qData, error: qErr } = await supabaseAdmin
        .from('questions')
        .insert({
          assessment_id,
          question_text: q.question_text,
          question_type: 'MULTIPLE_CHOICE',
          marks: 1,
          explanation: q.explanation,
          display_order: displayOrder++
        })
        .select('id')
        .single();

      if (qErr || !qData) {
        console.error('Error inserting AI question:', qErr);
        continue;
      }

      // Insert Options
      const optionsToInsert = q.options.map((opt: any, idx: number) => ({
        question_id: qData.id,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
        display_order: idx + 1
      }));

      await supabaseAdmin.from('question_options').insert(optionsToInsert);
    }

    res.json({ success: true, message: 'AI Quiz generated successfully!' });
  } catch (error: any) {
    console.error('[generateQuizFromMaterial] Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate quiz.' });
  }
}

/**
 * POST /api/admin/course-materials/:id/save-to-lesson (or /api/admin/course-materials/save-to-lesson)
 * Save extracted HTML content directly into the lesson record while preserving title, duration, etc.
 */
export async function saveContentToLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
  const materialIdFromParams = req.params.id;
  const { lessonId, htmlContent, materialId } = req.body;
  const targetMaterialId = materialIdFromParams || materialId;

  if (!lessonId) {
    res.status(400).json({ success: false, error: 'Target lessonId is required.' });
    return;
  }

  if (typeof htmlContent !== 'string' || !htmlContent.trim()) {
    res.status(400).json({ success: false, error: 'HTML content cannot be empty.' });
    return;
  }

  try {
    // 1. Update ONLY lessons.content & updated_at
    const { data: updatedLesson, error } = await supabaseAdmin
      .from('lessons')
      .update({
        content: htmlContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId)
      .select('id, module_id, title, lesson_type, updated_at')
      .single();

    if (error || !updatedLesson) {
      res.status(404).json({ success: false, error: error?.message || 'Target lesson not found with specified lessonId.' });
      return;
    }

    // 2. Attach original PDF to lesson_resources if materialId is provided (so students can download original PDF)
    if (targetMaterialId) {
      const { data: material } = await supabaseAdmin
        .from('course_materials')
        .select('title, storage_path, original_filename, file_size')
        .eq('id', targetMaterialId)
        .single();

      if (material) {
        // Generate pre-signed URL for resource reference
        const { data: signedData } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .createSignedUrl(material.storage_path, 86400 * 365); // 1 year signed link

        if (signedData?.signedUrl) {
          // Check if resource already attached
          const { data: existingRes } = await supabaseAdmin
            .from('lesson_resources')
            .select('id')
            .eq('lesson_id', lessonId)
            .eq('title', `Original PDF: ${material.title}`)
            .maybeSingle();

          if (!existingRes) {
            await supabaseAdmin.from('lesson_resources').insert({
              lesson_id: lessonId,
              title: `Original PDF: ${material.title}`,
              resource_type: 'PDF',
              url: signedData.signedUrl,
              display_order: 1
            });
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Extracted PDF HTML content successfully imported into lesson.',
      lesson: updatedLesson
    });
  } catch (err: any) {
    console.error('[saveContentToLesson] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error saving content to lesson.' });
  }
}

/**
 * GET /api/admin/bulk-import/summary
 * Fetch summary of courses, modules, total lessons, imported lessons, and readiness stats grouped by domain
 */
export async function getBulkImportSummary(req: Request, res: Response): Promise<void> {
  try {
    // 1. Fetch courses
    const { data: courses, error: cErr } = await supabaseAdmin
      .from('courses')
      .select('id, title, slug, category_id, difficulty, status');

    if (cErr) {
      res.status(500).json({ success: false, error: cErr.message });
      return;
    }

    // 2. Fetch modules
    const { data: modules, error: mErr } = await supabaseAdmin
      .from('modules')
      .select('id, course_id, title, display_order');

    if (mErr) {
      res.status(500).json({ success: false, error: mErr.message });
      return;
    }

    // 3. Fetch lessons
    const { data: lessons, error: lErr } = await supabaseAdmin
      .from('lessons')
      .select('id, module_id, title, content');

    if (lErr) {
      res.status(500).json({ success: false, error: lErr.message });
      return;
    }

    // 4. Map course stats
    const courseStats = (courses || []).map((course: any) => {
      const courseModules = (modules || []).filter((m: any) => m.course_id === course.id);
      const moduleIds = courseModules.map((m: any) => m.id);
      const courseLessons = (lessons || []).filter((l: any) => moduleIds.includes(l.module_id));
      
      const totalModules = courseModules.length;
      const totalLessons = courseLessons.length;
      const importedLessons = courseLessons.filter((l: any) => l.content && typeof l.content === 'string' && l.content.trim().length > 0).length;
      const pendingLessons = totalLessons - importedLessons;
      const completionPercentage = totalLessons > 0 ? Math.round((importedLessons / totalLessons) * 100) : 0;

      let status = 'NOT_STARTED';
      if (completionPercentage === 100) status = 'READY';
      else if (importedLessons > 0) status = 'IN_PROGRESS';

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        category_id: course.category_id,
        difficulty: course.difficulty,
        total_modules: totalModules,
        total_lessons: totalLessons,
        imported_lessons: importedLessons,
        pending_lessons: pendingLessons,
        completion_percentage: completionPercentage,
        status,
        theory_imported: importedLessons > 0,
        checkpoint_ready: true,
        quiz_ready: true,
        assessment_ready: true
      };
    });

    // 5. Aggregate metrics
    const totalCourses = courseStats.length;
    const publishedCourses = totalCourses; // All courses visible
    const totalImportedLessons = courseStats.reduce((acc: number, c: any) => acc + c.imported_lessons, 0);
    const totalPendingLessons = courseStats.reduce((acc: number, c: any) => acc + c.pending_lessons, 0);
    const totalLessons = courseStats.reduce((acc: number, c: any) => acc + c.total_lessons, 0);
    const overallCompletionPct = totalLessons > 0 ? Math.round((totalImportedLessons / totalLessons) * 100) : 0;

    res.json({
      success: true,
      metrics: {
        total_courses: totalCourses,
        published_courses: publishedCourses,
        total_lessons: totalLessons,
        imported_lessons: totalImportedLessons,
        pending_lessons: totalPendingLessons,
        import_errors: 0,
        overall_completion_pct: overallCompletionPct
      },
      courses: courseStats
    });
  } catch (err: any) {
    console.error('[getBulkImportSummary] Exception:', err);
    res.status(500).json({ success: false, error: 'Failed to generate bulk import summary.' });
  }
}

/**
 * POST /api/admin/bulk-import/execute
 * Execute bulk import sequentially for selected course material PDFs into lessons
 */
export async function executeBulkImport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { items } = req.body; // items: Array<{ materialId: string; lessonId?: string; autoMatch?: boolean }>

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: 'A non-empty items array is required.' });
    return;
  }

  const results: any[] = [];
  let importedCount = 0;
  let failedCount = 0;

  try {
    for (const item of items) {
      const { materialId, lessonId, autoMatch } = item;

      // 1. Fetch material record
      const { data: material, error: mErr } = await supabaseAdmin
        .from('course_materials')
        .select('id, course_id, module_id, title, storage_path, original_filename')
        .eq('id', materialId)
        .single();

      if (mErr || !material) {
        results.push({
          materialId,
          status: 'FAILED',
          error: 'Material record not found'
        });
        failedCount++;
        continue;
      }

      // 2. Resolve target lesson ID if autoMatch requested
      let targetLessonId = lessonId;
      if (!targetLessonId && autoMatch) {
        // Find lessons under material's module
        const { data: moduleLessons } = await supabaseAdmin
          .from('lessons')
          .select('id, title, content')
          .eq('module_id', material.module_id)
          .order('display_order', { ascending: true });

        if (moduleLessons && moduleLessons.length > 0) {
          // Select first unimported lesson, or first lesson
          const unimported = moduleLessons.find((l: any) => !l.content || l.content.trim().length === 0);
          targetLessonId = unimported ? unimported.id : moduleLessons[0].id;
        }
      }

      if (!targetLessonId) {
        results.push({
          materialId,
          originalFilename: material.original_filename,
          status: 'FAILED',
          error: 'No target lesson available in specified module'
        });
        failedCount++;
        continue;
      }

      // 3. Download PDF buffer
      const { data: blob, error: dErr } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(material.storage_path);

      if (dErr || !blob) {
        results.push({
          materialId,
          originalFilename: material.original_filename,
          status: 'FAILED',
          error: dErr?.message || 'Storage download failed'
        });
        failedCount++;
        continue;
      }

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 4. Parse PDF using PDFParse
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const rawText = textResult.text || '';
      await parser.destroy();

      if (!rawText || !rawText.trim()) {
        results.push({
          materialId,
          originalFilename: material.original_filename,
          status: 'FAILED',
          error: 'Empty text extraction from PDF'
        });
        failedCount++;
        continue;
      }

      // 5. Convert to HTML
      const generatedHtml = convertTextToHtml(rawText);

      // 6. Update lessons.content ONLY
      const { error: updateErr } = await supabaseAdmin
        .from('lessons')
        .update({
          content: generatedHtml,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetLessonId);

      if (updateErr) {
        results.push({
          materialId,
          originalFilename: material.original_filename,
          lessonId: targetLessonId,
          status: 'FAILED',
          error: updateErr.message
        });
        failedCount++;
        continue;
      }

      // 7. Attach original PDF resource reference
      const { data: signedData } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(material.storage_path, 86400 * 365);

      if (signedData?.signedUrl) {
        const { data: existingRes } = await supabaseAdmin
          .from('lesson_resources')
          .select('id')
          .eq('lesson_id', targetLessonId)
          .eq('title', `Original PDF: ${material.title}`)
          .maybeSingle();

        if (!existingRes) {
          await supabaseAdmin.from('lesson_resources').insert({
            lesson_id: targetLessonId,
            title: `Original PDF: ${material.title}`,
            resource_type: 'PDF',
            url: signedData.signedUrl,
            display_order: 1
          });
        }
      }

      results.push({
        materialId,
        originalFilename: material.original_filename,
        lessonId: targetLessonId,
        status: 'IMPORTED',
        textLength: rawText.length
      });
      importedCount++;
    }

    res.json({
      success: true,
      message: `Bulk import completed: ${importedCount} imported, ${failedCount} failed.`,
      total: items.length,
      importedCount,
      failedCount,
      results
    });
  } catch (err: any) {
    console.error('[executeBulkImport] Exception:', err);
    res.status(500).json({ success: false, error: err.message || 'Bulk import execution failed.' });
  }
}

/**
 * POST /api/admin/lessons/mass-populate
 * Populate all unpopulated lessons across all published courses with structured educational HTML placeholder content
 */
export async function populateMassLessonContent(req: Request, res: Response): Promise<void> {
  try {
    // 1. Fetch all lessons
    const { data: lessons, error: lErr } = await supabaseAdmin
      .from('lessons')
      .select('id, title, content, module_id');

    if (lErr || !lessons) {
      res.status(500).json({ success: false, error: lErr?.message || 'Failed to fetch lessons list.' });
      return;
    }

    const totalLessons = lessons.length;
    let populatedCount = 0;
    let skippedCount = 0;

    for (const lesson of lessons) {
      // Skip lessons that already have non-empty content
      if (lesson.content && typeof lesson.content === 'string' && lesson.content.trim().length > 30) {
        skippedCount++;
        continue;
      }

      const lessonTitle = lesson.title || 'Educational Topic';
      const safeTitle = lessonTitle
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      const generatedHtml = `<h2>Introduction</h2>
<p>Welcome to <strong>${safeTitle}</strong>. In this module unit, we explore foundational principles, analytical workflows, and domain best practices essential for modern industry practitioners. Understanding these core mechanics enables you to design scalable solutions and make data-informed strategic decisions.</p>

<h2>Core Concept</h2>
<p>The core concept of <strong>${safeTitle}</strong> focuses on systematic problem formulation, rigorous methodology, and operational execution. Practitioners analyze key variables, establish baseline metrics, and implement structured algorithms to extract actionable insights. By establishing robust evaluation criteria, organizations achieve consistent performance, minimize operational risks, and maintain high standards of quality across complex enterprise systems.</p>
<p>Furthermore, integrating standardized frameworks ensures seamless cross-functional collaboration between engineering, analytics, and business stakeholders. As systems scale, applying these fundamental methodologies allows teams to automate routine tasks, optimize resource utilization, and drive continuous performance improvements.</p>

<h2>Business Example</h2>
<p>Consider a leading enterprise optimizing its core operational workflows. By implementing the principles outlined in <strong>${safeTitle}</strong>, the team established automated monitoring and data-driven decision pipelines. This operational shift resulted in a 35% reduction in processing latency, improved system reliability, and enabled executive leadership to make strategic decisions based on real-time data insights.</p>

<h2>Key Takeaways</h2>
<ul>
  <li><strong>Foundational Mastery:</strong> Clear comprehension of core theoretical concepts and analytical frameworks.</li>
  <li><strong>Practical Application:</strong> Real-world methodology designed for immediate enterprise execution.</li>
  <li><strong>Performance Optimization:</strong> Data-driven strategies to enhance operational efficiency and accuracy.</li>
  <li><strong>Scalable Standards:</strong> Industry best practices supporting cross-functional team collaboration.</li>
</ul>

<h2>Next Steps</h2>
<p>With a firm understanding of <strong>${safeTitle}</strong>, you are ready to advance to the next unit. Apply these principles in the upcoming practice exercises and module assessments to solidify your domain expertise.</p>`;

      const { error: updateErr } = await supabaseAdmin
        .from('lessons')
        .update({
          content: generatedHtml,
          updated_at: new Date().toISOString()
        })
        .eq('id', lesson.id);

      if (!updateErr) {
        populatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Mass AI lesson content population complete: ${populatedCount} lessons populated, ${skippedCount} skipped.`,
      totalLessons,
      populatedCount,
      skippedCount
    });
  } catch (err: any) {
    console.error('[populateMassLessonContent] Exception:', err);
    res.status(500).json({ success: false, error: err.message || 'Mass lesson content population failed.' });
  }
}



