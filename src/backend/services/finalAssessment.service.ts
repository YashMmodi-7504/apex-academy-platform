import { v5 as uuidv5, v4 as uuidv4 } from 'uuid';
import { hasPassedModuleAssessment } from './moduleAssessment.service.ts';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export interface FinalAssessmentOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  display_order: number;
}

export interface FinalAssessmentQuestion {
  id: string;
  module_number: number;
  question_text: string;
  question_type: 'SINGLE_CHOICE';
  marks: number;
  explanation: string;
  display_order: number;
  options: FinalAssessmentOption[];
}

export interface FinalAssessment {
  id: string;
  course_id: string;
  title: string;
  description: string;
  assessment_type: 'FINAL_ASSESSMENT';
  passing_percentage: number;
  duration_minutes: number;
  questions: FinalAssessmentQuestion[];
}

export interface FinalAttemptRecord {
  id: string;
  assessment_id: string;
  user_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  answers: { question_id: string; option_id: string; is_correct: boolean }[];
}

// In-memory store for Final Assessment attempts
const finalAttemptsStore: FinalAttemptRecord[] = [];

const courseId = 'f0200000-0000-0000-0000-000000000002';
const finalAssessmentId = uuidv5(`final_assessment_${courseId}`, NAMESPACE);

// 30 High-Quality Final Exam Questions covering all 11 Modules
// Module distribution: M1: 2, M2: 3, M3: 3, M4: 3, M5: 3, M6: 3, M7: 3, M8: 3, M9: 2, M10: 3, M11: 2 (Total = 30)
const rawFinalQuestions: { module: number; text: string; explanation: string; options: { text: string; is_correct: boolean }[] }[] = [
  // Module 1 (2 questions)
  {
    module: 1,
    text: 'What is the primary role of statistics in modern data analytics?',
    explanation: 'Statistics provides formal methods to separate signal from noise and draw evidence-based conclusions.',
    options: [
      { text: 'To extract meaningful signals and quantify uncertainty in observed data.', is_correct: true },
      { text: 'To convert all numerical values into qualitative text categories.', is_correct: false },
      { text: 'To guarantee 100% forecasting precision regardless of data quality.', is_correct: false },
      { text: 'To replace the need for data engineering pipelines.', is_correct: false }
    ]
  },
  {
    module: 1,
    text: 'An analyst measures customer session duration in exact seconds (e.g., 184.25s). What type of variable is this?',
    explanation: 'Continuous quantitative data can take any real numeric value along a continuous scale.',
    options: [
      { text: 'Continuous Quantitative (Ratio Scale)', is_correct: true },
      { text: 'Discrete Categorical (Nominal Scale)', is_correct: false },
      { text: 'Qualitative Ordinal', is_correct: false },
      { text: 'Dichotomous Binary', is_correct: false }
    ]
  },

  // Module 2 (3 questions)
  {
    module: 2,
    text: 'A dataset contains developer salaries: $70k, $75k, $80k, $85k, $5,000,000. Which central tendency measure best represents typical salary?',
    explanation: 'The median is robust against extreme outliers, whereas the mean is heavily skewed upward.',
    options: [
      { text: 'Median', is_correct: true },
      { text: 'Mean', is_correct: false },
      { text: 'Variance', is_correct: false },
      { text: 'Standard Deviation', is_correct: false }
    ]
  },
  {
    module: 2,
    text: 'In a perfectly symmetrical, unskewed normal distribution, what is the mathematical relationship between Mean, Median, and Mode?',
    explanation: 'For symmetrical bell-shaped distributions, the mean, median, and mode are all equal at the central peak.',
    options: [
      { text: 'Mean = Median = Mode', is_correct: true },
      { text: 'Mean > Median > Mode', is_correct: false },
      { text: 'Mean < Median < Mode', is_correct: false },
      { text: 'Mode is always double the median', is_correct: false }
    ]
  },
  {
    module: 2,
    text: 'When calculating a student final grade where homework counts for 40% and final exam counts for 60%, which calculation is required?',
    explanation: 'A weighted mean applies specific weight multipliers reflecting relative importance to each component.',
    options: [
      { text: 'Weighted Mean', is_correct: true },
      { text: 'Simple Arithmetic Mean', is_correct: false },
      { text: 'Mode', is_correct: false },
      { text: 'Geometric Mean', is_correct: false }
    ]
  },

  // Module 3 (3 questions)
  {
    module: 3,
    text: 'A dataset has values: 10, 12, 12, 14, 100. Which measure of dispersion is most resistant to the extreme value 100?',
    explanation: 'Interquartile Range (IQR = Q3 - Q1) evaluates the spread of the middle 50% of values and ignores extreme tails.',
    options: [
      { text: 'Interquartile Range (IQR)', is_correct: true },
      { text: 'Range', is_correct: false },
      { text: 'Variance', is_correct: false },
      { text: 'Standard Deviation', is_correct: false }
    ]
  },
  {
    module: 3,
    text: 'Why is standard deviation more widely interpreted than variance in operational reporting?',
    explanation: 'Variance is in squared units, whereas standard deviation takes the square root, returning to original data units.',
    options: [
      { text: 'Standard deviation is expressed in the same original measurement units as the dataset.', is_correct: true },
      { text: 'Standard deviation is always a negative value.', is_correct: false },
      { text: 'Variance cannot be calculated for sample datasets.', is_correct: false },
      { text: 'Standard deviation automatically removes all missing rows.', is_correct: false }
    ]
  },
  {
    module: 3,
    text: 'What proportion of data falls strictly within the Interquartile Range (IQR)?',
    explanation: 'IQR measures the central 50% span bounded between the 25th percentile (Q1) and 75th percentile (Q3).',
    options: [
      { text: 'The middle 50% of the dataset', is_correct: true },
      { text: 'The top 25% of the dataset', is_correct: false },
      { text: 'The bottom 75% of the dataset', is_correct: false },
      { text: '100% of all data points', is_correct: false }
    ]
  },

  // Module 4 (3 questions)
  {
    module: 4,
    text: 'A distribution has a long tail stretching to the right toward high income values. How is this distribution categorized?',
    explanation: 'Positive (right) skewness indicates a tail stretching toward higher positive values.',
    options: [
      { text: 'Positively skewed (right-skewed)', is_correct: true },
      { text: 'Negatively skewed (left-skewed)', is_correct: false },
      { text: 'Symmetrical normal distribution', is_correct: false },
      { text: 'Bimodal uniform distribution', is_correct: false }
    ]
  },
  {
    module: 4,
    text: 'Under the standard 1.5 x IQR rule, a high outlier is defined as any value exceeding:',
    explanation: 'High outliers are values greater than Q3 + 1.5 * IQR.',
    options: [
      { text: 'Q3 + 1.5 x IQR', is_correct: true },
      { text: 'Q1 - 1.5 x IQR', is_correct: false },
      { text: 'Mean + 1.0 x Standard Deviation', is_correct: false },
      { text: 'Median x 2', is_correct: false }
    ]
  },
  {
    module: 4,
    text: 'According to the Empirical Rule (68-95-99.7), approximately what percentage of data in a normal distribution falls within ±2 standard deviations of the mean?',
    explanation: 'The empirical rule dictates ~68% within ±1σ, ~95% within ±2σ, and ~99.7% within ±3σ.',
    options: [
      { text: '95%', is_correct: true },
      { text: '68%', is_correct: false },
      { text: '99.7%', is_correct: false },
      { text: '50%', is_correct: false }
    ]
  },

  // Module 5 (3 questions)
  {
    module: 5,
    text: 'What is the valid numerical range for any probability score P(E)?',
    explanation: 'Probabilities are bounded proportions between 0.0 (impossible) and 1.0 (certain).',
    options: [
      { text: '0.0 to 1.0 (0% to 100%)', is_correct: true },
      { text: '-1.0 to +1.0', is_correct: false },
      { text: '0 to infinity', is_correct: false },
      { text: 'Any positive integer', is_correct: false }
    ]
  },
  {
    module: 5,
    text: 'If Event A and Event B are mutually exclusive, what is P(A and B)?',
    explanation: 'Mutually exclusive events cannot occur at the same time; their joint probability is 0.',
    options: [
      { text: '0', is_correct: true },
      { text: '0.5', is_correct: false },
      { text: 'P(A) + P(B)', is_correct: false },
      { text: '1.0', is_correct: false }
    ]
  },
  {
    module: 5,
    text: 'What does the conditional probability notation P(A | B) represent?',
    explanation: 'P(A | B) reads "probability of A given B", meaning the likelihood of A occurring assuming B has occurred.',
    options: [
      { text: 'The probability of Event A occurring given that Event B is true.', is_correct: true },
      { text: 'The probability of Event A or Event B occurring.', is_correct: false },
      { text: 'The probability of neither event occurring.', is_correct: false },
      { text: 'The product of P(A) multiplied by P(B).', is_correct: false }
    ]
  },

  // Module 6 (3 questions)
  {
    module: 6,
    text: 'What are the mean (μ) and standard deviation (σ) of the Standard Normal Distribution (Z-distribution)?',
    explanation: 'The Z-distribution is standardized with mean = 0 and standard deviation = 1.',
    options: [
      { text: 'Mean = 0, Standard Deviation = 1', is_correct: true },
      { text: 'Mean = 100, Standard Deviation = 15', is_correct: false },
      { text: 'Mean = 1, Standard Deviation = 0', is_correct: false },
      { text: 'Mean = 50, Standard Deviation = 10', is_correct: false }
    ]
  },
  {
    module: 6,
    text: 'A data point has a Z-score of +2.5. What does this mean?',
    explanation: 'A Z-score measures the number of standard deviations an observation lies above (+) or below (-) the mean.',
    options: [
      { text: 'The value is 2.5 standard deviations above the population mean.', is_correct: true },
      { text: 'The value is 2.5% higher than the average.', is_correct: false },
      { text: 'The observation is 2.5 units below the median.', is_correct: false },
      { text: 'The observation has a 2.5% probability of occurrence.', is_correct: false }
    ]
  },
  {
    module: 6,
    text: 'Which probability distribution models the count of arrival events in a fixed time window (e.g., website hits per hour)?',
    explanation: 'The Poisson distribution models independent event counts occurring in a fixed time or space interval.',
    options: [
      { text: 'Poisson Distribution', is_correct: true },
      { text: 'Binomial Distribution', is_correct: false },
      { text: 'Uniform Distribution', is_correct: false },
      { text: 'Normal Distribution', is_correct: false }
    ]
  },

  // Module 7 (3 questions)
  {
    module: 7,
    text: 'Why is Simple Random Sampling considered essential in survey research?',
    explanation: 'Random sampling gives every population element an equal selection chance, preventing sampling bias.',
    options: [
      { text: 'Every population element has an equal selection probability, minimizing sampling bias.', is_correct: true },
      { text: 'It ensures the sample size equals the population size.', is_correct: false },
      { text: 'It eliminates the need for calculating standard error.', is_correct: false },
      { text: 'It guarantees zero measurement error.', is_correct: false }
    ]
  },
  {
    module: 7,
    text: 'What happens to the Standard Error (SE = σ / √n) as the sample size n increases?',
    explanation: 'As sample size n increases, denominator √n grows, reducing Standard Error and improving precision.',
    options: [
      { text: 'Standard Error decreases, increasing estimate precision.', is_correct: true },
      { text: 'Standard Error increases proportionally.', is_correct: false },
      { text: 'Standard Error remains completely unchanged.', is_correct: false },
      { text: 'Standard Error becomes equal to sample mean.', is_correct: false }
    ]
  },
  {
    module: 7,
    text: 'According to the Central Limit Theorem, what shape does the sampling distribution of the sample mean take for large samples (n ≥ 30), regardless of the original population distribution?',
    explanation: 'CLT guarantees that the sampling distribution of sample means approaches a Normal distribution as n grows.',
    options: [
      { text: 'Normal Distribution (bell-shaped)', is_correct: true },
      { text: 'Uniform Distribution', is_correct: false },
      { text: 'Bimodal Distribution', is_correct: false },
      { text: 'Exponential Distribution', is_correct: false }
    ]
  },

  // Module 8 (3 questions)
  {
    module: 8,
    text: 'In an A/B test comparing a new checkout button against the baseline button, what does the Null Hypothesis (H0) state?',
    explanation: 'H0 asserts the default baseline assumption of no significant difference or effect.',
    options: [
      { text: 'There is no significant difference in conversion rates between the new and baseline buttons.', is_correct: true },
      { text: 'The new button significantly improves conversion rates.', is_correct: false },
      { text: 'The baseline button has a 0% conversion rate.', is_correct: false },
      { text: 'Both buttons will fail completely.', is_correct: false }
    ]
  },
  {
    module: 8,
    text: 'If significance level α = 0.05 and an A/B test yields a p-value = 0.015, what action should the analyst take?',
    explanation: 'When p-value ≤ α, the observed data is statistically significant under H0, so we reject H0.',
    options: [
      { text: 'Reject the Null Hypothesis (statistically significant result).', is_correct: true },
      { text: 'Fail to reject the Null Hypothesis.', is_correct: false },
      { text: 'Accept the Null Hypothesis as proven true.', is_correct: false },
      { text: 'Discard all experiment data.', is_correct: false }
    ]
  },
  {
    module: 8,
    text: 'An analyst rejects a true Null Hypothesis (false alarm). What error has been committed?',
    explanation: 'A Type I error occurs when a true null hypothesis is incorrectly rejected.',
    options: [
      { text: 'Type I Error (False Positive)', is_correct: true },
      { text: 'Type II Error (False Negative)', is_correct: false },
      { text: 'Measurement Calibration Error', is_correct: false },
      { text: 'Standard Error Inflation', is_correct: false }
    ]
  },

  // Module 9 (2 questions)
  {
    module: 9,
    text: 'What is the valid numerical range of Pearson correlation coefficient (r)?',
    explanation: 'Pearson r ranges from -1.0 (perfect negative linear relationship) to +1.0 (perfect positive linear relationship).',
    options: [
      { text: '-1.0 to +1.0', is_correct: true },
      { text: '0.0 to +1.0', is_correct: false },
      { text: '-100 to +100', is_correct: false },
      { text: '0 to infinity', is_correct: false }
    ]
  },
  {
    module: 9,
    text: 'Ice cream sales and drowning incidents both increase in summer. What explains this correlation?',
    explanation: 'A third confounding variable (warm summer weather) drives both independent trends.',
    options: [
      { text: 'A third confounding variable (summer temperature) influences both variables.', is_correct: true },
      { text: 'Ice cream consumption directly causes drowning.', is_correct: false },
      { text: 'Drowning causes people to buy ice cream.', is_correct: false },
      { text: 'Correlation always proves direct causation.', is_correct: false }
    ]
  },

  // Module 10 (3 questions)
  {
    module: 10,
    text: 'In simple linear regression Y = β0 + β1*X, what does the slope coefficient β1 represent?',
    explanation: 'The slope β1 represents the expected change in dependent variable Y per 1-unit change in predictor X.',
    options: [
      { text: 'The expected change in outcome Y for a 1-unit increase in predictor X.', is_correct: true },
      { text: 'The value of Y when X is equal to 0.', is_correct: false },
      { text: 'The correlation coefficient squared.', is_correct: false },
      { text: 'The total sample size of the dataset.', is_correct: false }
    ]
  },
  {
    module: 10,
    text: 'In a regression equation Y = 12 + 3.5X, what is the predicted value of Y when X = 6?',
    explanation: 'Y = 12 + 3.5*(6) = 12 + 21 = 33.',
    options: [
      { text: '33', is_correct: true },
      { text: '21', is_correct: false },
      { text: '12', is_correct: false },
      { text: '54', is_correct: false }
    ]
  },
  {
    module: 10,
    text: 'What is a residual in linear regression analysis?',
    explanation: 'A residual is the difference between actual observed outcome Y and predicted value Ŷ (Residual = Y - Ŷ).',
    options: [
      { text: 'The difference between actual observed value Y and predicted value Ŷ.', is_correct: true },
      { text: 'The slope divided by the intercept.', is_correct: false },
      { text: 'The ratio of sample size to population size.', is_correct: false },
      { text: 'The highest value in the feature column.', is_correct: false }
    ]
  },

  // Module 11 (2 questions)
  {
    module: 11,
    text: 'Before performing formal hypothesis testing or regression modeling on business data, what is the mandatory first step?',
    explanation: 'Exploratory Data Analysis (EDA) and data auditing ensure dataset cleanliness, valid data types, and anomaly detection.',
    options: [
      { text: 'Conduct Exploratory Data Analysis (EDA), audit quality, and check missing values.', is_correct: true },
      { text: 'Immediately present unverified conclusions to executives.', is_correct: false },
      { text: 'Delete all non-zero numbers in the dataset.', is_correct: false },
      { text: 'Train a 100-layer deep neural network.', is_correct: false }
    ]
  },
  {
    module: 11,
    text: 'When communicating statistical test findings to executive business stakeholders, what is best practice?',
    explanation: 'Analysts must translate quantitative metrics into clear, actionable business recommendations.',
    options: [
      { text: 'Translate statistical metrics into actionable business insights, financial impacts, and strategic choices.', is_correct: true },
      { text: 'Display raw unformatted SQL queries and technical p-value formulas without context.', is_correct: false },
      { text: 'Rely solely on subjective personal opinion while ignoring test data.', is_correct: false },
      { text: 'Avoid explaining any conclusions or findings.', is_correct: false }
    ]
  }
];

