-- ============================================================================
-- APEX ACADEMY — MIGRATION 00002: ROW LEVEL SECURITY (RLS) & SECURITY POLICIES
-- ============================================================================

-- Enable RLS on ALL public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_inquiries ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1. PUBLIC CATALOG DATA (READ ACCESS FOR ALL, WRITE ACCESS FOR ADMINS)
-- ============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Categories
DROP POLICY IF EXISTS "Public read active categories" ON public.categories;
CREATE POLICY "Public read active categories" ON public.categories
  FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin write categories" ON public.categories;
CREATE POLICY "Admin write categories" ON public.categories
  FOR ALL USING (public.is_admin());

-- Institutions
DROP POLICY IF EXISTS "Public read active institutions" ON public.institutions;
CREATE POLICY "Public read active institutions" ON public.institutions
  FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin write institutions" ON public.institutions;
CREATE POLICY "Admin write institutions" ON public.institutions
  FOR ALL USING (public.is_admin());

-- Programs
DROP POLICY IF EXISTS "Public read published programs" ON public.programs;
CREATE POLICY "Public read published programs" ON public.programs
  FOR SELECT USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin write programs" ON public.programs;
CREATE POLICY "Admin write programs" ON public.programs
  FOR ALL USING (public.is_admin());

-- Courses
DROP POLICY IF EXISTS "Public read published courses" ON public.courses;
CREATE POLICY "Public read published courses" ON public.courses
  FOR SELECT USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin write courses" ON public.courses;
CREATE POLICY "Admin write courses" ON public.courses
  FOR ALL USING (public.is_admin());

-- Program Courses
DROP POLICY IF EXISTS "Public read program courses" ON public.program_courses;
CREATE POLICY "Public read program courses" ON public.program_courses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write program courses" ON public.program_courses;
CREATE POLICY "Admin write program courses" ON public.program_courses
  FOR ALL USING (public.is_admin());

-- Instructors & Course Instructors
DROP POLICY IF EXISTS "Public read instructors" ON public.instructors;
CREATE POLICY "Public read instructors" ON public.instructors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write instructors" ON public.instructors;
CREATE POLICY "Admin write instructors" ON public.instructors
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public read course instructors" ON public.course_instructors;
CREATE POLICY "Public read course instructors" ON public.course_instructors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write course instructors" ON public.course_instructors;
CREATE POLICY "Admin write course instructors" ON public.course_instructors
  FOR ALL USING (public.is_admin());

-- Modules & Lessons & Resources
DROP POLICY IF EXISTS "Public read modules" ON public.modules;
CREATE POLICY "Public read modules" ON public.modules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write modules" ON public.modules;
CREATE POLICY "Admin write modules" ON public.modules
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public read lessons" ON public.lessons;
CREATE POLICY "Public read lessons" ON public.lessons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write lessons" ON public.lessons;
CREATE POLICY "Admin write lessons" ON public.lessons
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public read lesson resources" ON public.lesson_resources;
CREATE POLICY "Public read lesson resources" ON public.lesson_resources
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write lesson resources" ON public.lesson_resources;
CREATE POLICY "Admin write lesson resources" ON public.lesson_resources
  FOR ALL USING (public.is_admin());

-- Assessments & Questions
DROP POLICY IF EXISTS "Public read assessments" ON public.assessments;
CREATE POLICY "Public read assessments" ON public.assessments
  FOR SELECT USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin write assessments" ON public.assessments;
CREATE POLICY "Admin write assessments" ON public.assessments
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public read questions" ON public.questions;
CREATE POLICY "Public read questions" ON public.questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write questions" ON public.questions;
CREATE POLICY "Admin write questions" ON public.questions
  FOR ALL USING (public.is_admin());

-- ============================================================================
-- 2. CRITICAL ASSESSMENT SECURITY: QUESTION OPTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Admin or Service Role read question_options" ON public.question_options;
CREATE POLICY "Admin or Service Role read question_options" ON public.question_options
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin write question_options" ON public.question_options;
CREATE POLICY "Admin write question_options" ON public.question_options
  FOR ALL USING (public.is_admin());

-- ============================================================================
-- 3. USER LEARNING DATA (ENROLLMENTS, PROGRESS, ATTEMPTS, ANSWERS, CERTIFICATES)
-- ============================================================================

-- Enrollments
DROP POLICY IF EXISTS "Users read own enrollments" ON public.enrollments;
CREATE POLICY "Users read own enrollments" ON public.enrollments
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own enrollments" ON public.enrollments;
CREATE POLICY "Users insert own enrollments" ON public.enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own enrollments" ON public.enrollments;
CREATE POLICY "Users update own enrollments" ON public.enrollments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Lesson Progress
DROP POLICY IF EXISTS "Users read own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users read own lesson progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert/update own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users insert/update own lesson progress" ON public.lesson_progress
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Assessment Attempts
DROP POLICY IF EXISTS "Users read own assessment attempts" ON public.assessment_attempts;
CREATE POLICY "Users read own assessment attempts" ON public.assessment_attempts
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own assessment attempts" ON public.assessment_attempts;
CREATE POLICY "Users insert own assessment attempts" ON public.assessment_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Student Answers
DROP POLICY IF EXISTS "Users read own student answers" ON public.student_answers;
CREATE POLICY "Users read own student answers" ON public.student_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assessment_attempts
      WHERE id = student_answers.attempt_id AND (user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users insert own student answers" ON public.student_answers;
CREATE POLICY "Users insert own student answers" ON public.student_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_attempts
      WHERE id = student_answers.attempt_id AND user_id = auth.uid()
    )
  );

-- Certificates
DROP POLICY IF EXISTS "Users read own certificates" ON public.certificates;
CREATE POLICY "Users read own certificates" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================================
-- 4. MARKETING, BLOG, LEADS & INQUIRIES
-- ============================================================================

-- Success Stories & Articles & Career Resources
DROP POLICY IF EXISTS "Public read success stories" ON public.success_stories;
CREATE POLICY "Public read success stories" ON public.success_stories
  FOR SELECT USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Public read articles" ON public.articles;
CREATE POLICY "Public read articles" ON public.articles
  FOR SELECT USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Public read career resources" ON public.career_resources;
CREATE POLICY "Public read career resources" ON public.career_resources
  FOR SELECT USING (is_published = true OR public.is_admin());

-- Counselor Leads & Enterprise Inquiries
DROP POLICY IF EXISTS "Public insert counselor leads" ON public.counselor_leads;
CREATE POLICY "Public insert counselor leads" ON public.counselor_leads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin view counselor leads" ON public.counselor_leads;
CREATE POLICY "Admin view counselor leads" ON public.counselor_leads
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Public insert enterprise inquiries" ON public.enterprise_inquiries;
CREATE POLICY "Public insert enterprise inquiries" ON public.enterprise_inquiries
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin view enterprise inquiries" ON public.enterprise_inquiries;
CREATE POLICY "Admin view enterprise inquiries" ON public.enterprise_inquiries
  FOR SELECT USING (public.is_admin());

-- ============================================================================
-- 5. SUPABASE STORAGE BUCKET CONFIGURATION
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('course-thumbnails', 'course-thumbnails', true),
  ('program-images', 'program-images', true),
  ('institution-logos', 'institution-logos', true),
  ('instructor-images', 'instructor-images', true),
  ('profile-images', 'profile-images', true),
  ('article-images', 'article-images', true),
  ('success-story-images', 'success-story-images', true),
  ('lesson-resources', 'lesson-resources', false),
  ('certificate-assets', 'certificate-assets', false),
  ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;
