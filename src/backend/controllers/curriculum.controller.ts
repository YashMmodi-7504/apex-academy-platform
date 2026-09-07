import { Request, Response } from 'express';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';

const VALID_LESSON_TYPES = ['VIDEO', 'ARTICLE', 'READING', 'PRACTICAL'];
const VALID_RESOURCE_TYPES = ['PDF', 'PPT', 'NOTE', 'CODE', 'DATASET', 'LINK'];

/**
 * GET /api/admin/curriculum/summary
 * Database metrics for Curriculum Dashboard
 */
export async function getCurriculumSummary(req: Request, res: Response): Promise<void> {
  try {
    const [
      { count: domainsCount },
      { count: pathsCount },
      { count: coursesCount },
      { count: modulesCount },
      { count: lessonsCount },
      { count: resourcesCount },
      { count: publishedCount },
      { count: draftCount }
    ] = await Promise.all([
      supabaseAdmin.from('categories').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('programs').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('modules').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('lessons').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('lesson_resources').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', false)
    ]);

    res.json({
      success: true,
      summary: {
        domains: domainsCount || 0,
        careerPaths: pathsCount || 0,
        courses: coursesCount || 0,
        modules: modulesCount || 0,
        lessons: lessonsCount || 0,
        resources: resourcesCount || 0,
        publishedCourses: publishedCount || 0,
        draftCourses: draftCount || 0
      }
    });
  } catch (err: any) {
    console.error('[getCurriculumSummary] Exception:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve curriculum summary.' });
  }
}

/**
 * GET /api/admin/curriculum/courses
 * Master Course Library list with search and filters
 */
