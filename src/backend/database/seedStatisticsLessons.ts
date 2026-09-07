import { supabaseAdmin } from './supabaseAdmin.ts';

interface LessonBlueprint {
  title: string;
  type: 'ARTICLE' | 'PRACTICAL';
}

const MODULE_LESSONS_MAP: Record<string, LessonBlueprint[]> = {
  'Statistical Thinking & Data': [
    { title: 'Introduction to Statistics', type: 'ARTICLE' },
    { title: 'Why Statistics Matters in Data & Analytics', type: 'ARTICLE' },
    { title: 'Descriptive vs Inferential Statistics', type: 'ARTICLE' },
    { title: 'Population vs Sample', type: 'ARTICLE' },
    { title: 'Numerical vs Categorical Data', type: 'ARTICLE' },
    { title: 'Discrete vs Continuous Data', type: 'ARTICLE' },
    { title: 'Levels of Measurement', type: 'ARTICLE' },
    { title: 'Practical: Identifying Data Types', type: 'PRACTICAL' }
  ],
  'Measures of Central Tendency': [
    { title: 'Introduction to Central Tendency', type: 'ARTICLE' },
    { title: 'Mean', type: 'ARTICLE' },
    { title: 'Median', type: 'ARTICLE' },
    { title: 'Mode', type: 'ARTICLE' },
    { title: 'Weighted Mean', type: 'ARTICLE' },
    { title: 'Effect of Outliers', type: 'ARTICLE' },
    { title: 'Choosing Mean, Median or Mode', type: 'ARTICLE' },
    { title: 'Practical: Central Tendency Analysis', type: 'PRACTICAL' }
  ],
  'Measures of Dispersion': [
    { title: 'Why Measure Dispersion?', type: 'ARTICLE' },
    { title: 'Range', type: 'ARTICLE' },
    { title: 'Variance', type: 'ARTICLE' },
    { title: 'Standard Deviation', type: 'ARTICLE' },
    { title: 'Interquartile Range', type: 'ARTICLE' },
    { title: 'Comparing Dataset Variability', type: 'ARTICLE' },
    { title: 'Why Dispersion Matters in Machine Learning', type: 'ARTICLE' },
    { title: 'Practical: Measuring Data Spread', type: 'PRACTICAL' }
  ],
  'Data Distributions': [
    { title: 'Understanding Data Distribution', type: 'ARTICLE' },
    { title: 'Frequency Distribution', type: 'ARTICLE' },
    { title: 'Histograms', type: 'ARTICLE' },
    { title: 'Normal Distribution', type: 'ARTICLE' },
    { title: 'Understanding the Bell Curve', type: 'ARTICLE' },
    { title: 'Skewness', type: 'ARTICLE' },
    { title: 'Positive and Negative Skew', type: 'ARTICLE' },
    { title: 'Identifying Outliers', type: 'ARTICLE' },
    { title: 'Practical: Distribution Analysis', type: 'PRACTICAL' }
  ],
  'Probability Fundamentals': [
    { title: 'Introduction to Probability', type: 'ARTICLE' },
    { title: 'Experiments, Outcomes and Events', type: 'ARTICLE' },
    { title: 'Basic Probability Rules', type: 'ARTICLE' },
    { title: 'Independent Events', type: 'ARTICLE' },
    { title: 'Dependent Events', type: 'ARTICLE' },
    { title: 'Conditional Probability', type: 'ARTICLE' },
    { title: 'Practical Probability Problems', type: 'PRACTICAL' }
  ],
  'Probability Distributions': [
    { title: 'Introduction to Probability Distributions', type: 'ARTICLE' },
    { title: 'Random Variables', type: 'ARTICLE' },
    { title: 'Discrete vs Continuous Random Variables', type: 'ARTICLE' },
    { title: 'Normal Distribution', type: 'ARTICLE' },
    { title: 'Standard Normal Distribution', type: 'ARTICLE' },
    { title: 'Understanding Z-Scores', type: 'ARTICLE' },
    { title: 'Binomial Distribution', type: 'ARTICLE' },
    { title: 'Practical: Working with Probability Distributions', type: 'PRACTICAL' }
  ],
  'Sampling & Central Limit Theorem': [
    { title: 'Why Sampling Is Required', type: 'ARTICLE' },
    { title: 'Population vs Sample Revisited', type: 'ARTICLE' },
    { title: 'Random Sampling', type: 'ARTICLE' },
    { title: 'Sampling Bias', type: 'ARTICLE' },
    { title: 'Sampling Error', type: 'ARTICLE' },
    { title: 'Sampling Distributions', type: 'ARTICLE' },
    { title: 'Central Limit Theorem', type: 'ARTICLE' },
    { title: 'Why CLT Matters in Analytics', type: 'ARTICLE' },
    { title: 'Practical: Sampling Simulation', type: 'PRACTICAL' }
  ],
  'Hypothesis Testing': [
    { title: 'Introduction to Hypothesis Testing', type: 'ARTICLE' },
    { title: 'Null and Alternative Hypotheses', type: 'ARTICLE' },
    { title: 'Significance Level', type: 'ARTICLE' },
    { title: 'Understanding P-Values', type: 'ARTICLE' },
    { title: 'Type I and Type II Errors', type: 'ARTICLE' },
    { title: 'T-Test Fundamentals', type: 'ARTICLE' },
    { title: 'Chi-Square Test Fundamentals', type: 'ARTICLE' },
    { title: 'Interpreting Test Results', type: 'ARTICLE' },
    { title: 'Practical: Hypothesis Testing Scenario', type: 'PRACTICAL' }
  ],
  'Correlation': [
    { title: 'Understanding Relationships Between Variables', type: 'ARTICLE' },
    { title: 'Covariance Intuition', type: 'ARTICLE' },
    { title: 'Introduction to Correlation', type: 'ARTICLE' },
    { title: 'Positive, Negative and No Correlation', type: 'ARTICLE' },
    { title: 'Pearson Correlation', type: 'ARTICLE' },
    { title: 'Understanding the Correlation Coefficient', type: 'ARTICLE' },
    { title: 'Correlation vs Causation', type: 'ARTICLE' },
    { title: 'Practical: Correlation Analysis', type: 'PRACTICAL' }
  ],
  'Regression Foundations': [
    { title: 'Introduction to Regression', type: 'ARTICLE' },
    { title: 'Independent and Dependent Variables', type: 'ARTICLE' },
    { title: 'Simple Linear Regression', type: 'ARTICLE' },
    { title: 'Understanding the Regression Line', type: 'ARTICLE' },
    { title: 'Slope and Intercept', type: 'ARTICLE' },
    { title: 'Making Predictions', type: 'ARTICLE' },
    { title: 'Correlation vs Regression', type: 'ARTICLE' },
    { title: 'Practical: Simple Regression Analysis', type: 'PRACTICAL' }
  ],
  'Applied Statistics Case Study': [
    { title: 'Understanding the Business Problem', type: 'ARTICLE' },
    { title: 'Understanding the Dataset', type: 'ARTICLE' },
    { title: 'Descriptive Statistical Analysis', type: 'ARTICLE' },
    { title: 'Distribution Analysis', type: 'ARTICLE' },
    { title: 'Sampling Analysis', type: 'ARTICLE' },
    { title: 'Hypothesis Testing', type: 'ARTICLE' },
    { title: 'Correlation Analysis', type: 'ARTICLE' },
    { title: 'Interpreting Results', type: 'ARTICLE' },
    { title: 'Building Business Insights', type: 'ARTICLE' },
    { title: 'Case Study Submission', type: 'PRACTICAL' }
  ]
};

