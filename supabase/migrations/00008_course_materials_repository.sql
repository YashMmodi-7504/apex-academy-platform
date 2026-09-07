-- ============================================================================
-- APEX ACADEMY — MIGRATION 00008: COURSE MATERIAL REPOSITORY
-- ============================================================================

-- Create course_materials table
CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  bucket_name TEXT NOT NULL DEFAULT 'course-materials',
  storage_path TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REPLACED', 'DELETED')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Auto-manage updated_at trigger
DROP TRIGGER IF EXISTS set_course_materials_updated_at ON public.course_materials;
CREATE TRIGGER set_course_materials_updated_at
  BEFORE UPDATE ON public.course_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_materials_course ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_module ON public.course_materials(module_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_status ON public.course_materials(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- Security Policy: Admins only
DROP POLICY IF EXISTS "Admin full access to course materials" ON public.course_materials;
CREATE POLICY "Admin full access to course materials" ON public.course_materials
  FOR ALL USING (public.is_admin());

-- Private Supabase Storage bucket for course-materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', false)
ON CONFLICT (id) DO NOTHING;