export async function getAdminCurriculumCourses(req: Request, res: Response): Promise<void> {
  try {
    const { search, status, difficulty, careerPath } = req.query;

    let query = supabaseAdmin.from('courses').select('*');

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query = query.or(`title.ilike.${term},slug.ilike.${term}`);
    }

    if (status && typeof status === 'string') {
      if (status.toUpperCase() === 'PUBLISHED') {
        query = query.eq('is_published', true);
      } else if (status.toUpperCase() === 'DRAFT') {
        query = query.eq('is_published', false);
      }
    }

    if (difficulty && typeof difficulty === 'string' && difficulty !== 'ALL') {
      query = query.eq('difficulty', difficulty.toUpperCase());
    }

    const { data: courses, error: cErr } = await query.order('created_at', { ascending: false });

    if (cErr) {
      res.status(500).json({ success: false, error: cErr.message });
      return;
    }

    const courseIds = (courses || []).map((c: any) => c.id);

    // Module counts
    const { data: modules } = await supabaseAdmin
      .from('modules')
      .select('id, course_id')
      .in('course_id', courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']);

    const moduleMap: Record<string, string[]> = {};
    const moduleCountMap: Record<string, number> = {};
    (modules || []).forEach((m: any) => {
      moduleCountMap[m.course_id] = (moduleCountMap[m.course_id] || 0) + 1;
      if (!moduleMap[m.course_id]) moduleMap[m.course_id] = [];
      moduleMap[m.course_id].push(m.id);
    });

    const allModuleIds = (modules || []).map((m: any) => m.id);

    // Lesson counts
    const { data: lessons } = await supabaseAdmin
      .from('lessons')
      .select('id, module_id')
      .in('module_id', allModuleIds.length > 0 ? allModuleIds : ['00000000-0000-0000-0000-000000000000']);

    const moduleToCourse: Record<string, string> = {};
    (modules || []).forEach((m: any) => {
      moduleToCourse[m.id] = m.course_id;
    });

    const lessonCountMap: Record<string, number> = {};
    (lessons || []).forEach((l: any) => {
      const cId = moduleToCourse[l.module_id];
      if (cId) {
        lessonCountMap[cId] = (lessonCountMap[cId] || 0) + 1;
      }
    });

    // Associated Programs
    const { data: pcList } = await supabaseAdmin
      .from('program_courses')
      .select('course_id, program:programs(id, title, slug)');

    const programMap: Record<string, { id: string; title: string; slug: string }[]> = {};
    (pcList || []).forEach((pc: any) => {
      if (pc.course_id && pc.program) {
        if (!programMap[pc.course_id]) programMap[pc.course_id] = [];
        programMap[pc.course_id].push({
          id: pc.program.id,
          title: pc.program.title,
          slug: pc.program.slug
        });
      }
    });

    let formattedCourses = (courses || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      difficulty: c.difficulty,
      is_published: c.is_published,
      status: c.is_published ? 'PUBLISHED' : 'DRAFT',
      module_count: moduleCountMap[c.id] || 0,
      lesson_count: lessonCountMap[c.id] || 0,
      associated_paths: (programMap[c.id] || []).map(p => p.title),
      associated_programs: programMap[c.id] || [],
      updated_at: c.updated_at
    }));

    // Filter by career path if requested
    if (careerPath && typeof careerPath === 'string' && careerPath !== 'ALL') {
      formattedCourses = formattedCourses.filter(c => 
        c.associated_programs.some(p => p.id === careerPath || p.slug === careerPath)
      );
    }

    res.json({
      success: true,
      count: formattedCourses.length,
      courses: formattedCourses
    });
  } catch (err: any) {
    console.error('[getAdminCurriculumCourses] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * GET /api/admin/curriculum/courses/:courseId
 * Full course curriculum details including modules, lessons, resources & readiness status
 */
export async function getAdminCourseCurriculum(req: Request, res: Response): Promise<void> {
  const { courseId } = req.params;

  if (!courseId) {
    res.status(400).json({ success: false, error: 'Course ID parameter is required.' });
    return;
  }

  try {
    // 1. Fetch course
    const { data: course, error: cErr } = await supabaseAdmin
      .from('courses')
      .select('*')
      .or(`id.eq.${courseId},slug.eq.${courseId}`)
      .maybeSingle();

    if (cErr) {
      res.status(500).json({ success: false, error: cErr.message });
      return;
    }

    if (!course) {
      res.status(404).json({ success: false, error: 'Course not found.' });
      return;
    }

    // 2. Fetch associated programs for SHARED COURSE WARNING
    const { data: pcList } = await supabaseAdmin
      .from('program_courses')
      .select('program:programs(id, title, slug)')
      .eq('course_id', course.id);

    const associatedPaths = (pcList || []).map((pc: any) => pc.program).filter(Boolean);

    // 3. Fetch modules ordered by display_order
    const { data: modules, error: mErr } = await supabaseAdmin
      .from('modules')
      .select('*')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true });

    if (mErr) {
      res.status(500).json({ success: false, error: mErr.message });
      return;
    }

    const moduleIds = (modules || []).map((m: any) => m.id);

    // 4. Fetch lessons for all modules ordered by display_order
    const { data: lessons, error: lErr } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds.length > 0 ? moduleIds : ['00000000-0000-0000-0000-000000000000'])
      .order('display_order', { ascending: true });

    if (lErr) {
      res.status(500).json({ success: false, error: lErr.message });
      return;
    }

    const lessonIds = (lessons || []).map((l: any) => l.id);

    // 5. Fetch lesson resources
    const { data: resources } = await supabaseAdmin
      .from('lesson_resources')
      .select('*')
      .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['00000000-0000-0000-0000-000000000000'])
      .order('display_order', { ascending: true });

    const resourcesByLesson: Record<string, any[]> = {};
    (resources || []).forEach((r: any) => {
      if (!resourcesByLesson[r.lesson_id]) resourcesByLesson[r.lesson_id] = [];
      resourcesByLesson[r.lesson_id].push(r);
    });

    const lessonsByModule: Record<string, any[]> = {};
    (lessons || []).forEach((l: any) => {
      if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
      lessonsByModule[l.module_id].push({
        ...l,
        resources: resourcesByLesson[l.id] || []
      });
    });

    // Calculate Content Readiness
    let totalLessons = 0;
    let totalResources = 0;
    const blockers: string[] = [];

    if (!modules || modules.length === 0) {
      blockers.push('Course has no curriculum modules configured.');
    }

    let emptyModulesCount = 0;
    let incompleteLessonsCount = 0;

    const formattedModules = (modules || []).map((m: any) => {
      const mLessons = lessonsByModule[m.id] || [];
      totalLessons += mLessons.length;

      mLessons.forEach((l: any) => {
        totalResources += (l.resources || []).length;
        const type = (l.lesson_type || 'ARTICLE').toUpperCase();
        let isLessonIncomplete = false;
        if (type === 'VIDEO') {
          isLessonIncomplete = !l.video_url || l.video_url.trim() === '';
        } else if (type === 'PRACTICAL') {
          const hasContent = l.content && l.content.trim().length > 0;
          const hasPractical = l.practical_instructions && l.practical_instructions.trim().length > 0;
          isLessonIncomplete = !hasContent && !hasPractical;
        } else {
          // ARTICLE or READING
          isLessonIncomplete = !l.content || l.content.trim() === '';
        }

        if (isLessonIncomplete) {
          incompleteLessonsCount++;
        }
      });

      let moduleStatus: 'EMPTY' | 'CONTENT IN PROGRESS' | 'READY' = 'READY';
      if (mLessons.length === 0) {
        moduleStatus = 'EMPTY';
        emptyModulesCount++;
      } else {
        const hasIncompleteLesson = mLessons.some((l: any) => {
          const type = (l.lesson_type || 'ARTICLE').toUpperCase();
          if (type === 'VIDEO') return !l.video_url || l.video_url.trim() === '';
          if (type === 'PRACTICAL') {
            const hasContent = l.content && l.content.trim().length > 0;
            const hasPractical = l.practical_instructions && l.practical_instructions.trim().length > 0;
            return !hasContent && !hasPractical;
          }
          return !l.content || l.content.trim() === '';
        });
        if (hasIncompleteLesson) {
          moduleStatus = 'CONTENT IN PROGRESS';
        }
      }

      return {
        ...m,
        lesson_count: mLessons.length,
        status: moduleStatus,
        lessons: mLessons
      };
    });

    if (emptyModulesCount > 0) {
      blockers.push(`${emptyModulesCount} module(s) contain 0 lessons.`);
    }

    if (incompleteLessonsCount > 0) {
      blockers.push(`${incompleteLessonsCount} lesson(s) are missing primary content (video URL or reading text).`);
    }

    if (totalLessons === 0) {
      blockers.push('Total course lessons count is 0.');
    }

    // Additional course-level readiness requirements
    blockers.push('Final assessment is not configured in current phase.');
    blockers.push('Certificate eligibility logic requires published curriculum content.');

    const isReadyForPublish = blockers.length === 0;

    res.json({
      success: true,
      course: {
        ...course,
        status: course.is_published ? 'PUBLISHED' : 'DRAFT'
      },
      sharedUsage: {
        count: associatedPaths.length,
        paths: associatedPaths,
        isShared: associatedPaths.length > 1
      },
      readiness: {
        moduleCount: modules?.length || 0,
        lessonCount: totalLessons,
        resourceCount: totalResources,
        status: isReadyForPublish ? 'READY' : 'CONTENT REQUIRED',
        isPublishable: isReadyForPublish,
        blockers
      },
      modules: formattedModules
    });
  } catch (err: any) {
    console.error('[getAdminCourseCurriculum] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * POST /api/admin/curriculum/modules
 * Create a new module
 */
export async function createModule(req: Request, res: Response): Promise<void> {
  const { course_id, title, description, is_required } = req.body;

  if (!course_id || !title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Course ID and Title are required.' });
    return;
  }

  try {
    // Get max display order
    const { data: existingModules } = await supabaseAdmin
      .from('modules')
      .select('display_order')
      .eq('course_id', course_id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existingModules && existingModules.length > 0 ? existingModules[0].display_order + 1 : 1;

    const { data: newModule, error } = await supabaseAdmin
      .from('modules')
      .insert({
        course_id,
        title: title.trim(),
        description: description ? description.trim() : null,
        display_order: nextOrder,
        is_required: is_required !== undefined ? Boolean(is_required) : true
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.status(201).json({ success: true, module: newModule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to create module.' });
  }
}

/**
 * PATCH /api/admin/curriculum/modules/:id
 * Edit module title or description
 */
export async function updateModule(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, description, is_required } = req.body;

  if (!id) {
    res.status(400).json({ success: false, error: 'Module ID is required.' });
    return;
  }

  try {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        res.status(400).json({ success: false, error: 'Module title cannot be blank.' });
        return;
      }
      updates.title = title.trim();
    }
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (is_required !== undefined) updates.is_required = Boolean(is_required);

    const { data: updated, error } = await supabaseAdmin
      .from('modules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, module: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update module.' });
  }
}

/**
 * PATCH /api/admin/curriculum/modules/reorder
 * Reorder modules for a course safely
 */
export async function reorderModules(req: Request, res: Response): Promise<void> {
  const { course_id, orders } = req.body; // orders: [{ id: string, display_order: number }]

  if (!course_id || !Array.isArray(orders) || orders.length === 0) {
    res.status(400).json({ success: false, error: 'Course ID and orders array are required.' });
    return;
  }

  try {
    for (const item of orders) {
      if (item.id && typeof item.display_order === 'number') {
        await supabaseAdmin
          .from('modules')
          .update({ display_order: item.display_order, updated_at: new Date().toISOString() })
          .eq('id', item.id)
          .eq('course_id', course_id);
      }
    }

    res.json({ success: true, message: 'Modules reordered successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to reorder modules.' });
  }
}

/**
 * POST /api/admin/curriculum/lessons
 * Create a new lesson
 */
export async function createLesson(req: Request, res: Response): Promise<void> {
  const { module_id, title, description, lesson_type, content, video_url, duration_seconds, is_preview, is_required } = req.body;

  if (!module_id || !title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Module ID and Title are required.' });
    return;
  }

  const typeUpper = (lesson_type || 'VIDEO').toUpperCase();
  if (!VALID_LESSON_TYPES.includes(typeUpper)) {
    res.status(400).json({ success: false, error: `Invalid lesson_type. Must be one of: ${VALID_LESSON_TYPES.join(', ')}` });
    return;
  }

  try {
    const { data: existingLessons } = await supabaseAdmin
      .from('lessons')
      .select('display_order')
      .eq('module_id', module_id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existingLessons && existingLessons.length > 0 ? existingLessons[0].display_order + 1 : 1;

    const { data: newLesson, error } = await supabaseAdmin
      .from('lessons')
      .insert({
        module_id,
        title: title.trim(),
        description: description ? description.trim() : null,
        lesson_type: typeUpper,
        content: content ? content.trim() : null,
        video_url: video_url ? video_url.trim() : null,
        duration_seconds: typeof duration_seconds === 'number' ? duration_seconds : 0,
        display_order: nextOrder,
        is_preview: is_preview !== undefined ? Boolean(is_preview) : false,
        is_required: is_required !== undefined ? Boolean(is_required) : true,
        learning_objectives: Array.isArray(req.body.learning_objectives) ? req.body.learning_objectives : [],
        key_takeaways: Array.isArray(req.body.key_takeaways) ? req.body.key_takeaways : [],
        practical_instructions: req.body.practical_instructions ? req.body.practical_instructions.trim() : null
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.status(201).json({ success: true, lesson: newLesson });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to create lesson.' });
  }
}

/**
 * PATCH /api/admin/curriculum/lessons/:id
 * Edit lesson details
 */
export async function updateLesson(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { 
    title, 
    description, 
    lesson_type, 
    content, 
    video_url, 
    duration_seconds, 
    is_preview, 
    is_required,
    learning_objectives,
    key_takeaways,
    practical_instructions
  } = req.body;

  if (!id) {
    res.status(400).json({ success: false, error: 'Lesson ID is required.' });
    return;
  }

  try {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        res.status(400).json({ success: false, error: 'Lesson title cannot be blank.' });
        return;
      }
      updates.title = title.trim();
    }

    if (lesson_type !== undefined) {
      const typeUpper = lesson_type.toUpperCase();
      if (!VALID_LESSON_TYPES.includes(typeUpper)) {
        res.status(400).json({ success: false, error: `Invalid lesson_type. Must be one of: ${VALID_LESSON_TYPES.join(', ')}` });
        return;
      }
      updates.lesson_type = typeUpper;
    }

    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (content !== undefined) updates.content = content ? content.trim() : null;
    if (video_url !== undefined) updates.video_url = video_url ? video_url.trim() : null;
    if (duration_seconds !== undefined) updates.duration_seconds = Number(duration_seconds) || 0;
    if (is_preview !== undefined) updates.is_preview = Boolean(is_preview);
    if (is_required !== undefined) updates.is_required = Boolean(is_required);
    if (learning_objectives !== undefined) updates.learning_objectives = Array.isArray(learning_objectives) ? learning_objectives : [];
    if (key_takeaways !== undefined) updates.key_takeaways = Array.isArray(key_takeaways) ? key_takeaways : [];
    if (practical_instructions !== undefined) updates.practical_instructions = practical_instructions ? practical_instructions.trim() : null;

    const { data: updated, error } = await supabaseAdmin
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, lesson: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update lesson.' });
  }
}

/**
 * PATCH /api/admin/curriculum/lessons/reorder
 * Reorder lessons within a module
 */
export async function reorderLessons(req: Request, res: Response): Promise<void> {
  const { module_id, orders } = req.body;

  if (!module_id || !Array.isArray(orders) || orders.length === 0) {
    res.status(400).json({ success: false, error: 'Module ID and orders array are required.' });
    return;
  }

  try {
    for (const item of orders) {
      if (item.id && typeof item.display_order === 'number') {
        await supabaseAdmin
          .from('lessons')
          .update({ display_order: item.display_order, updated_at: new Date().toISOString() })
          .eq('id', item.id)
          .eq('module_id', module_id);
      }
    }

    res.json({ success: true, message: 'Lessons reordered successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to reorder lessons.' });
  }
}

/**
 * POST /api/admin/curriculum/lessons/:lessonId/resources
 * Add a resource to a lesson
 */
export async function createLessonResource(req: Request, res: Response): Promise<void> {
  const { lessonId } = req.params;
  const { title, resource_type, file_url } = req.body;

  if (!lessonId || !title || !file_url) {
    res.status(400).json({ success: false, error: 'Lesson ID, Title, and File URL are required.' });
    return;
  }

  const typeUpper = (resource_type || 'PDF').toUpperCase();
  if (!VALID_RESOURCE_TYPES.includes(typeUpper)) {
    res.status(400).json({ success: false, error: `Invalid resource_type. Must be one of: ${VALID_RESOURCE_TYPES.join(', ')}` });
    return;
  }

  try {
    const { data: existingResources } = await supabaseAdmin
      .from('lesson_resources')
      .select('display_order')
      .eq('lesson_id', lessonId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existingResources && existingResources.length > 0 ? existingResources[0].display_order + 1 : 1;

    const { data: newResource, error } = await supabaseAdmin
      .from('lesson_resources')
      .insert({
        lesson_id: lessonId,
        title: title.trim(),
        resource_type: typeUpper,
        file_url: file_url.trim(),
        display_order: nextOrder
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.status(201).json({ success: true, resource: newResource });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to create lesson resource.' });
  }
}

/**
 * PATCH /api/admin/curriculum/resources/:id
 * Edit a lesson resource
 */
export async function updateLessonResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, resource_type, file_url } = req.body;

  if (!id) {
    res.status(400).json({ success: false, error: 'Resource ID is required.' });
    return;
  }

  try {
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title.trim();
    if (file_url !== undefined) updates.file_url = file_url.trim();
    if (resource_type !== undefined) {
      const typeUpper = resource_type.toUpperCase();
      if (!VALID_RESOURCE_TYPES.includes(typeUpper)) {
        res.status(400).json({ success: false, error: `Invalid resource_type. Must be one of: ${VALID_RESOURCE_TYPES.join(', ')}` });
        return;
      }
      updates.resource_type = typeUpper;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('lesson_resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, resource: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update resource.' });
  }
}

/**
 * GET /api/admin/curriculum/career-paths
 * Get list of all 11 Career Learning Paths with mapped courses
 */
export async function getCareerPaths(req: Request, res: Response): Promise<void> {
  try {
    const { data: programs, error: pErr } = await supabaseAdmin
      .from('programs')
      .select('*, category:categories(name, slug)')
      .order('title', { ascending: true });

    if (pErr) {
      res.status(500).json({ success: false, error: pErr.message });
      return;
    }

    const { data: pcList } = await supabaseAdmin
      .from('program_courses')
      .select('*, course:courses(id, title, slug, difficulty, is_published)')
      .order('display_order', { ascending: true });

    const coursesByProgram: Record<string, any[]> = {};
    (pcList || []).forEach((pc: any) => {
      if (pc.program_id && pc.course) {
        if (!coursesByProgram[pc.program_id]) coursesByProgram[pc.program_id] = [];
        coursesByProgram[pc.program_id].push({
          mapping_id: pc.id,
          display_order: pc.display_order,
          is_required: pc.is_required,
          course: pc.course
        });
      }
    });

    const formattedPaths = (programs || []).map((p: any) => ({
      ...p,
      mapped_courses: coursesByProgram[p.id] || []
    }));

    res.json({ success: true, careerPaths: formattedPaths });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve career paths.' });
  }
}

/**
 * POST /api/admin/curriculum/career-paths/:programId/courses
 * Add existing course to path
 */
export async function addCourseToPath(req: Request, res: Response): Promise<void> {
  const { programId } = req.params;
  const { course_id, is_required } = req.body;

  if (!programId || !course_id) {
    res.status(400).json({ success: false, error: 'Program ID and Course ID are required.' });
    return;
  }

  try {
    // Get existing count for display_order
    const { data: existing } = await supabaseAdmin
      .from('program_courses')
      .select('display_order')
      .eq('program_id', programId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1;

    const { data: newMapping, error } = await supabaseAdmin
      .from('program_courses')
      .insert({
        program_id: programId,
        course_id,
        display_order: nextOrder,
        is_required: is_required !== undefined ? Boolean(is_required) : true
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.status(201).json({ success: true, mapping: newMapping });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to add course to career path.' });
  }
}

/**
 * DELETE /api/admin/curriculum/career-paths/:programId/courses/:courseId
 * Remove course mapping from path
 */
export async function removeCourseFromPath(req: Request, res: Response): Promise<void> {
  const { programId, courseId } = req.params;

  if (!programId || !courseId) {
    res.status(400).json({ success: false, error: 'Program ID and Course ID are required.' });
    return;
  }

  try {
    const { error } = await supabaseAdmin
      .from('program_courses')
      .delete()
      .eq('program_id', programId)
      .eq('course_id', courseId);

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, message: 'Course removed from career path.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to remove course from path.' });
  }
}

/**
 * PATCH /api/admin/curriculum/courses/:id/publish
 * Toggle publish status with PUBLISH GUARD
 */
export async function toggleCoursePublish(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { is_published } = req.body;

  if (!id || typeof is_published !== 'boolean') {
    res.status(400).json({ success: false, error: 'Course ID and is_published boolean are required.' });
    return;
  }

  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    let targetCourseId = id;
    if (!isUuid) {
      const { data: c } = await supabaseAdmin.from('courses').select('id').eq('slug', id).maybeSingle();
      if (c) targetCourseId = c.id;
    }

    if (is_published === true) {
      // PUBLISH GUARD ENFORCEMENT
      const { data: modules } = await supabaseAdmin
        .from('modules')
        .select('id')
        .eq('course_id', targetCourseId);

      const moduleIds = (modules || []).map(m => m.id);

      const { data: lessons } = await supabaseAdmin
        .from('lessons')
        .select('id, module_id, lesson_type, video_url, content')
        .in('module_id', moduleIds.length > 0 ? moduleIds : ['00000000-0000-0000-0000-000000000000']);

      const blockers: string[] = [];

      if (!modules || modules.length === 0) {
        blockers.push('Course has no modules configured.');
      }

      const emptyModules = (modules || []).filter(m => !(lessons || []).some(l => l.module_id === m.id));
      if (emptyModules.length > 0) {
        blockers.push(`${emptyModules.length} module(s) contain 0 lessons.`);
      }

      if (!lessons || lessons.length === 0) {
        blockers.push('Total course lessons count is 0.');
      } else {
        const incompleteLessons = lessons.filter(l => {
          const type = (l.lesson_type || 'ARTICLE').toUpperCase();
          if (type === 'VIDEO') return !l.video_url || l.video_url.trim() === '';
          return !l.content || l.content.trim() === '';
        });
        if (incompleteLessons.length > 0) {
          blockers.push(`${incompleteLessons.length} lesson(s) are missing primary content.`);
        }
      }

      if (blockers.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Course cannot be published because required curriculum content is incomplete.',
          blockers
        });
        return;
      }
    }

    // Update publish status
    const { data: updated, error } = await supabaseAdmin
      .from('courses')
      .update({ is_published, updated_at: new Date().toISOString() })
      .eq('id', targetCourseId)
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      message: is_published ? 'Course published successfully.' : 'Course unpublished and saved as DRAFT.',
      course: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update publication status.' });
  }
}
