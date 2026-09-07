-- ============================================================================
-- APEX ACADEMY — MIGRATION 00001: INITIAL DATABASE SCHEMA
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. REUSABLE FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically manage updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. IDENTITY: PROFILES & AUTOMATIC AUTH TRIGGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  education TEXT,
  experience_level TEXT,
  role TEXT DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatic Profile Creation Trigger on Supabase Auth User Registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'STUDENT'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger attached to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. INSTITUTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  website TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. PROGRAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  program_type TEXT NOT NULL CHECK (program_type IN ('POST_GRADUATE', 'EXECUTIVE', 'DEGREE', 'PROFESSIONAL_CERTIFICATE')),
  duration TEXT,
  learning_format TEXT,
  weekly_commitment TEXT,
  hero_image_url TEXT,
  career_support BOOLEAN DEFAULT TRUE,
  certificate_enabled BOOLEAN DEFAULT TRUE,
  fee NUMERIC(10, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  eligibility TEXT,
  admission_process TEXT,
  batch_start_date DATE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. COURSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  thumbnail_url TEXT,
  preview_video_url TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  duration_minutes INT DEFAULT 0,
  language VARCHAR(50) DEFAULT 'English',
  certificate_enabled BOOLEAN DEFAULT TRUE,
  is_free BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. PROGRAM COURSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.program_courses (
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (program_id, course_id)
);

-- ============================================================================
-- 8. INSTRUCTORS & COURSE INSTRUCTORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  experience TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_instructors (
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.instructors(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, instructor_id)
);

-- ============================================================================
-- 9. MODULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. LESSONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('VIDEO', 'ARTICLE', 'READING', 'PRACTICAL')),
  content TEXT,
  video_url TEXT,
  duration_seconds INT DEFAULT 0,
  display_order INT DEFAULT 0,
  is_preview BOOLEAN DEFAULT FALSE,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. LESSON RESOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('PDF', 'PPT', 'NOTE', 'CODE', 'DATASET', 'LINK')),
  file_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. ENROLLMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  progress_percentage NUMERIC(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_accessed_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

-- ============================================================================
-- 13. LESSON PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  watch_percentage NUMERIC(5,2) DEFAULT 0 CHECK (watch_percentage >= 0 AND watch_percentage <= 100),
  last_position_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

-- ============================================================================
-- 14. ASSESSMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('MODULE_QUIZ', 'FINAL_ASSESSMENT')),
  passing_percentage NUMERIC(5,2) DEFAULT 70 CHECK (passing_percentage >= 0 AND passing_percentage <= 100),
  duration_minutes INT DEFAULT 30,
  max_attempts INT DEFAULT 3 CHECK (max_attempts > 0),
  is_required BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 15. QUESTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE')),
  marks INT DEFAULT 1 CHECK (marks > 0),
  explanation TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 16. QUESTION OPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public view for question options that strips is_correct for secure student queries
CREATE OR REPLACE VIEW public.public_question_options AS
SELECT 
  id,
  question_id,
  option_text,
  display_order,
  created_at
FROM public.question_options;

-- ============================================================================
-- 17. ASSESSMENT ATTEMPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL CHECK (attempt_number > 0),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC(5,2) DEFAULT 0,
  max_score NUMERIC(5,2) DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  passed BOOLEAN DEFAULT FALSE,
  time_taken_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, assessment_id, attempt_number)
);

-- ============================================================================
-- 18. STUDENT ANSWERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  option_id UUID REFERENCES public.question_options(id) ON DELETE CASCADE,
  is_correct BOOLEAN,
  marks_awarded NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (attempt_id, question_id, option_id)
);

-- ============================================================================
-- 19. CERTIFICATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE RESTRICT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  pdf_url TEXT,
  verification_status TEXT DEFAULT 'VALID' CHECK (verification_status IN ('VALID', 'REVOKED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public view for certificate verification (strips private user details)
CREATE OR REPLACE VIEW public.public_certificate_verifications AS
SELECT 
  c.certificate_code,
  c.issued_at,
  c.verification_status,
  p.full_name AS learner_name,
  co.title AS course_title
FROM public.certificates c
JOIN public.profiles p ON c.user_id = p.id
JOIN public.courses co ON c.course_id = co.id;

-- ============================================================================
-- 20. SUCCESS STORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_name TEXT NOT NULL,
  avatar_url TEXT,
  previous_role TEXT,
  previous_company TEXT,
  new_role TEXT,
  current_company TEXT,
  testimonial TEXT NOT NULL,
  story TEXT,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guarantee new_role column exists if table was already created in a previous migration run
ALTER TABLE public.success_stories ADD COLUMN IF NOT EXISTS new_role TEXT;

-- ============================================================================
-- 21. ARTICLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  thumbnail_url TEXT,
  author TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 22. CAREER RESOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.career_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('RESUME', 'INTERVIEW', 'LINKEDIN', 'JOB_SEARCH', 'CAREER_GUIDE')),
  resource_url TEXT NOT NULL,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 23. COUNSELOR LEADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.counselor_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  experience_level TEXT,
  message TEXT,
  status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 24. ENTERPRISE INQUIRIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.enterprise_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  team_size TEXT,
  interest TEXT,
  message TEXT,
  status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 25. ATTACH UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_modtime ON public.categories;
CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_institutions_modtime ON public.institutions;
CREATE TRIGGER update_institutions_modtime BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_programs_modtime ON public.programs;
CREATE TRIGGER update_programs_modtime BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_modtime ON public.courses;
CREATE TRIGGER update_courses_modtime BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instructors_modtime ON public.instructors;
CREATE TRIGGER update_instructors_modtime BEFORE UPDATE ON public.instructors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_modules_modtime ON public.modules;
CREATE TRIGGER update_modules_modtime BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_modtime ON public.lessons;
CREATE TRIGGER update_lessons_modtime BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_enrollments_modtime ON public.enrollments;
CREATE TRIGGER update_enrollments_modtime BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lesson_progress_modtime ON public.lesson_progress;
CREATE TRIGGER update_lesson_progress_modtime BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessments_modtime ON public.assessments;
CREATE TRIGGER update_assessments_modtime BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_modtime ON public.questions;
CREATE TRIGGER update_questions_modtime BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_success_stories_modtime ON public.success_stories;
CREATE TRIGGER update_success_stories_modtime BEFORE UPDATE ON public.success_stories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_articles_modtime ON public.articles;
CREATE TRIGGER update_articles_modtime BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_career_resources_modtime ON public.career_resources;
CREATE TRIGGER update_career_resources_modtime BEFORE UPDATE ON public.career_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_counselor_leads_modtime ON public.counselor_leads;
CREATE TRIGGER update_counselor_leads_modtime BEFORE UPDATE ON public.counselor_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_enterprise_inquiries_modtime ON public.enterprise_inquiries;
CREATE TRIGGER update_enterprise_inquiries_modtime BEFORE UPDATE ON public.enterprise_inquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 26. INDEXING FOR HIGH PERFORMANCE ACCESS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);
CREATE INDEX IF NOT EXISTS idx_programs_slug ON public.programs(slug);
CREATE INDEX IF NOT EXISTS idx_programs_institution ON public.programs(institution_id);
CREATE INDEX IF NOT EXISTS idx_programs_category ON public.programs(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category_id);
CREATE INDEX IF NOT EXISTS idx_modules_course ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson ON public.lesson_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assessments_course ON public.assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_assessment ON public.questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_question_options_question ON public.question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON public.assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON public.assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_attempt ON public.student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
