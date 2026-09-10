-- Migration 00009: Persist "Check Your Understanding" checkpoint attempts.
--
-- Context
--   Checkpoint questions are defined in application code
--   (src/backend/services/checkpoint.service.ts), and attempts were previously
--   held in a module-level in-memory array. Under serverless that array is lost
--   on every cold start and is not shared between concurrent instances, so a
--   submitted answer could not survive a refresh and duplicate submissions
--   could not be rejected server-side.
--
--   Migration 00007 declared this table but was never applied to this project.
--   This migration creates ONLY the attempts table, which is all the runtime
--   needs; the question bank stays in code.
--
-- Safety
--   * Additive only. No existing table, column, policy or row is altered.
--   * IF NOT EXISTS / idempotent — safe to run more than once.
--   * checkpoint_id and selected_option_id are deterministic uuidv5 values
--     generated in application code, so they are intentionally NOT foreign
--     keys to any table.
--
-- The UNIQUE (user_id, checkpoint_id) constraint is the authoritative
-- one-attempt-per-question guarantee: a second submission raises 23505 and is
-- rejected by the API. This cannot be bypassed from the browser.

CREATE TABLE IF NOT EXISTS public.student_checkpoint_attempts (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkpoint_id      UUID NOT NULL,
    lesson_id          UUID,
    selected_option_id UUID NOT NULL,
    is_correct         BOOLEAN NOT NULL,
    attempted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT student_checkpoint_attempts_one_per_question UNIQUE (user_id, checkpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_checkpoint_attempts_user
    ON public.student_checkpoint_attempts (user_id, checkpoint_id);

ALTER TABLE public.student_checkpoint_attempts ENABLE ROW LEVEL SECURITY;

-- A learner may only ever see or write their own attempts. The API itself uses
-- the service-role client and derives user_id from the verified access token,
-- never from the request body; this policy is defence in depth for any client
-- that reaches the table directly with an anon key.
DROP POLICY IF EXISTS "Students read own checkpoint attempts" ON public.student_checkpoint_attempts;
CREATE POLICY "Students read own checkpoint attempts"
    ON public.student_checkpoint_attempts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students insert own checkpoint attempts" ON public.student_checkpoint_attempts;
CREATE POLICY "Students insert own checkpoint attempts"
    ON public.student_checkpoint_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Deliberately no UPDATE or DELETE policy: a recorded answer is final.
