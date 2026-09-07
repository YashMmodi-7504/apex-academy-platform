import { Request, Response } from 'express';
import { supabaseAdmin } from '../database/supabaseAdmin';
import { resolveSignedAssetUrl } from './content.controller.ts';
import { getStudentCheckpoint, submitStudentAttempt } from '../services/checkpoint.service.ts';
import { 
  getStudentModuleAssessment, 
  submitStudentModuleAssessment, 
  hasPassedModuleAssessment 
} from '../services/moduleAssessment.service.ts';
import { 
  getStudentFinalAssessment, 
  submitStudentFinalAssessment, 
  checkFinalAssessmentEligibility 
} from '../services/finalAssessment.service.ts';
import { evaluateCourseCompletion } from '../services/courseCompletion.service.ts';

export interface AuthenticatedRequest extends Request {
  user?: any;
  profile?: any;
}

/**
 * Helper to verify if all required lessons in a module are completed
 */
async function checkModuleLessonsCompleted(userId: string, courseId: string, moduleId: string): Promise<boolean> {
  const { data: reqLessons } = await supabaseAdmin
    .from('lessons')
    .select('id')
    .eq('module_id', moduleId)
    .eq('is_required', true);

  if (!reqLessons || reqLessons.length === 0) return true;

  const reqLessonIds = reqLessons.map(l => l.id);

  const { data: completedProg } = await supabaseAdmin
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'COMPLETED')
    .in('lesson_id', reqLessonIds);

  return (completedProg?.length || 0) >= reqLessonIds.length;
}

/**
 * GET /api/learn/:courseSlugOrId
 * Returns course structure, modules, lessons, and enrollment progress
 */
