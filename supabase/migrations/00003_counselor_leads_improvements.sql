-- ============================================================================
-- 00003_counselor_leads_improvements.sql
-- APEX ACADEMY: Counselor Leads Schema Evolution for Real User Data
-- ============================================================================

-- 1. Add missing explicit columns to public.counselor_leads
ALTER TABLE public.counselor_leads
  ADD COLUMN IF NOT EXISTS target_domain TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT;

-- 2. Backfill existing legacy test records if any exist
UPDATE public.counselor_leads
SET 
  target_domain = COALESCE(target_domain, 'Other'),
  preferred_contact_method = COALESCE(preferred_contact_method, 'Phone Call')
WHERE target_domain IS NULL OR preferred_contact_method IS NULL;

-- 3. Add column comments for administrative clarity
COMMENT ON COLUMN public.counselor_leads.name IS 'Full Name submitted directly by user';
COMMENT ON COLUMN public.counselor_leads.email IS 'Genuine email address provided by user';
COMMENT ON COLUMN public.counselor_leads.phone IS 'Phone / WhatsApp contact provided by user';
COMMENT ON COLUMN public.counselor_leads.target_domain IS 'Selected canonical learning pathway / domain';
COMMENT ON COLUMN public.counselor_leads.experience_level IS 'User experience level (e.g. Student / Fresher, 0–2 Years, 2–5 Years, 5+ Years)';
COMMENT ON COLUMN public.counselor_leads.preferred_contact_method IS 'User preferred communication channel (Phone Call, WhatsApp, Email)';
COMMENT ON COLUMN public.counselor_leads.message IS 'Optional custom note / query written by user';

-- 4. Create performance indexes for Admin Portal filtering
CREATE INDEX IF NOT EXISTS idx_counselor_leads_status ON public.counselor_leads(status);
CREATE INDEX IF NOT EXISTS idx_counselor_leads_created_at ON public.counselor_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_counselor_leads_target_domain ON public.counselor_leads(target_domain);
CREATE INDEX IF NOT EXISTS idx_counselor_leads_experience ON public.counselor_leads(experience_level);
