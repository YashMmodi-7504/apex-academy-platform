import { Request, Response } from 'express';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';

/**
 * GET /api/courses
 * Fetch all published courses with optional filters (category, difficulty, free, featured, search)
 */
export async function getCourses(req: Request, res: Response): Promise<void> {
  try {
    const { category, difficulty, free, featured, search } = req.query;

    let query = supabaseAdmin
      .from('courses')
      .select(`
        id,
        title,
        slug,
        short_description,
        description,
        thumbnail_url,
        preview_video_url,
        difficulty,
        duration_minutes,
        language,
        certificate_enabled,
        is_free,
        is_featured,
        is_published,
        created_at,
        category:categories (
          id,
          name,
          slug,
          icon
        )
      `)
      .eq('is_published', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (difficulty && typeof difficulty === 'string') {
      query = query.eq('difficulty', difficulty.toUpperCase());
    }

    if (free === 'true') {
      query = query.eq('is_free', true);
    } else if (free === 'false') {
      query = query.eq('is_free', false);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const cleanSearch = search.trim();
      query = query.or(`title.ilike.%${cleanSearch}%,short_description.ilike.%${cleanSearch}%`);
    }

    const { data: courses, error } = await query;

    if (error) {
      console.error('[getCourses] Database error:', error.message);
      res.status(500).json({ success: false, error: 'Failed to fetch course catalog.' });
      return;
    }

    let filteredCourses = courses || [];

    // Filter by category slug or category ID if supplied
    if (category && typeof category === 'string' && category !== 'all') {
      filteredCourses = filteredCourses.filter((course: any) => {
        if (!course.category) return false;
        return course.category.slug === category || course.category.id === category;
      });
    }

    res.json({
      success: true,
      count: filteredCourses.length,
      courses: filteredCourses,
    });
  } catch (err: any) {
    console.error('[getCourses] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error while fetching courses.' });
  }
}

/**
 * GET /api/courses/categories
 * Fetch active course categories
 */