export async function getCourseLearningOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const userRole = req.profile?.role || 'STUDENT';
  const isAdmin = userRole === 'ADMIN';
  const { courseSlugOrId } = req.params;

  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseSlugOrId);
    let courseQuery = supabaseAdmin.from('courses').select('*');
    if (isUuid) {
      courseQuery = courseQuery.eq('id', courseSlugOrId);
    } else {
      courseQuery = courseQuery.eq('slug', courseSlugOrId);
    }

    const { data: course, error: courseErr } = await courseQuery.maybeSingle();

    if (courseErr || !course) {
      res.status(404).json({ success: false, error: 'Course not found.' });
      return;
    }

    let { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', course.id)
      .maybeSingle();

    if (!enrollment && !course.is_published && !isAdmin) {
      res.status(404).json({ success: false, error: 'Course is in DRAFT status and not available.' });
      return;
    }

    const { data: modules, error: mErr } = await supabaseAdmin
      .from('modules')
      .select('id, title, description, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true });

    if (mErr) {
      res.status(500).json({ success: false, error: mErr.message });
      return;
    }

    const moduleIds = (modules || []).map((m) => m.id);

    const { data: lessons, error: lErr } = await supabaseAdmin
      .from('lessons')
      .select('id, module_id, title, lesson_type, duration_seconds, display_order, is_preview, is_required')
      .in('module_id', moduleIds.length > 0 ? moduleIds : ['00000000-0000-0000-0000-000000000000'])
      .order('display_order', { ascending: true });

    if (lErr) {
      res.status(500).json({ success: false, error: lErr.message });
      return;
    }

    const lessonIds = (lessons || []).map((l) => l.id);

    const { data: progressList } = await supabaseAdmin
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['00000000-0000-0000-0000-000000000000']);

    const progressMap: Record<string, any> = {};
    (progressList || []).forEach((p) => {
      progressMap[p.lesson_id] = p;
    });

    const lessonsByModule: Record<string, any[]> = {};
    (lessons || []).forEach((l) => {
      if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
      const userProg = progressMap[l.id];
      lessonsByModule[l.module_id].push({
        ...l,
        progress: userProg || { status: 'NOT_STARTED', watch_percentage: 0, last_position_seconds: 0 }
      });
    });

    const structuredModules = await Promise.all((modules || []).map(async (m) => {
      const mLessons = lessonsByModule[m.id] || [];
      const allLessonsDone = mLessons.length > 0 && mLessons.every((l: any) => l.progress?.status === 'COMPLETED');
      const assessmentPassed = await hasPassedModuleAssessment(userId, m.id);

      return {
        ...m,
        lessons: mLessons,
        assessmentUnlocked: allLessonsDone || isAdmin,
        assessmentPassed,
        isCompleted: allLessonsDone && assessmentPassed
      };
    }));

    const totalRequiredLessons = (lessons || []).length;
    const completedRequiredLessons = (lessons || []).filter((l) => progressMap[l.id]?.status === 'COMPLETED').length;
    const progressPercentage = totalRequiredLessons > 0 ? Math.round((completedRequiredLessons / totalRequiredLessons) * 100) : 0;

    const { data: finalAssessment } = await supabaseAdmin
      .from('assessments')
      .select('id')
      .eq('course_id', course.id)
      .eq('type', 'FINAL')
      .maybeSingle();

    res.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        short_description: course.short_description,
        description: course.description,
        difficulty: course.difficulty,
        is_published: course.is_published
      },
      enrollment: enrollment || (isAdmin ? { status: 'ADMIN_PREVIEW', is_preview: true, progress_percentage: progressPercentage } : null),
      modules: structuredModules,
      progressMap,
      stats: {
        totalRequiredLessons,
        completedRequiredLessons,
        progressPercentage
      },
      hasFinalAssessment: Boolean(finalAssessment)
    });
  } catch (err: any) {
    console.error('[getCourseLearningOverview] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * GET /api/learn/:courseSlugOrId/lessons/:lessonId
 * Fetch single lesson details and content
 */
export async function getLessonContent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const userRole = req.profile?.role || 'STUDENT';
  const isAdmin = userRole === 'ADMIN';
  const { courseSlugOrId, lessonId } = req.params;

  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseSlugOrId);
    let courseQuery = supabaseAdmin.from('courses').select('*');
    if (isUuid) {
      courseQuery = courseQuery.eq('id', courseSlugOrId);
    } else {
      courseQuery = courseQuery.eq('slug', courseSlugOrId);
    }

    const { data: course } = await courseQuery.maybeSingle();

    if (!course) {
      res.status(404).json({ success: false, error: 'Course not found.' });
      return;
    }

    let { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', course.id)
      .maybeSingle();

    if (!enrollment && !course.is_published && !isAdmin) {
      res.status(404).json({ success: false, error: 'Course is in DRAFT status and not available.' });
      return;
    }

    const { data: lesson, error: lErr } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .maybeSingle();

    if (lErr || !lesson) {
      res.status(404).json({ success: false, error: 'Lesson not found.' });
      return;
    }

    const { data: parentModule } = await supabaseAdmin
      .from('modules')
      .select('id, course_id, title')
      .eq('id', lesson.module_id)
      .maybeSingle();

    if (!parentModule || parentModule.course_id !== course.id) {
      res.status(400).json({ success: false, error: 'Lesson does not belong to the specified course.' });
      return;
    }

    const { data: resources } = await supabaseAdmin
      .from('lesson_resources')
      .select('*')
      .eq('lesson_id', lesson.id)
      .order('display_order', { ascending: true });

    let { data: progress } = await supabaseAdmin
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lesson.id)
      .maybeSingle();

    if (!progress && !isAdmin && enrollment) {
      const { data: newProg, error: createProgErr } = await supabaseAdmin
        .from('lesson_progress')
        .insert({
          user_id: userId,
          course_id: course.id,
          lesson_id: lesson.id,
          status: 'IN_PROGRESS',
          started_at: new Date().toISOString(),
          watch_percentage: 0,
          last_position_seconds: 0,
        })
        .select('*')
        .single();

      if (!createProgErr) {
        progress = newProg;
      }
    }

    if (enrollment && enrollment.id) {
      await supabaseAdmin
        .from('enrollments')
        .update({
          last_accessed_lesson_id: lesson.id,
          started_at: enrollment?.started_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id);
    }

    const { data: modulesWithLessons } = await supabaseAdmin
      .from('modules')
      .select(`
        id,
        display_order,
        lessons (
          id,
          title,
          lesson_type,
          display_order
        )
      `)
      .eq('course_id', course.id)
      .order('display_order', { ascending: true });

    const flatLessons: any[] = [];
    (modulesWithLessons || []).forEach((m: any) => {
      const sortedL = (m.lessons || []).sort((a: any, b: any) => a.display_order - b.display_order);
      flatLessons.push(...sortedL);
    });

    const currentIndex = flatLessons.findIndex((l) => l.id === lesson.id);
    const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

    const signedVideoUrl = lesson.video_url ? await resolveSignedAssetUrl(lesson.video_url, 3600) : null;
    const signedResources = await Promise.all((resources || []).map(async (r: any) => ({
      ...r,
      file_url: await resolveSignedAssetUrl(r.file_url, 3600)
    })));

    res.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        is_published: course.is_published
      },
      module: {
        id: parentModule.id,
        title: parentModule.title,
      },
      lesson: {
        ...lesson,
        video_url: signedVideoUrl || lesson.video_url,
        learning_objectives: lesson.learning_objectives || [],
        key_takeaways: lesson.key_takeaways || [],
        practical_instructions: lesson.practical_instructions || null
      },
      resources: signedResources,
      progress: progress || { status: 'NOT_STARTED', watch_percentage: 0, last_position_seconds: 0 },
      prevLesson,
      nextLesson,
    });
  } catch (err: any) {
    console.error('[getLessonContent] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * GET /api/learn/:courseSlugOrId/lessons/:lessonId/checkpoint
 */
export async function getLessonCheckpointHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { lessonId } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  const checkpoint = getStudentCheckpoint(lessonId, userId);
  if (!checkpoint) {
    res.json({ success: true, checkpoint: null });
    return;
  }

  res.json({ success: true, checkpoint });
}

/**
 * POST /api/learn/:courseSlugOrId/lessons/:lessonId/checkpoint/attempt
 */
export async function submitCheckpointAttemptHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { lessonId } = req.params;
  const { selected_option_id } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  if (!selected_option_id) {
    res.status(400).json({ success: false, error: 'Selected option ID is required.' });
    return;
  }

  const result = submitStudentAttempt(userId, lessonId, selected_option_id);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  res.json(result);
}

