-- ============================================================================
-- APEX ACADEMY — MIGRATION 00005: CONTENT INGESTION FOUNDATION
-- ============================================================================

-- 1. Modify lesson_resources check constraint for resource_type
ALTER TABLE public.lesson_resources 
  DROP CONSTRAINT IF EXISTS lesson_resources_resource_type_check;

ALTER TABLE public.lesson_resources 
  ADD CONSTRAINT lesson_resources_resource_type_check 
  CHECK (resource_type IN ('PDF', 'PPT', 'NOTE', 'CODE', 'DATASET', 'LINK', 'SUBTITLE', 'NOTEBOOK', 'VIDEO'));

-- 2. Add extended asset metadata columns to lesson_resources
ALTER TABLE public.lesson_resources
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS language_code TEXT,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Add check constraint for upload_status
ALTER TABLE public.lesson_resources
  DROP CONSTRAINT IF EXISTS lesson_resources_upload_status_check;

ALTER TABLE public.lesson_resources
  ADD CONSTRAINT lesson_resources_upload_status_check
  CHECK (upload_status IN ('PENDING', 'UPLOADING', 'COMPLETED', 'FAILED'));

-- 4. Create trigger to update updated_at on lesson_resources
DROP TRIGGER IF EXISTS update_lesson_resources_modtime ON public.lesson_resources;
CREATE TRIGGER update_lesson_resources_modtime 
  BEFORE UPDATE ON public.lesson_resources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Indexing for fast resource lookup by lesson, primary flag, and language
CREATE INDEX IF NOT EXISTS idx_lesson_resources_is_primary ON public.lesson_resources(lesson_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_type ON public.lesson_resources(resource_type);
