import { supabaseAdmin } from './supabaseAdmin.ts';

export interface SeedResult {
  success: boolean;
  coursesCreated: number;
  modulesCreated: number;
  programsCreated: number;
  mappingsCreated: number;
  error?: string;
}

// Fixed deterministic UUIDs for Batch 1 courses
export const BATCH_1_COURSES = [
  {
    id: 'f0100000-0000-0000-0000-000000000001',
    code: 'F01',
    title: 'Data & Database Fundamentals',
    slug: 'data-database-fundamentals',
    difficulty: 'BEGINNER',
    purpose: 'Introduce data concepts, relational databases, data quality, data modeling and modern data systems.',
    modules: [
      'Understanding Data',
      'How Organizations Use Data',
      'Database Fundamentals',
      'Relational Database Concepts',
      'Understanding Data Models',
      'Data Quality Fundamentals',
      'Data Storage & Modern Data Systems',
      'Applied Data Fundamentals'
    ]
  },
  {
    id: 'f0200000-0000-0000-0000-000000000002',
    code: 'F02',
    title: 'Statistics for Data & Analytics',
    slug: 'statistics-data-analytics',
    difficulty: 'BEGINNER',
    purpose: 'Build the statistical foundations required for analytics, data science, machine learning and market research.',
    modules: [
      'Statistical Thinking & Data',
      'Measures of Central Tendency',
      'Measures of Dispersion',
      'Data Distributions',
      'Probability Fundamentals',
      'Probability Distributions',
      'Sampling & Central Limit Theorem',
      'Hypothesis Testing',
      'Correlation',
      'Regression Foundations',
      'Applied Statistics Case Study'
    ]
  },
  {
    id: 'f0300000-0000-0000-0000-000000000003',
    code: 'F03',
    title: 'Python Programming Fundamentals',
    slug: 'python-programming-fundamentals',
    difficulty: 'BEGINNER',
    purpose: 'Teach reusable Python programming foundations for data, AI and engineering roles.',
    modules: [
      'Introduction to Python',
      'Variables & Data Types',
      'Operators',
      'Strings',
      'Python Collections',
      'Conditional Statements',
      'Loops',
      'Functions',
      'Working with Files',
      'Exception Handling',
      'Modules & Packages',
      'Python Practical'
    ]
  },
  {
    id: 'f0400000-0000-0000-0000-000000000004',
    code: 'F04',
    title: 'SQL & Relational Databases',
    slug: 'sql-relational-databases',
    difficulty: 'BEGINNER',
    purpose: 'Teach relational database querying and practical SQL foundations.',
    modules: [
      'Relational Database Refresher',
      'Getting Started with SQL',
      'Filtering & Sorting',
      'Working with NULL & Functions',
      'Aggregate Functions',
      'GROUP BY & HAVING',
      'SQL Joins',
      'Subqueries',
      'Common Table Expressions',
      'Window Functions',
      'Data Modification Fundamentals',
      'SQL Business Case Study'
    ]
  },
  {
    id: 'f0500000-0000-0000-0000-000000000005',
    code: 'F05',
    title: 'Git & Development Fundamentals',
    slug: 'git-development-fundamentals',
    difficulty: 'BEGINNER',
    purpose: 'Teach version control and collaborative development fundamentals for technical roles.',
    modules: [
      'Why Version Control?',
      'Git Fundamentals',
      'Basic Git Commands',
      'Branching',
      'Remote Repositories',
      'Collaboration Workflow',
      'Merge Conflicts',
      'Good Git Practices',
      'Practical Project'
    ]
  }
];

// Mappings for the 11 Career Paths to Batch 1 Course Slugs
export const PATH_MAPPINGS: Record<string, string[]> = {
  'data-scientist': ['statistics-data-analytics', 'python-programming-fundamentals', 'sql-relational-databases'],
  'ai-engineer': ['python-programming-fundamentals', 'git-development-fundamentals'],
  'ai-backend-engineer': ['python-programming-fundamentals', 'sql-relational-databases', 'git-development-fundamentals'],
  'data-engineer': ['data-database-fundamentals', 'python-programming-fundamentals', 'sql-relational-databases', 'git-development-fundamentals'],
  'etl-developer': ['data-database-fundamentals', 'sql-relational-databases', 'git-development-fundamentals'],
  'data-analyst': ['data-database-fundamentals', 'statistics-data-analytics', 'sql-relational-databases'],
  'bi-developer': ['data-database-fundamentals', 'sql-relational-databases', 'git-development-fundamentals'],
  'bi-analyst': ['data-database-fundamentals', 'statistics-data-analytics', 'sql-relational-databases'],
  'technical-analyst': ['data-database-fundamentals', 'sql-relational-databases'],
  'machine-learning-engineer': ['statistics-data-analytics', 'python-programming-fundamentals', 'git-development-fundamentals'],
  'market-analytics-research': ['statistics-data-analytics']
};

