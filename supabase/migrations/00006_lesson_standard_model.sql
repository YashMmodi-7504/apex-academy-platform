-- Migration 00006: Standard Lesson Content Model Extensions
-- Adds optional learning_objectives, key_takeaways, and practical_instructions to public.lessons table.

ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS learning_objectives JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS key_takeaways JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS practical_instructions TEXT;