// Build Final Assessment object
export const finalAssessmentObj: FinalAssessment = {
  id: finalAssessmentId,
  course_id: courseId,
  title: 'Statistics for Data & Analytics: Final Comprehensive Assessment',
  description: 'Formal 30-question final comprehensive examination covering all 11 modules. Passing requirement is 70% (21/30).',
  assessment_type: 'FINAL_ASSESSMENT',
  passing_percentage: 70,
  duration_minutes: 60,
  questions: rawFinalQuestions.map((q, idx) => {
    const qId = uuidv5(`final_q_${idx + 1}`, NAMESPACE);
    let optOrder = 1;
    const options: FinalAssessmentOption[] = q.options.map((opt) => ({
      id: uuidv5(`final_opt_${qId}_${optOrder}`, NAMESPACE),
      option_text: opt.text,
      is_correct: opt.is_correct,
      display_order: optOrder++
    }));

    return {
      id: qId,
      module_number: q.module,
      question_text: q.text,
      question_type: 'SINGLE_CHOICE',
      marks: 1,
      explanation: q.explanation,
      display_order: idx + 1,
      options
    };
  })
};

/**
 * Check if student satisfies Final Assessment Eligibility:
 * 1. 55 required lessons completed
  * 2. 11 module assessments passed
 */