/**
 * GET /api/learn/:courseSlugOrId/modules/:moduleId/assessment
 * Fetch module assessment details (SECURE: DOES NOT EXPOSE ANSWER KEYS OR IS_CORRECT)
 */
export async function getModuleAssessmentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const userRole = req.profile?.role || 'STUDENT';
  const isAdmin = userRole === 'ADMIN';
  const { courseSlugOrId, moduleId } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseSlugOrId);
  let courseQuery = supabaseAdmin.from('courses').select('id');
  if (isUuid) courseQuery = courseQuery.eq('id', courseSlugOrId);
  else courseQuery = courseQuery.eq('slug', courseSlugOrId);

  const { data: course } = await courseQuery.maybeSingle();
  if (!course) {
    res.status(404).json({ success: false, error: 'Course not found.' });
    return;
  }

  const lessonsCompleted = await checkModuleLessonsCompleted(userId, course.id, moduleId);
  const isUnlocked = lessonsCompleted || isAdmin;

  const result = await getStudentModuleAssessment(userId, moduleId, isUnlocked);
  if (!result) {
    res.status(404).json({ success: false, error: 'Module assessment not found.' });
    return;
  }

  res.json({ success: true, ...result });
}

/**
 * POST /api/learn/:courseSlugOrId/modules/:moduleId/assessment/submit
 * Submit and Grade Module Assessment Server-Side
 */
