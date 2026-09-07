-- Migration 00007: Lesson Knowledge Checkpoints System
-- Adds lightweight lesson_checkpoints, lesson_checkpoint_options, and student_checkpoint_attempts tables.

CREATE TABLE IF NOT EXISTS public.lesson_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE UNIQUE,
    question TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'SINGLE_CHOICE',
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_checkpoint_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkpoint_id UUID NOT NULL REFERENCES public.lesson_checkpoints(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_checkpoint_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkpoint_id UUID NOT NULL REFERENCES public.lesson_checkpoints(id) ON DELETE CASCADE,
    selected_option_id UUID NOT NULL REFERENCES public.lesson_checkpoint_options(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkpoint_lesson ON public.lesson_checkpoints(lesson_id);
CREATE INDEX IF NOT EXISTS idx_options_checkpoint ON public.lesson_checkpoint_options(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_checkpoint ON public.student_checkpoint_attempts(user_id, checkpoint_id);

ALTER TABLE public.lesson_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_checkpoint_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_checkpoint_attempts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to lesson_checkpoints and options
CREATE POLICY "Allow read access to lesson_checkpoints" ON public.lesson_checkpoints FOR SELECT USING (true);
CREATE POLICY "Allow read access to lesson_checkpoint_options" ON public.lesson_checkpoint_options FOR SELECT USING (true);
CREATE POLICY "Allow student attempt access" ON public.student_checkpoint_attempts FOR ALL USING (auth.uid() = user_id);