export async function checkFinalAssessmentEligibility(userId: string, targetCourseId: string) {
  // 1. Required Lessons Completion Count
  const { data: modules } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('course_id', targetCourseId);

  const moduleIds = (modules || []).map(m => m.id);

  const { data: reqLessons } = await supabaseAdmin
    .from('lessons')
    .select('id')
    .in('module_id', moduleIds.length > 0 ? moduleIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('is_required', true);

  const totalLessons = reqLessons?.length || 0;
  const reqLessonIds = (reqLessons || []).map(l => l.id);

  const { data: completedProg } = await supabaseAdmin
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('course_id', targetCourseId)
    .eq('status', 'COMPLETED')
    .in('lesson_id', reqLessonIds.length > 0 ? reqLessonIds : ['00000000-0000-0000-0000-000000000000']);

  const completedLessonsCount = completedProg?.length || 0;
  const allLessonsDone = totalLessons > 0 ? completedLessonsCount >= totalLessons : true;

  // 2. Required Module Assessments Passed Count
  const { data: moduleAssessments } = await supabaseAdmin
    .from('assessments')
    .select('id')
    .eq('course_id', targetCourseId)
    .eq('assessment_type', 'MODULE_QUIZ');

  const totalModules = moduleAssessments?.length || 0;
  const modAssIds = (moduleAssessments || []).map(a => a.id);

  const { data: passedModAttempts } = await supabaseAdmin
    .from('assessment_attempts')
    .select('assessment_id')
    .eq('user_id', userId)
    .eq('passed', true)
    .in('assessment_id', modAssIds.length > 0 ? modAssIds : ['00000000-0000-0000-0000-000000000000']);

  const passedModAssIds = new Set((passedModAttempts || []).map(a => a.assessment_id));
  const passedModulesCount = passedModAssIds.size;
  const allModulesPassed = totalModules > 0 ? passedModulesCount >= totalModules : true;

  const isUnlocked = allLessonsDone && allModulesPassed;

  let reason = '';
  if (!allLessonsDone) {
    reason = `Complete all ${totalLessons} course lessons first (${completedLessonsCount}/${totalLessons} completed).`;
  } else if (!allModulesPassed) {
    reason = `Pass all ${totalModules} module assessments first (${passedModulesCount}/${totalModules} passed).`;
  }

  return {
    isUnlocked,
    reason,
    stats: {
      completedLessonsCount,
      totalLessons,
      passedModulesCount,
      totalModules
    }
  };
}

/**
 * Get student view of Final Assessment (STRIPS IS_CORRECT & EXPLANATIONS)
 */
export async function getStudentFinalAssessment(userId: string, targetCourseId: string, isAdmin: boolean) {
  const eligibility = await checkFinalAssessmentEligibility(userId, targetCourseId);
  const isUnlocked = eligibility.isUnlocked || isAdmin;

  // Load assessment metadata from Supabase
  const { data: assessment } = await supabaseAdmin
    .from('assessments')
    .select('id, title, description, passing_percentage, duration_minutes')
    .eq('course_id', targetCourseId)
    .eq('assessment_type', 'FINAL_ASSESSMENT')
    .maybeSingle();

  const assessmentId = assessment?.id || finalAssessmentId;

  // Fetch attempt history from Supabase
  const { data: attemptsDb } = await supabaseAdmin
    .from('assessment_attempts')
    .select('attempt_number, score, max_score, percentage, passed, submitted_at')
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId)
    .order('attempt_number');

  const userAttempts = attemptsDb || [];
  const latestAttempt = userAttempts.length > 0 ? userAttempts[userAttempts.length - 1] : null;
  const isPassed = userAttempts.some(a => a.passed);

  if (!isUnlocked) {
    return {
      locked: true,
      reason: eligibility.reason,
      stats: eligibility.stats,
      assessment: {
        id: assessmentId,
        title: assessment?.title || finalAssessmentObj.title,
        passing_percentage: assessment?.passing_percentage || finalAssessmentObj.passing_percentage
      },
      userAttempts,
      isPassed
    };
  }

  // Load questions from Supabase — no is_correct exposed
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('id, question_text, question_type, marks, display_order')
    .eq('assessment_id', assessmentId)
    .order('display_order');

  const questionIds = (questions || []).map(q => q.id);

  const { data: options } = await supabaseAdmin
    .from('question_options')
    .select('id, question_id, option_text, display_order')
    // is_correct intentionally NOT selected
    .in('question_id', questionIds.length > 0 ? questionIds : ['00000000-0000-0000-0000-000000000000'])
    .order('display_order');

  const optionsByQ: Record<string, { id: string; option_text: string; display_order: number }[]> = {};
  for (const opt of (options || [])) {
    if (!optionsByQ[opt.question_id]) optionsByQ[opt.question_id] = [];
    optionsByQ[opt.question_id].push({ id: opt.id, option_text: opt.option_text, display_order: opt.display_order });
  }

  return {
    locked: false,
    stats: eligibility.stats,
    assessment: {
      id: assessmentId,
      title: assessment?.title || finalAssessmentObj.title,
      description: assessment?.description || finalAssessmentObj.description,
      passing_percentage: assessment?.passing_percentage || finalAssessmentObj.passing_percentage,
      duration_minutes: assessment?.duration_minutes || finalAssessmentObj.duration_minutes,
      questions: (questions || []).map(q => ({
        id: q.id,
        question_text: q.question_text,
        display_order: q.display_order,
        options: optionsByQ[q.id] || []
      }))
    },
    userAttempts,
    latestAttempt,
    isPassed
  };
}