export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[getCategories] Database error:', error.message);
      res.status(500).json({ success: false, error: 'Failed to fetch categories.' });
      return;
    }

    res.json({
      success: true,
      categories: data || [],
    });
  } catch (err: any) {
    console.error('[getCategories] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * GET /api/courses/:slug
 * Fetch course detail by slug, including modules, lessons, instructors, and user enrollment status if authenticated
 */
export async function getCourseBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;

  if (!slug) {
    res.status(400).json({ success: false, error: 'Course slug parameter is required.' });
    return;
  }

  try {
    // 1. Fetch course details
    const { data: course, error: courseErr } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        category:categories (
          id,
          name,
          slug,
          description,
          icon
        )
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (courseErr) {
      console.error('[getCourseBySlug] Error fetching course:', courseErr.message);
      res.status(500).json({ success: false, error: 'Failed to retrieve course details.' });
      return;
    }

    if (!course) {
      res.status(404).json({ success: false, error: 'Course not found.' });
      return;
    }

    // 2. Fetch modules & lessons ordered by display_order
    const { data: modules, error: modulesErr } = await supabaseAdmin
      .from('modules')
      .select(`
        id,
        title,
        description,
        display_order,
        is_required,
        lessons (
          id,
          title,
          description,
          lesson_type,
          duration_seconds,
          display_order,
          is_preview,
          is_required
        )
      `)
      .eq('course_id', course.id)
      .order('display_order', { ascending: true });

    if (modulesErr) {
      console.error('[getCourseBySlug] Error fetching modules:', modulesErr.message);
    }

    // Sort inner lessons by display_order
    const sortedModules = (modules || []).map((m: any) => ({
      ...m,
      lessons: (m.lessons || []).sort((a: any, b: any) => a.display_order - b.display_order),
    }));

    // 3. Fetch instructors via course_instructors join
    const { data: courseInstructors, error: instErr } = await supabaseAdmin
      .from('course_instructors')
      .select(`
        instructor:instructors (
          id,
          name,
          title,
          bio,
          avatar_url,
          linkedin_url,
          experience
        )
      `)
      .eq('course_id', course.id);

    if (instErr) {
      console.error('[getCourseBySlug] Error fetching instructors:', instErr.message);
    }

    const instructors = (courseInstructors || [])
      .map((ci: any) => ci.instructor)
      .filter(Boolean);

    // 4. Check user enrollment if authorization header is present
    let isEnrolled = false;
    let enrollment = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          const { data: enrollData } = await supabaseAdmin
            .from('enrollments')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', course.id)
            .maybeSingle();

          if (enrollData) {
            isEnrolled = true;
            enrollment = enrollData;
          }
        }
      } catch (e) {
        // Auth check token issue - ignore gracefully
      }
    }

    res.json({
      success: true,
      course: {
        ...course,
        modules: sortedModules,
        instructors,
        isEnrolled,
        enrollment,
      },
    });
  } catch (err: any) {
    console.error('[getCourseBySlug] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * GET /api/courses/:slug/curriculum
 * Fetch public curriculum (modules & lesson meta) for a course
 */
export async function getCourseCurriculum(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;

  try {
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id, title, slug')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (!course) {
      res.status(404).json({ success: false, error: 'Course not found.' });
      return;
    }

    const { data: modules, error } = await supabaseAdmin
      .from('modules')
      .select(`
        id,
        title,
        description,
        display_order,
        lessons (
          id,
          title,
          description,
          lesson_type,
          duration_seconds,
          display_order,
          is_preview
        )
      `)
      .eq('course_id', course.id)
      .order('display_order', { ascending: true });

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch curriculum.' });
      return;
    }

    const sortedModules = (modules || []).map((m: any) => ({
      ...m,
      lessons: (m.lessons || []).sort((a: any, b: any) => a.display_order - b.display_order),
    }));

    res.json({
      success: true,
      courseTitle: course.title,
      modules: sortedModules,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * GET /api/domains/:slug/learning-path
 * Fetch Career Learning Path and ordered courses for a specific domain
 */
export async function getDomainLearningPath(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;

  if (!slug) {
    res.status(400).json({ success: false, error: 'Domain slug parameter is required.' });
    return;
  }

  try {
    // 1. Fetch domain (category)
    const { data: domain, error: domainErr } = await supabaseAdmin
      .from('categories')
      .select('id, name, slug, description, icon')
      .eq('slug', slug)
      .maybeSingle();

    if (domainErr) {
      console.error('[getDomainLearningPath] Category error:', domainErr.message);
      res.status(500).json({ success: false, error: 'Failed to retrieve domain.' });
      return;
    }

    if (!domain) {
      res.status(404).json({ success: false, error: 'Career Domain not found.' });
      return;
    }

    // 2. Fetch associated program (Career Learning Path)
    const { data: program } = await supabaseAdmin
      .from('programs')
      .select('id, title, slug, program_type, short_description, description, is_published')
      .eq('category_id', domain.id)
      .maybeSingle();

    let courses: any[] = [];

    if (program) {
      // 3. Fetch program_courses ordered by display_order
      const { data: pcList } = await supabaseAdmin
        .from('program_courses')
        .select(`
          display_order,
          is_required,
          course:courses (
            id,
            title,
            slug,
            short_description,
            difficulty,
            duration_minutes,
            is_published,
            created_at
          )
        `)
        .eq('program_id', program.id)
        .order('display_order', { ascending: true });

      if (pcList && pcList.length > 0) {
        // Fetch module count for each course
        const courseIds = pcList.map((item: any) => item.course?.id).filter(Boolean);
        
        const { data: allModules } = await supabaseAdmin
          .from('modules')
          .select('id, course_id, title, display_order')
          .in('course_id', courseIds)
          .order('display_order', { ascending: true });

        const moduleCountByCourse: Record<string, number> = {};
        const modulesByCourse: Record<string, any[]> = {};

        (allModules || []).forEach((m: any) => {
          moduleCountByCourse[m.course_id] = (moduleCountByCourse[m.course_id] || 0) + 1;
          if (!modulesByCourse[m.course_id]) modulesByCourse[m.course_id] = [];
          modulesByCourse[m.course_id].push({ id: m.id, title: m.title, display_order: m.display_order });
        });

        courses = pcList
          .filter((item: any) => item.course)
          .map((item: any) => {
            const c = item.course;
            return {
              id: c.id,
              title: c.title,
              slug: c.slug,
              short_description: c.short_description,
              difficulty: c.difficulty,
              duration_minutes: c.duration_minutes,
              display_order: item.display_order,
              is_required: item.is_required,
              is_published: c.is_published,
              status: c.is_published ? 'PUBLISHED' : 'DRAFT',
              module_count: moduleCountByCourse[c.id] || 0,
              modules: modulesByCourse[c.id] || []
            };
          });
      }
    }

    res.json({
      success: true,
      domain,
      learningPath: program ? {
        id: program.id,
        title: program.title,
        slug: program.slug,
        program_type: program.program_type,
        description: program.description,
        is_published: program.is_published
      } : null,
      courses
    });
  } catch (err: any) {
    console.error('[getDomainLearningPath] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error while fetching domain learning path.' });
  }
}

/**
 * GET /api/admin/courses
 * Admin overview of all courses (published & draft) with module count & associated career paths
 */
export async function getAdminCourses(req: Request, res: Response): Promise<void> {
  try {
    const { data: courses, error: cErr } = await supabaseAdmin
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (cErr) {
      res.status(500).json({ success: false, error: cErr.message });
      return;
    }

    const courseIds = (courses || []).map((c: any) => c.id);

    // Fetch module counts
    const { data: modules } = await supabaseAdmin
      .from('modules')
      .select('id, course_id')
      .in('course_id', courseIds);

    const moduleCountMap: Record<string, number> = {};
    (modules || []).forEach((m: any) => {
      moduleCountMap[m.course_id] = (moduleCountMap[m.course_id] || 0) + 1;
    });

    // Fetch associated programs / career paths
    const { data: pcList } = await supabaseAdmin
      .from('program_courses')
      .select('course_id, program:programs(id, title, slug)');

    const programMap: Record<string, string[]> = {};
    (pcList || []).forEach((pc: any) => {
      if (pc.course_id && pc.program?.title) {
        if (!programMap[pc.course_id]) programMap[pc.course_id] = [];
        programMap[pc.course_id].push(pc.program.title);
      }
    });

    const formattedCourses = (courses || []).map((c: any) => ({
      ...c,
      status: c.is_published ? 'PUBLISHED' : 'DRAFT',
      module_count: moduleCountMap[c.id] || 0,
      associated_paths: programMap[c.id] || []
    }));

    res.json({
      success: true,
      count: formattedCourses.length,
      courses: formattedCourses
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * POST /api/admin/catalog/publish-all
 * Activate and publish every course across all career domains
 */
export async function publishAllCatalogCourses(req: Request, res: Response): Promise<void> {
  try {
    const { data: updatedCourses, error } = await supabaseAdmin
      .from('courses')
      .update({
        is_published: true,
        updated_at: new Date().toISOString()
      })
      .not('id', 'is', null)
      .select('id, title, slug, category_id, is_published');

    if (error) {
      console.error('[publishAllCatalogCourses] Error:', error.message);
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      message: 'All catalog courses have been published and activated successfully.',
      publishedCount: updatedCourses?.length || 0,
      courses: updatedCourses || []
    });
  } catch (err: any) {
    console.error('[publishAllCatalogCourses] Exception:', err);
    res.status(500).json({ success: false, error: 'Failed to publish catalog courses.' });
  }
}