export async function submitModuleAssessmentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { courseSlugOrId, moduleId } = req.params;
  const { assessment_id, answers } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  if (!assessment_id || !Array.isArray(answers)) {
    res.status(400).json({ success: false, error: 'Assessment ID and answers array are required.' });
    return;
  }

  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseSlugOrId);
  let courseQuery = supabaseAdmin.from('courses').select('id');
  if (isUuid) courseQuery = courseQuery.eq('id', courseSlugOrId);
  else courseQuery = courseQuery.eq('slug', courseSlugOrId);

  const { data: course } = await courseQuery.maybeSingle();
  if (!course) {
    res.status(404).json({ success: false, error: 'Course not found.' });
    return;
  }

  const lessonsCompleted = await checkModuleLessonsCompleted(userId, course.id, moduleId);
  if (!lessonsCompleted) {
    res.status(403).json({
      success: false,
      error: 'Module assessment is locked. Complete all required lessons in this module first.'
    });
    return;
  }

  const result = await submitStudentModuleAssessment(userId, moduleId, assessment_id, answers, true);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  // Trigger authoritative course completion re-evaluation
  const completionSummary = await evaluateCourseCompletion(userId, course.id);

  res.json({
    ...result,
    completion: completionSummary
  });
}

/**
 * POST /api/learn/:courseSlugOrId/lessons/:lessonId/progress
 */
