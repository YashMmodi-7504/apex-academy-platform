import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';

/**
 * POST /api/courses/:courseId/enroll
 * Enroll the authenticated user into a specified course.
 * Identity is derived strictly from verified JWT token (`req.user.id`).
 */
export async function enrollInCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { courseId } = req.params;
  const { paymentCompleted } = req.body || {};

  if (!userId) {
    res.status(401).json({ success: false, error: 'User identity unverified or token missing.' });
    return;
  }

  if (!courseId) {
    res.status(400).json({ success: false, error: 'Course ID parameter is required.' });
    return;
  }

  try {
    // 1. Verify course existence & published state
    const { data: course, error: courseErr } = await supabaseAdmin
      .from('courses')
      .select('id, title, slug, is_published, is_free')
      .eq('id', courseId)
      .maybeSingle();

    if (courseErr) {
      console.error('[enrollInCourse] Error checking course:', courseErr.message);
      res.status(500).json({ success: false, error: 'Database check failed.' });
      return;
    }

    if (!course || !course.is_published) {
      res.status(404).json({ success: false, error: 'Course not found or not published.' });
      return;
    }

    // 3. Check for existing enrollment to ensure idempotency
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existErr) {
      console.error('[enrollInCourse] Error checking existing enrollment:', existErr.message);
    }

    if (existing) {
      res.status(200).json({
        success: true,
        alreadyEnrolled: true,
        message: 'Student is already enrolled in this course.',
        enrollment: existing,
      });
      return;
    }

    // 4. Create new enrollment record
    const { data: newEnrollment, error: insertErr } = await supabaseAdmin
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        status: 'ENROLLED',
        progress_percentage: 0,
        enrolled_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertErr) {
      // Handle unique constraint conflict gracefully if duplicate race condition happened
      if (insertErr.code === '23505') {
        const { data: duplicate } = await supabaseAdmin
          .from('enrollments')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .single();

        res.status(200).json({
          success: true,
          alreadyEnrolled: true,
          message: 'Student is already enrolled in this course.',
          enrollment: duplicate,
        });
        return;
      }

      console.error('[enrollInCourse] Enrollment insert error:', insertErr.message);
      res.status(500).json({ success: false, error: 'Failed to create enrollment record.' });
      return;
    }

    res.status(201).json({
      success: true,
      alreadyEnrolled: false,
      message: 'Successfully enrolled in course!',
      enrollment: newEnrollment,
    });
  } catch (err: any) {
    console.error('[enrollInCourse] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * GET /api/courses/:courseId/enrollment
 * Check if the authenticated user is enrolled in a specific course
 */
export async function getEnrollmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { courseId } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthenticated.' });
    return;
  }

  try {
    const { data: enrollment, error } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (error) {
      console.error('[getEnrollmentStatus] Error:', error.message);
      res.status(500).json({ success: false, error: 'Failed to verify enrollment status.' });
      return;
    }

    res.json({
      success: true,
      isEnrolled: !!enrollment,
      enrollment: enrollment || null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

/**
 * GET /api/me/enrollments
 * Fetch all course enrollments for the authenticated user, joined with course metadata
 */
export async function getMyEnrollments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthenticated.' });
    return;
  }

  try {
    const { data: enrollments, error } = await supabaseAdmin
      .from('enrollments')
      .select(`
        id,
        status,
        progress_percentage,
        enrolled_at,
        started_at,
        completed_at,
        last_accessed_lesson_id,
        course:courses (
          id,
          title,
          slug,
          short_description,
          thumbnail_url,
          difficulty,
          duration_minutes,
          certificate_enabled,
          is_free,
          is_published,
          category:categories (
            name,
            slug
          )
        )
      `)
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('[getMyEnrollments] Error:', error.message);
      res.status(500).json({ success: false, error: 'Failed to fetch enrollments.' });
      return;
    }

    res.json({
      success: true,
      count: enrollments?.length || 0,
      enrollments: enrollments || [],
    });
  } catch (err: any) {
    console.error('[getMyEnrollments] Exception:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}