export async function seedStatisticsLessons() {
  console.log('--- STARTING PHASE 6C: STATISTICS LESSON SEED ---');

  // 1. Fetch reference course
  const { data: course, error: cErr } = await supabaseAdmin
    .from('courses')
    .select('id, title, slug, is_published')
    .eq('slug', 'statistics-data-analytics')
    .single();

  if (cErr || !course) {
    throw new Error(`Failed to find reference course 'statistics-data-analytics': ${cErr?.message}`);
  }

  console.log(`Reference course found: "${course.title}" (${course.id}), is_published: ${course.is_published}`);

  // 2. Fetch existing 11 modules
  const { data: modules, error: mErr } = await supabaseAdmin
    .from('modules')
    .select('id, title, display_order')
    .eq('course_id', course.id)
    .order('display_order', { ascending: true });

  if (mErr || !modules || modules.length === 0) {
    throw new Error(`Failed to fetch modules for course ${course.id}: ${mErr?.message}`);
  }

  console.log(`Verified ${modules.length} modules for course.`);

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalPractical = 0;
  let totalArticle = 0;

  for (const moduleItem of modules) {
    const blueprints = MODULE_LESSONS_MAP[moduleItem.title];
    if (!blueprints) {
      console.warn(`No lesson blueprint defined for module title "${moduleItem.title}"`);
      continue;
    }

    console.log(`Processing Module ${moduleItem.display_order}: "${moduleItem.title}" (${blueprints.length} lessons)`);

    // Fetch existing lessons in this module for idempotency
    const { data: existingLessons } = await supabaseAdmin
      .from('lessons')
      .select('id, title, display_order, lesson_type')
      .eq('module_id', moduleItem.id);

    const existingMap = new Map<string, any>();
    (existingLessons || []).forEach(l => existingMap.set(l.title.toLowerCase().trim(), l));

    for (let i = 0; i < blueprints.length; i++) {
      const blueprint = blueprints[i];
      const displayOrder = i + 1;
      const key = blueprint.title.toLowerCase().trim();

      if (blueprint.type === 'PRACTICAL') totalPractical++;
      else totalArticle++;

      if (existingMap.has(key)) {
        // Update existing lesson to ensure display order and type are correct
        const existing = existingMap.get(key);
        const { error: uErr } = await supabaseAdmin
          .from('lessons')
          .update({
            display_order: displayOrder,
            lesson_type: blueprint.type,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (uErr) {
          console.error(`Error updating lesson "${blueprint.title}":`, uErr.message);
        } else {
          totalUpdated++;
        }
      } else {
        // Generate a deterministic UUID based on module order and lesson index
        const moduleIndexHex = moduleItem.display_order.toString(16).padStart(2, '0');
        const lessonIndexHex = (i + 1).toString(16).padStart(2, '0');
        const deterministicId = `f0206c${moduleIndexHex}-${lessonIndexHex}00-0000-0000-000000000000`;

        const { error: iErr } = await supabaseAdmin
          .from('lessons')
          .insert({
            id: deterministicId,
            module_id: moduleItem.id,
            title: blueprint.title,
            display_order: displayOrder,
            lesson_type: blueprint.type,
            content: null,
            video_url: null,
            duration_seconds: 600,
            is_preview: false,
            is_required: true
          });

        if (iErr) {
          // Fallback if ID collision occurs
          const { error: fallbackErr } = await supabaseAdmin
            .from('lessons')
            .insert({
              module_id: moduleItem.id,
              title: blueprint.title,
              display_order: displayOrder,
              lesson_type: blueprint.type,
              content: null,
              video_url: null,
              duration_seconds: 600,
              is_preview: false,
              is_required: true
            });
          if (fallbackErr) {
            console.error(`Error inserting lesson "${blueprint.title}":`, fallbackErr.message);
          } else {
            totalInserted++;
          }
        } else {
          totalInserted++;
        }
      }
    }
  }

  // 3. Exact Count Verification
  const { data: allLessons } = await supabaseAdmin
    .from('lessons')
    .select('id, module_id, lesson_type')
    .in('module_id', modules.map(m => m.id));

  const count = allLessons?.length || 0;
  console.log(`\n=== SEED SUMMARY ===`);
  console.log(`Total Lessons in DB for Statistics Course: ${count}`);
  console.log(`Total Inserted: ${totalInserted}`);
  console.log(`Total Updated: ${totalUpdated}`);
  console.log(`Practical Lessons: ${totalPractical}`);
  console.log(`Article Lessons: ${totalArticle}`);

  if (count !== 92) {
    throw new Error(`COUNT VERIFICATION FAILED: Expected 92 lessons, found ${count}`);
  }

  console.log('Phase 6C Lesson Seed Completed Successfully!\n');
}

if (process.argv[1]?.endsWith('seedStatisticsLessons.ts')) {
  seedStatisticsLessons().catch(err => {
    console.error('Seed execution failed:', err);
    process.exit(1);
  });
}