export async function updateLessonProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { courseSlugOrId, lessonId } = req.params;
  const { last_position_seconds, watch_percentage } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseSlugOrId);
    let courseQuery = supabaseAdmin.from('courses').select('id');
    if (isUuid) {
      courseQuery = courseQuery.eq('id', courseSlugOrId);
    } else {
      courseQuery = courseQuery.eq('slug', courseSlugOrId);
    }

    const { data: course } = await courseQuery.maybeSingle();

    if (!course) {
      res.status(404).json({ success: false, error: 'Course not found.' });
      return;
    }

    const { data: existingProg } = await supabaseAdmin
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const currentStatus = existingProg?.status || 'IN_PROGRESS';
    const newWatchPercentage = typeof watch_percentage === 'number' ? Math.max(existingProg?.watch_percentage || 0, watch_percentage) : existingProg?.watch_percentage || 0;
    const newPosition = typeof last_position_seconds === 'number' ? last_position_seconds : existingProg?.last_position_seconds || 0;

    const { data: updated, error } = await supabaseAdmin
      .from('lesson_progress')
      .upsert({
        user_id: userId,
        course_id: course.id,
        lesson_id: lessonId,
        status: currentStatus === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        watch_percentage: newWatchPercentage,
        last_position_seconds: newPosition,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' })
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, progress: updated });
  } catch (err: any) {
    console.error('[updateLessonProgress] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * POST /api/learn/:courseSlugOrId/lessons/:lessonId/complete
 */
export async function completeLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { courseSlugOrId, lessonId } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseSlugOrId);
    let courseQuery = supabaseAdmin.from('courses').select('id');
    if (isUuid) {
      courseQuery = courseQuery.eq('id', courseSlugOrId);
    } else {
      courseQuery = courseQuery.eq('slug', courseSlugOrId);
    }

    const { data: course } = await courseQuery.maybeSingle();

    if (!course) {
      res.status(404).json({ success: false, error: 'Course not found.' });
      return;
    }

    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', course.id)
      .maybeSingle();

    const { data: updatedLessonProgress, error: progErr } = await supabaseAdmin
      .from('lesson_progress')
      .upsert({
        user_id: userId,
        course_id: course.id,
        lesson_id: lessonId,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        watch_percentage: 100,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' })
      .select('*')
      .single();

    if (progErr) {
      res.status(500).json({ success: false, error: progErr.message });
      return;
    }

    // Trigger authoritative completion re-evaluation
    const completionSummary = await evaluateCourseCompletion(userId, course.id);

    if (enrollment && enrollment.id) {
      await supabaseAdmin
        .from('enrollments')
        .update({
          last_accessed_lesson_id: lessonId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id);
    }

    res.json({
      success: true,
      message: 'Lesson marked as completed!',
      lessonProgress: updatedLessonProgress,
      stats: {
        totalRequiredLessons: completionSummary.requirements.lessonsRequired,
        completedRequiredLessons: completionSummary.requirements.lessonsCompleted,
        courseProgressPercentage: completionSummary.progressPercentage,
      },
      completion: completionSummary,
      enrollment,
    });
  } catch (err: any) {
    console.error('[completeLesson] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * GET /api/learn/:courseSlugOrId/final-assessment
 * Retrieve Final Assessment (SECURE: DOES NOT EXPOSE ANSWER KEYS OR IS_CORRECT)
 */
export async function getFinalAssessmentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const userRole = req.profile?.role || 'STUDENT';
  const isAdmin = userRole === 'ADMIN';
  const { courseSlugOrId } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseSlugOrId);
  let courseQuery = supabaseAdmin.from('courses').select('id');
  if (isUuid) courseQuery = courseQuery.eq('id', courseSlugOrId);
  else courseQuery = courseQuery.eq('slug', courseSlugOrId);

  const { data: course } = await courseQuery.maybeSingle();
  if (!course) {
    res.status(404).json({ success: false, error: 'Course not found.' });
    return;
  }

  const result = await getStudentFinalAssessment(userId, course.id, isAdmin);
  res.json({ success: true, ...result });
}

/**
 * POST /api/learn/:courseSlugOrId/final-assessment/submit
 * Submit and Grade Final Assessment Server-Side
 */
export async function submitFinalAssessmentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { courseSlugOrId } = req.params;
  const { assessment_id, answers } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  if (!assessment_id || !Array.isArray(answers)) {
    res.status(400).json({ success: false, error: 'Assessment ID and answers array are required.' });
    return;
  }

  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseSlugOrId);
  let courseQuery = supabaseAdmin.from('courses').select('id');
  if (isUuid) courseQuery = courseQuery.eq('id', courseSlugOrId);
  else courseQuery = courseQuery.eq('slug', courseSlugOrId);

  const { data: course } = await courseQuery.maybeSingle();
  if (!course) {
    res.status(404).json({ success: false, error: 'Course not found.' });
    return;
  }

  const eligibility = await checkFinalAssessmentEligibility(userId, course.id);
  if (!eligibility.isUnlocked) {
    res.status(403).json({
      success: false,
      error: `Final assessment is locked. ${eligibility.reason}`
    });
    return;
  }

  const result = await submitStudentFinalAssessment(userId, course.id, assessment_id, answers);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  // Trigger authoritative completion re-evaluation
  const completionSummary = await evaluateCourseCompletion(userId, course.id);

  res.json({
    ...result,
    completion: completionSummary
  });
}

/**
 * GET /api/learn/:courseSlugOrId/completion-summary
 * Return authoritative 3-way course completion summary
 */
export async function getCourseCompletionSummaryHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { courseSlugOrId } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized.' });
    return;
  }

  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(courseSlugOrId);
  let courseQuery = supabaseAdmin.from('courses').select('id');
  if (isUuid) courseQuery = courseQuery.eq('id', courseSlugOrId);
  else courseQuery = courseQuery.eq('slug', courseSlugOrId);

  const { data: course } = await courseQuery.maybeSingle();
  if (!course) {
    res.status(404).json({ success: false, error: 'Course not found.' });
    return;
  }

  const summary = await evaluateCourseCompletion(userId, course.id);
  res.json({ success: true, completion: summary });
}
