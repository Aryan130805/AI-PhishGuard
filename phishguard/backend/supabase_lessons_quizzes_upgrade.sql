-- ====================================================================
-- PhishGuard — Lessons & Quizzes Schema Upgrade
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ezjmrpdqgiicfprkgadi/sql/new
-- ====================================================================

-- ── 1. Add missing columns to lessons ────────────────────────────────

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS category        VARCHAR(100) DEFAULT 'Phishing Attacks',
  ADD COLUMN IF NOT EXISTS difficulty      VARCHAR(50)  DEFAULT 'Beginner',
  ADD COLUMN IF NOT EXISTS summary         TEXT,
  ADD COLUMN IF NOT EXISTS is_public       BOOLEAN      DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS organization_id INT          REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_date  DATE;

-- ── 2. Add missing columns to quizzes ────────────────────────────────

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS title          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS category       VARCHAR(100) DEFAULT 'Phishing Attacks',
  ADD COLUMN IF NOT EXISTS difficulty     VARCHAR(50)  DEFAULT 'Beginner',
  ADD COLUMN IF NOT EXISTS summary        TEXT,
  ADD COLUMN IF NOT EXISTS time_estimate  VARCHAR(50)  DEFAULT '5 mins',
  ADD COLUMN IF NOT EXISTS pass_score     INT          DEFAULT 75,
  ADD COLUMN IF NOT EXISTS is_public      BOOLEAN      DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS organization_id INT         REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Make lesson_id optional on quizzes (standalone quiz modules)
ALTER TABLE public.quizzes
  ALTER COLUMN lesson_id DROP NOT NULL;

-- ── 3. RLS: Allow authenticated users to INSERT lessons & quizzes ─────

DROP POLICY IF EXISTS "lessons_authenticated_insert" ON public.lessons;
CREATE POLICY "lessons_authenticated_insert"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "lessons_authenticated_update" ON public.lessons;
CREATE POLICY "lessons_authenticated_update"
  ON public.lessons FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "quizzes_authenticated_insert" ON public.quizzes;
CREATE POLICY "quizzes_authenticated_insert"
  ON public.quizzes FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "quizzes_authenticated_update" ON public.quizzes;
CREATE POLICY "quizzes_authenticated_update"
  ON public.quizzes FOR UPDATE TO authenticated
  USING (true);

-- ── 4. Indexes for org-scoped filtering ──────────────────────────────

CREATE INDEX IF NOT EXISTS ix_lessons_org       ON public.lessons(organization_id);
CREATE INDEX IF NOT EXISTS ix_lessons_public    ON public.lessons(is_public);
CREATE INDEX IF NOT EXISTS ix_quizzes_org       ON public.quizzes(organization_id);
CREATE INDEX IF NOT EXISTS ix_quizzes_public    ON public.quizzes(is_public);
CREATE INDEX IF NOT EXISTS ix_quizzes_lesson    ON public.quizzes(lesson_id);

-- ── 5. Verify columns ─────────────────────────────────────────────────

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('lessons', 'quizzes')
ORDER BY table_name, ordinal_position;