export async function seedCurriculumBatch1(): Promise<SeedResult> {
  try {
    console.log('[SeedCurriculum] Starting Phase 6A Batch 1 Curriculum Seeding...');

    // 1. Fetch categories (Source of truth for 11 Career Domains)
    const { data: categories, error: catErr } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (catErr || !categories || categories.length === 0) {
      throw new Error(`Failed to fetch categories source of truth: ${catErr?.message || 'No categories found'}`);
    }

    console.log(`[SeedCurriculum] Found ${categories.length} categories.`);

    // 2. Ensure Career Learning Path (programs) exists for each category
    const programIdBySlug: Record<string, string> = {};
    let programsCreated = 0;

    for (const cat of categories) {
      const programSlug = `${cat.slug}-path`;
      
      // Check existing program for this category
      const { data: existingProg } = await supabaseAdmin
        .from('programs')
        .select('id, slug')
        .or(`slug.eq.${programSlug},category_id.eq.${cat.id}`)
        .maybeSingle();

      if (existingProg) {
        programIdBySlug[cat.slug] = existingProg.id;
      } else {
        const { data: newProg, error: pErr } = await supabaseAdmin
          .from('programs')
          .insert([{
            category_id: cat.id,
            title: `${cat.name} Career Path`,
            slug: programSlug,
            short_description: cat.description,
            description: cat.description,
            program_type: 'PROFESSIONAL_CERTIFICATE',
            is_published: true
          }])
          .select('id')
          .single();

        if (pErr) {
          console.error(`[SeedCurriculum] Error creating program for category ${cat.slug}:`, pErr.message);
          throw pErr;
        }

        programIdBySlug[cat.slug] = newProg.id;
        programsCreated++;
      }
    }

    // 3. Upsert Batch 1 Foundation Courses
    const courseIdBySlug: Record<string, string> = {};
    let coursesCreated = 0;

    for (const courseDef of BATCH_1_COURSES) {
      const { data: existingCourse } = await supabaseAdmin
        .from('courses')
        .select('id, slug')
        .eq('slug', courseDef.slug)
        .maybeSingle();

      let courseId: string;

      if (existingCourse) {
        courseId = existingCourse.id;
        // Update course details
        await supabaseAdmin
          .from('courses')
          .update({
            title: courseDef.title,
            difficulty: courseDef.difficulty,
            short_description: courseDef.purpose,
            description: courseDef.purpose,
            is_published: false // Batch 1 courses remain DRAFT
          })
          .eq('id', courseId);
      } else {
        const { data: newCourse, error: cErr } = await supabaseAdmin
          .from('courses')
          .insert([{
            id: courseDef.id,
            title: courseDef.title,
            slug: courseDef.slug,
            short_description: courseDef.purpose,
            description: courseDef.purpose,
            difficulty: courseDef.difficulty,
            duration_minutes: 0,
            language: 'English',
            certificate_enabled: true,
            is_free: false,
            is_featured: false,
            is_published: false // DRAFT status as required
          }])
          .select('id')
          .single();

        if (cErr) {
          console.error(`[SeedCurriculum] Error creating course ${courseDef.slug}:`, cErr.message);
          throw cErr;
        }

        courseId = newCourse.id;
        coursesCreated++;
      }

      courseIdBySlug[courseDef.slug] = courseId;
    }

    // 4. Upsert Modules for each course (52 total modules)
    let modulesCreated = 0;

    for (const courseDef of BATCH_1_COURSES) {
      const courseId = courseIdBySlug[courseDef.slug];

      for (let i = 0; i < courseDef.modules.length; i++) {
        const moduleTitle = courseDef.modules[i];
        const displayOrder = i + 1;

        const { data: existingModule } = await supabaseAdmin
          .from('modules')
          .select('id')
          .eq('course_id', courseId)
          .eq('display_order', displayOrder)
          .maybeSingle();

        if (existingModule) {
          await supabaseAdmin
            .from('modules')
            .update({
              title: moduleTitle,
              display_order: displayOrder
            })
            .eq('id', existingModule.id);
        } else {
          const { error: mErr } = await supabaseAdmin
            .from('modules')
            .insert([{
              course_id: courseId,
              title: moduleTitle,
              display_order: displayOrder,
              is_required: true
            }]);

          if (mErr) {
            console.error(`[SeedCurriculum] Error inserting module "${moduleTitle}":`, mErr.message);
            throw mErr;
          }

          modulesCreated++;
        }
      }
    }

    // 5. Upsert Program Courses Mappings (program_courses)
    let mappingsCreated = 0;

    for (const [catSlug, courseSlugs] of Object.entries(PATH_MAPPINGS)) {
      const programId = programIdBySlug[catSlug];
      if (!programId) continue;

      for (let order = 0; order < courseSlugs.length; order++) {
        const cSlug = courseSlugs[order];
        const courseId = courseIdBySlug[cSlug];
        if (!courseId) continue;

        const displayOrder = order + 1;

        const { data: existingMapping } = await supabaseAdmin
          .from('program_courses')
          .select('program_id, course_id')
          .eq('program_id', programId)
          .eq('course_id', courseId)
          .maybeSingle();

        if (existingMapping) {
          await supabaseAdmin
            .from('program_courses')
            .update({ display_order: displayOrder })
            .eq('program_id', programId)
            .eq('course_id', courseId);
        } else {
          const { error: pcErr } = await supabaseAdmin
            .from('program_courses')
            .insert([{
              program_id: programId,
              course_id: courseId,
              display_order: displayOrder,
              is_required: true
            }]);

          if (pcErr) {
            console.error(`[SeedCurriculum] Error linking program ${programId} and course ${courseId}:`, pcErr.message);
            throw pcErr;
          }

          mappingsCreated++;
        }
      }
    }

    console.log('[SeedCurriculum] Phase 6A Curriculum Seeding Completed Successfully.');

    return {
      success: true,
      coursesCreated,
      modulesCreated,
      programsCreated,
      mappingsCreated
    };
  } catch (err: any) {
    console.error('[SeedCurriculum] Fatal error during seed execution:', err.message);
    return {
      success: false,
      coursesCreated: 0,
      modulesCreated: 0,
      programsCreated: 0,
      mappingsCreated: 0,
      error: err.message
    };
  }
}
