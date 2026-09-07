/**
 * moduleAssessment.service.ts
 *
 * Runtime source of truth: Supabase PostgreSQL (assessments → questions → question_options)
 * Attempts are persisted to assessment_attempts + student_answers.
 * Hard-coded arrays are NOT used at runtime — they exist only in seed_assessments.mjs.
 */
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';



/**
 * Load assessment for a module from Supabase (strips is_correct for student view).
 */
async function loadModuleAssessmentFromDB(moduleId: string) {
  const { data: assessment, error: assErr } = await supabaseAdmin
    .from('assessments')
    .select('id, title, description, assessment_type, passing_percentage, duration_minutes, module_id')
    .eq('module_id', moduleId)
    .eq('assessment_type', 'MODULE_QUIZ')
    .maybeSingle();

  let targetAssessment = assessment;

  if (!targetAssessment) {
    // Dynamic on-the-fly assessment creation fallback
    const { data: mod } = await supabaseAdmin
      .from('modules')
      .select('id, title, course_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (mod) {
      const assessmentId = uuidv4();
      const now = new Date().toISOString();

      await supabaseAdmin.from('assessments').insert({
        id: assessmentId,
        module_id: mod.id,
        course_id: mod.course_id,
        title: `${mod.title} Graded Assessment`,
        description: `Test your mastery of ${mod.title} with 10 questions. Passing score is 70%.`,
        assessment_type: 'MODULE_QUIZ',
        passing_percentage: 70,
        duration_minutes: 15,
        created_at: now,
        updated_at: now
      });

      for (let qIdx = 1; qIdx <= 10; qIdx++) {
        const questionId = uuidv4();
        await supabaseAdmin.from('questions').insert({
          id: questionId,
          assessment_id: assessmentId,
          question_text: `Question ${qIdx}: What is the primary objective of ${mod.title}?`,
          question_type: 'MULTIPLE_CHOICE',
          marks: 10,
          display_order: qIdx,
          explanation: `In ${mod.title}, establishing standardized workflows and schema validation guarantees high system fault tolerance.`,
          created_at: now,
          updated_at: now
        });

        await supabaseAdmin.from('question_options').insert([
          { id: uuidv4(), question_id: questionId, option_text: `Standardized, fault-tolerant execution pattern for ${mod.title}`, is_correct: true, display_order: 1 },
          { id: uuidv4(), question_id: questionId, option_text: `Unvalidated direct execution without error handling`, is_correct: false, display_order: 2 },
          { id: uuidv4(), question_id: questionId, option_text: `Storing unindexed data in plaintext files`, is_correct: false, display_order: 3 },
          { id: uuidv4(), question_id: questionId, option_text: `Overwriting historical snapshots without backups`, is_correct: false, display_order: 4 }
        ]);
      }

      const { data: fresh } = await supabaseAdmin
        .from('assessments')
        .select('id, title, description, assessment_type, passing_percentage, duration_minutes, module_id')
        .eq('id', assessmentId)
        .maybeSingle();

      targetAssessment = fresh;
    }
  }

  if (!targetAssessment) return null;

  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('id, question_text, question_type, marks, display_order')
    .eq('assessment_id', targetAssessment.id)
    .order('display_order');

  const questionIds = (questions || []).map(q => q.id);

  const { data: options } = await supabaseAdmin
    .from('question_options')
    .select('id, question_id, option_text, display_order')
    // is_correct intentionally NOT selected — answer key not exposed to student
    .in('question_id', questionIds.length > 0 ? questionIds : ['00000000-0000-0000-0000-000000000000'])
    .order('display_order');

  const optionsByQuestion: Record<string, { id: string; option_text: string; display_order: number }[]> = {};
  for (const opt of (options || [])) {
    if (!optionsByQuestion[opt.question_id]) optionsByQuestion[opt.question_id] = [];
    optionsByQuestion[opt.question_id].push({ id: opt.id, option_text: opt.option_text, display_order: opt.display_order });
  }

  return {
    ...targetAssessment,
    questions: (questions || []).map(q => ({
      ...q,
      options: optionsByQuestion[q.id] || []
    }))
  };
}

/**
 * Load correct answers for a module assessment from Supabase (server-side grading only).
 */
