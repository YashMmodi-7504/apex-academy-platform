import { supabaseAdmin } from '../database/supabaseAdmin.ts';
import { issueCertificateForUser } from './certificate.service.ts';

export interface CompletionSummary {
  courseId: string;
  enrollmentStatus: string;
  progressPercentage: number;
  requirements: {
    lessonsCompleted: number;
    lessonsRequired: number;
    moduleAssessmentsPassed: number;
    moduleAssessmentsRequired: number;
    finalAssessmentPassed: boolean;
  };
  courseCompleted: boolean;
  certificateEligible: boolean;
  completed_at: string | null;
}

/**
 * Authoritative Backend Course Completion Evaluation Engine
 * Single Source of Truth for Apex Academy LMS Course Completion
 */
export async function evaluateCourseCompletion(
  userId: string,
  courseId: string,
  options?: { skipAutoCert?: boolean }
): Promise<CompletionSummary> {
  // 1. Required Lessons Completion Count (Dynamic DB Query)
  const { data: modules } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('course_id', courseId);

  const moduleIds = (modules || []).map(m => m.id);

  const { data: reqLessons } = await supabaseAdmin
    .from('lessons')
    .select('id')
    .in('module_id', moduleIds.length > 0 ? moduleIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('is_required', true);

  const totalReqLessons = reqLessons?.length || 0;
  const reqLessonIds = (reqLessons || []).map(l => l.id);

  const { data: completedProg } = await supabaseAdmin
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'COMPLETED')
    .in('lesson_id', reqLessonIds.length > 0 ? reqLessonIds : ['00000000-0000-0000-0000-000000000000']);

  const completedLessonsCount = completedProg?.length || 0;
  const allLessonsCompleted = totalReqLessons > 0 ? completedLessonsCount >= totalReqLessons : true;

  // 2. Module Assessments Passed Count (Dynamic DB Query)
  const { data: moduleAssessments } = await supabaseAdmin
    .from('assessments')
    .select('id')
    .eq('course_id', courseId)
    .eq('assessment_type', 'MODULE_QUIZ');

  const totalModulesRequired = moduleAssessments?.length || 0;
  const modAssIds = (moduleAssessments || []).map(a => a.id);

  const { data: passedModAttempts } = await supabaseAdmin
    .from('assessment_attempts')
    .select('assessment_id')
    .eq('user_id', userId)
    .eq('passed', true)
    .in('assessment_id', modAssIds.length > 0 ? modAssIds : ['00000000-0000-0000-0000-000000000000']);

  const passedModAssIds = new Set((passedModAttempts || []).map(a => a.assessment_id));
  const passedModulesCount = passedModAssIds.size;
  const allModulesPassed = totalModulesRequired > 0 ? passedModulesCount >= totalModulesRequired : true;

  // 3. Final Assessment Passed (Dynamic DB Query)
  const { data: finalAss } = await supabaseAdmin
    .from('assessments')
    .select('id')
    .eq('course_id', courseId)
    .eq('assessment_type', 'FINAL_ASSESSMENT')
    .maybeSingle();

  let finalPassed = false;
  const finalAssessmentExists = !!finalAss;

  if (finalAss) {
    const { data: finalPassedAttempt } = await supabaseAdmin
      .from('assessment_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('assessment_id', finalAss.id)
      .eq('passed', true)
      .limit(1)
      .maybeSingle();

    finalPassed = !!finalPassedAttempt;
  } else {
    // If no final assessment exists for this course, finalPassed is true
    finalPassed = true;
  }

  // Authoritative 3-Way Completion Condition
  const courseCompleted = allLessonsCompleted && allModulesPassed && finalPassed;
  const certificateEligible = courseCompleted;

  // Fetch Enrollment Record
  const { data: enrollment } = await supabaseAdmin
    .from('enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  let newStatus = enrollment?.status || 'ENROLLED';
  let finalCompletedAt = enrollment?.completed_at || null;
  let progressPercentage = 0;

  if (courseCompleted) {
    newStatus = 'COMPLETED';
    progressPercentage = 100;
    if (!finalCompletedAt) {
      finalCompletedAt = new Date().toISOString();
    }
  } else {
    // Calculate honest intermediate progress percentage (capped at 99% until ALL requirements pass!)
    const totalUnits = (totalReqLessons > 0 ? 75 : 0) + (totalModulesRequired > 0 ? 20 : 0) + (finalAssessmentExists ? 5 : 0);
    let calcPct = 0;
    if (totalUnits > 0) {
      const lessonContribution = totalReqLessons > 0 ? (completedLessonsCount / totalReqLessons) * 75 : 0;
      const modContribution = totalModulesRequired > 0 ? (passedModulesCount / totalModulesRequired) * 20 : 0;
      const finalContribution = finalPassed ? 5 : 0;
      calcPct = Math.round(lessonContribution + modContribution + finalContribution);
    }
    progressPercentage = Math.min(99, calcPct);
    newStatus = (completedLessonsCount > 0 || passedModulesCount > 0) ? 'IN_PROGRESS' : 'ENROLLED';
    finalCompletedAt = null;
  }

  // Idempotently update enrollment in Database if status, percentage, or completed_at changed
  if (enrollment && enrollment.id) {
    const isStateChanged = enrollment.status !== newStatus || 
                           enrollment.progress_percentage !== progressPercentage ||
                           (!enrollment.completed_at && finalCompletedAt);

    if (isStateChanged) {
      const { data: updated } = await supabaseAdmin
        .from('enrollments')
        .update({
          status: newStatus,
          progress_percentage: progressPercentage,
          completed_at: finalCompletedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollment.id)
        .select('*')
        .single();

      if (updated) {
        finalCompletedAt = updated.completed_at;
      }
    }
  }

  // Automatic non-blocking certificate issuance attempt upon 100% completion
  if (courseCompleted && !options?.skipAutoCert) {
    try {
      await issueCertificateForUser(userId, courseId);
    } catch (certErr) {
      console.error('Automatic certificate issuance background attempt:', certErr);
    }
  }

  return {
    courseId,
    enrollmentStatus: newStatus,
    progressPercentage,
    requirements: {
      lessonsCompleted: completedLessonsCount,
      lessonsRequired: totalReqLessons,
      moduleAssessmentsPassed: passedModulesCount,
      moduleAssessmentsRequired: totalModulesRequired,
      finalAssessmentPassed: finalPassed
    },
    courseCompleted,
    certificateEligible,
    completed_at: finalCompletedAt
  };
}