/**
 * Submit and Grade Final Assessment Server-Side
 * Loads correct answers from Supabase. Persists attempt + answers to Supabase.
 */
export async function submitStudentFinalAssessment(
  userId: string,
  targetCourseId: string,
  assessmentId: string,
  answers: { question_id: string; option_id: string }[]
) {
  const eligibility = await checkFinalAssessmentEligibility(userId, targetCourseId);
  if (!eligibility.isUnlocked) {
    return {
      success: false,
      error: `Final assessment is locked. ${eligibility.reason}`
    };
  }

  // Load assessment from Supabase
  const { data: assessment } = await supabaseAdmin
    .from('assessments')
    .select('id, passing_percentage')
    .eq('id', assessmentId)
    .eq('assessment_type', 'FINAL_ASSESSMENT')
    .maybeSingle();

  if (!assessment) return { success: false, error: 'Final assessment not found.' };

  // Load all questions
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('id, question_text, explanation')
    .eq('assessment_id', assessmentId);

  const totalQuestions = (questions || []).length;

  // Load correct answers from Supabase (server-side only)
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

  // Grade
  let correctCount = 0;
  const gradedAnswers: { question_id: string; option_id: string; is_correct: boolean }[] = [];

  for (const q of (questions || [])) {
    const studentAns: any = answers.find(a => (a as any).question_id === q.id || (a as any).questionId === q.id);
    const selectedOptId = studentAns?.option_id || studentAns?.selected_option_id || studentAns?.selectedOptionId || '';
    const isCorrect = correctMap[q.id] === selectedOptId;
    if (isCorrect) correctCount++;
    gradedAnswers.push({ question_id: q.id, option_id: selectedOptId, is_correct: isCorrect });
  }

  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = percentage >= assessment.passing_percentage;

  // Count existing attempts from Supabase
  const { count: existingCount } = await supabaseAdmin
    .from('assessment_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId);

  const nextAttemptNumber = (existingCount || 0) + 1;
  const attemptId = uuidv4();
  const now = new Date().toISOString();

  // Persist attempt to Supabase
  const { error: attemptErr } = await supabaseAdmin
    .from('assessment_attempts')
    .insert({
      id: attemptId,
      assessment_id: assessmentId,
      user_id: userId,
      attempt_number: nextAttemptNumber,
      started_at: new Date(Date.now() - 600000).toISOString(),
      submitted_at: now,
      score: correctCount,
      max_score: totalQuestions,
      percentage,
      passed
    });

  if (attemptErr) return { success: false, error: `Failed to save attempt: ${attemptErr.message}` };

  // Persist student answers to Supabase
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

  // Build feedback (correct answers revealed after submission)
  const { data: allOptions } = await supabaseAdmin
    .from('question_options')
    .select('id, question_id, is_correct')
    .in('question_id', questionIds);

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