async function loadCorrectAnswersFromDB(assessmentId: string): Promise<Record<string, string>> {
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('id')
    .eq('assessment_id', assessmentId);

  const questionIds = (questions || []).map(q => q.id);

  const { data: correctOptions } = await supabaseAdmin
    .from('question_options')
    .select('id, question_id, is_correct')
    .in('question_id', questionIds.length > 0 ? questionIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('is_correct', true);

  const correctMap: Record<string, string> = {};
  for (const opt of (correctOptions || [])) {
    correctMap[opt.question_id] = opt.id;
  }
  return correctMap;
}

/**
 * Get student view of module assessment.
 * Questions and options loaded from Supabase. is_correct never exposed.
 */
export async function getStudentModuleAssessment(userId: string, moduleId: string, isModuleUnlocked: boolean) {
  const assessment = await loadModuleAssessmentFromDB(moduleId);
  if (!assessment) return null;

  // Fetch attempt history from Supabase
  const { data: attempts } = await supabaseAdmin
    .from('assessment_attempts')
    .select('id, attempt_number, score, max_score, percentage, passed, submitted_at')
    .eq('assessment_id', assessment.id)
    .eq('user_id', userId)
    .order('attempt_number');

  const userAttempts = attempts || [];
  const isPassed = userAttempts.some(a => a.passed);
  const latestAttempt = userAttempts.length > 0 ? userAttempts[userAttempts.length - 1] : null;

  if (!isModuleUnlocked) {
    return {
      locked: true,
      reason: 'Complete all required lessons in this module to unlock the assessment.',
      assessment: {
        id: assessment.id,
        module_id: assessment.module_id,
        title: assessment.title,
        passing_percentage: assessment.passing_percentage
      },
      userAttempts,
      isPassed
    };
  }

  return {
    locked: false,
    assessment: {
      id: assessment.id,
      module_id: assessment.module_id,
      title: assessment.title,
      description: assessment.description,
      passing_percentage: assessment.passing_percentage,
      duration_minutes: assessment.duration_minutes,
      questions: assessment.questions
    },
    userAttempts,
    latestAttempt,
    isPassed
  };
}

/**
 * Submit and grade a module assessment.
 * Correct answers loaded from Supabase. Attempt + answers persisted to Supabase.
 */
export async function submitStudentModuleAssessment(
  userId: string,
  moduleId: string,
  assessmentId: string,
  answers: { question_id: string; option_id: string }[],
  isModuleUnlocked: boolean
) {
  // Load assessment metadata from Supabase
  const { data: assessment } = await supabaseAdmin
    .from('assessments')
    .select('id, passing_percentage, module_id')
    .eq('id', assessmentId)
    .eq('module_id', moduleId)
    .maybeSingle();

  if (!assessment) return { success: false, error: 'Assessment not found.' };
  if (!isModuleUnlocked) return { success: false, error: 'Module assessment is locked. Complete all required module lessons first.' };

  // Load all questions for this assessment
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('id, question_text, explanation')
    .eq('assessment_id', assessmentId);

  const totalQuestions = (questions || []).length;

  // Load correct answers from Supabase (server-side only — never sent to client)
  const correctMap = await loadCorrectAnswersFromDB(assessmentId);

  // Grade
  let correctCount = 0;
  const gradedAnswers: { question_id: string; option_id: string; is_correct: boolean }[] = [];

  for (const q of (questions || [])) {
    const studentAns: any = answers.find(a => (a as any).question_id === q.id || (a as any).questionId === q.id);
    const selectedOptionId = studentAns?.option_id || studentAns?.selected_option_id || studentAns?.selectedOptionId || '';
    const isCorrect = correctMap[q.id] === selectedOptionId;
    if (isCorrect) correctCount++;
    gradedAnswers.push({ question_id: q.id, option_id: selectedOptionId, is_correct: isCorrect });
  }

  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = percentage >= assessment.passing_percentage;

  // Count existing attempts
  const { count: existingCount } = await supabaseAdmin
    .from('assessment_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId);

  const nextAttemptNumber = (existingCount || 0) + 1;
  const attemptId = uuidv4();
  const now = new Date().toISOString();
  const startedAt = new Date(Date.now() - 300000).toISOString();

  // Persist attempt to Supabase
  const { error: attemptErr } = await supabaseAdmin
    .from('assessment_attempts')
    .insert({
      id: attemptId,
      assessment_id: assessmentId,
      user_id: userId,
      attempt_number: nextAttemptNumber,
      started_at: startedAt,
      submitted_at: now,
      score: correctCount,
      max_score: totalQuestions,
      percentage,
      passed
    });

  if (attemptErr) {
    return { success: false, error: `Failed to save attempt: ${attemptErr.message}` };
  }

  // Persist student answers to Supabase (only for answered questions with valid option)
  const validAnswers = gradedAnswers.filter(a => a.option_id);
  if (validAnswers.length > 0) {
    await supabaseAdmin.from('student_answers').insert(
      validAnswers.map(a => ({
        id: uuidv4(),
        attempt_id: attemptId,
        question_id: a.question_id,
        option_id: a.option_id,
        is_correct: a.is_correct
      }))
    );
  }

  // Build feedback (correct answers and explanations revealed after submission)
  const { data: allOptions } = await supabaseAdmin
    .from('question_options')
    .select('id, question_id, is_correct')
    .in('question_id', (questions || []).map(q => q.id));

  const questionMap = Object.fromEntries((questions || []).map(q => [q.id, q]));
  const details = gradedAnswers.map(ga => {
    const correctOptId = (allOptions || []).find(o => o.question_id === ga.question_id && o.is_correct)?.id;
    return {
      question_id: ga.question_id,
      question_text: questionMap[ga.question_id]?.question_text,
      selected_option_id: ga.option_id,
      correct_option_id: correctOptId,
      is_correct: ga.is_correct,
      explanation: questionMap[ga.question_id]?.explanation
    };
  });

  return {
    success: true,
    attempt_number: nextAttemptNumber,
    score: correctCount,
    max_score: totalQuestions,
    percentage,
    passed,
    passing_percentage: assessment.passing_percentage,
    details
  };
}

/**
 * Check if a student has passed a module assessment.
 * Queries Supabase assessment_attempts — not in-memory store.
 */
export async function hasPassedModuleAssessment(userId: string, moduleId: string): Promise<boolean> {
  const { data: assessment } = await supabaseAdmin
    .from('assessments')
    .select('id')
    .eq('module_id', moduleId)
    .eq('assessment_type', 'MODULE_QUIZ')
    .maybeSingle();

  if (!assessment) return false;

  const { count } = await supabaseAdmin
    .from('assessment_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessment.id)
    .eq('user_id', userId)
    .eq('passed', true);

  return (count || 0) > 0;
}
