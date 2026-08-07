-- ====================================================================
-- PhishGuard — Complete Supabase Setup SQL
-- Run this ONCE in Supabase SQL Editor
-- Project: ezjmrpdqgiicfprkgadi
-- URL: https://supabase.com/dashboard/project/ezjmrpdqgiicfprkgadi/sql/new
-- ====================================================================

-- 1. Custom Enum Types
DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE email_event_type AS ENUM ('sent', 'delivered', 'opened', 'clicked', 'attachment_downloaded', 'credentials_submitted', 'reported', 'ignored');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ====================================================================
-- 2. Core Tables
-- ====================================================================

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) UNIQUE NOT NULL,
    industry    VARCHAR(100),
    company_size VARCHAR(50),
    website     VARCHAR(255),
    country     VARCHAR(100),
    state       VARCHAR(100),
    city        VARCHAR(100),
    logo_url    TEXT,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
    id              SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_org_name UNIQUE (organization_id, name)
);

-- Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Role Permissions (join)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id       INT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Users — supabase_uid links Supabase Auth → profile row
CREATE TABLE IF NOT EXISTS public.users (
    id                       SERIAL PRIMARY KEY,
    supabase_uid             UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email                    VARCHAR(255) UNIQUE NOT NULL,
    hashed_password          VARCHAR(255),          -- nullable; managed by Supabase Auth
    first_name               VARCHAR(100),
    last_name                VARCHAR(100),
    is_active                BOOLEAN DEFAULT TRUE NOT NULL,
    is_admin                 BOOLEAN DEFAULT FALSE NOT NULL,
    needs_advanced_training  BOOLEAN DEFAULT FALSE NOT NULL,
    suggested_next_difficulty VARCHAR(50) DEFAULT 'easy' NOT NULL,
    organization_id          INT REFERENCES public.organizations(id) ON DELETE CASCADE,
    department_id            INT REFERENCES public.departments(id) ON DELETE SET NULL,
    role_id                  INT REFERENCES public.roles(id) ON DELETE RESTRICT,
    created_at               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id          SERIAL PRIMARY KEY,
    token_hash  VARCHAR(255) UNIQUE NOT NULL,
    user_id     INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_revoked  BOOLEAN DEFAULT FALSE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
    id            SERIAL PRIMARY KEY,
    org_id        INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    theme         VARCHAR(100) NOT NULL,
    difficulty    VARCHAR(50) NOT NULL,
    language      VARCHAR(10) NOT NULL,
    department_id INT REFERENCES public.departments(id) ON DELETE SET NULL,
    status        campaign_status DEFAULT 'draft' NOT NULL,
    scheduled_at  TIMESTAMPTZ,
    created_by    INT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
    id           SERIAL PRIMARY KEY,
    campaign_id  INT REFERENCES public.campaigns(id) ON DELETE CASCADE,
    subject      VARCHAR(255) NOT NULL,
    sender_name  VARCHAR(100) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    body_html    TEXT NOT NULL,
    cta_text     VARCHAR(100) NOT NULL,
    fake_url     VARCHAR(255) NOT NULL,
    ai_generated BOOLEAN DEFAULT FALSE,
    approved     BOOLEAN DEFAULT FALSE
);

-- Campaign Targets
CREATE TABLE IF NOT EXISTS public.campaign_targets (
    id              SERIAL PRIMARY KEY,
    campaign_id     INT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id         INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tracking_token  VARCHAR(255) UNIQUE NOT NULL
);

-- Email Events
CREATE TABLE IF NOT EXISTS public.email_events (
    id          SERIAL PRIMARY KEY,
    campaign_id INT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type  email_event_type NOT NULL,
    occurred_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    metadata    JSONB
);

-- Lessons
CREATE TABLE IF NOT EXISTS public.lessons (
    id           SERIAL PRIMARY KEY,
    topic        VARCHAR(100) NOT NULL,
    title        VARCHAR(255) NOT NULL,
    content      TEXT NOT NULL,
    ai_generated BOOLEAN DEFAULT FALSE
);

-- Quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
    id        SERIAL PRIMARY KEY,
    lesson_id INT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    questions JSONB NOT NULL
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id           SERIAL PRIMARY KEY,
    quiz_id      INT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id      INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score        INT NOT NULL,
    passed       BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Certificates
CREATE TABLE IF NOT EXISTS public.certificates (
    id        SERIAL PRIMARY KEY,
    user_id   INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lesson_id INT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    pdf_path  TEXT NOT NULL
);

-- Lesson Assignments
CREATE TABLE IF NOT EXISTS public.lesson_assignments (
    id           SERIAL PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lesson_id    INT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    assigned_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    completed_sections JSONB DEFAULT '[]'::jsonb,
    current_section INT DEFAULT 0
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    payload    JSONB NOT NULL,
    read       BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
    id            SERIAL PRIMARY KEY,
    org_id        INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type          VARCHAR(100) DEFAULT 'executive_summary' NOT NULL,
    generated_by  INT REFERENCES public.users(id) ON DELETE SET NULL,
    generated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    job_id        VARCHAR(255) UNIQUE,
    status        VARCHAR(50) DEFAULT 'pending' NOT NULL,
    error_message TEXT,
    date_from     TIMESTAMPTZ,
    date_to       TIMESTAMPTZ,
    department_id INT REFERENCES public.departments(id) ON DELETE SET NULL,
    formats       JSONB,
    file_paths    JSONB,
    file_path     TEXT
);

-- Risk Scores
CREATE TABLE IF NOT EXISTS public.risk_scores (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score       DOUBLE PRECISION NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User Metrics
CREATE TABLE IF NOT EXISTS public.user_metrics (
    user_id          INT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    click_rate       DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    report_rate      DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    open_rate        DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    avg_time_to_click DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 3. Performance Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS ix_users_email        ON public.users(email);
CREATE INDEX IF NOT EXISTS ix_users_org          ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS ix_users_supabase_uid ON public.users(supabase_uid);
CREATE INDEX IF NOT EXISTS ix_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX IF NOT EXISTS ix_email_events_user     ON public.email_events(user_id);
CREATE INDEX IF NOT EXISTS ix_email_events_occurred ON public.email_events(occurred_at);
CREATE INDEX IF NOT EXISTS ix_notifications_user    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS ix_risk_scores_user      ON public.risk_scores(user_id);

-- ====================================================================
-- 4. Automated Trigger: Recalculate metrics on every email event
-- ====================================================================
CREATE OR REPLACE FUNCTION update_user_metrics_func()
RETURNS TRIGGER AS $$
DECLARE
    t_user_id INT;
    v_total   INT;
    v_opens   INT;
    v_clicks  INT;
    v_reports INT;
BEGIN
    t_user_id := NEW.user_id;
    SELECT COUNT(*) INTO v_total   FROM public.email_events WHERE user_id = t_user_id;
    SELECT COUNT(*) INTO v_opens   FROM public.email_events WHERE user_id = t_user_id AND event_type = 'opened';
    SELECT COUNT(*) INTO v_clicks  FROM public.email_events WHERE user_id = t_user_id AND event_type = 'clicked';
    SELECT COUNT(*) INTO v_reports FROM public.email_events WHERE user_id = t_user_id AND event_type = 'reported';

    IF v_total > 0 THEN
        INSERT INTO public.user_metrics (user_id, open_rate, click_rate, report_rate, updated_at)
        VALUES (
            t_user_id,
            ROUND((v_opens::numeric  / v_total::numeric) * 100, 2),
            ROUND((v_clicks::numeric / v_total::numeric) * 100, 2),
            ROUND((v_reports::numeric/ v_total::numeric) * 100, 2),
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id) DO UPDATE SET
            open_rate   = EXCLUDED.open_rate,
            click_rate  = EXCLUDED.click_rate,
            report_rate = EXCLUDED.report_rate,
            updated_at  = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_metrics ON public.email_events;
CREATE TRIGGER trg_update_user_metrics
AFTER INSERT ON public.email_events
FOR EACH ROW EXECUTE FUNCTION update_user_metrics_func();

-- ====================================================================
-- 5. Row Level Security Policies
-- ====================================================================

-- Enable RLS
ALTER TABLE public.organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metrics     ENABLE ROW LEVEL SECURITY;

-- Organizations: anyone can read (for signup org dropdown)
DROP POLICY IF EXISTS "orgs_public_read" ON public.organizations;
CREATE POLICY "orgs_public_read"
  ON public.organizations FOR SELECT USING (true);

-- Organizations: anyone can insert (registration creates a new org)
DROP POLICY IF EXISTS "orgs_anyone_insert" ON public.organizations;
CREATE POLICY "orgs_anyone_insert"
  ON public.organizations FOR INSERT WITH CHECK (true);

-- Roles: anyone can read (needed to fetch role_id on signup)
DROP POLICY IF EXISTS "roles_public_read" ON public.roles;
CREATE POLICY "roles_public_read"
  ON public.roles FOR SELECT USING (true);

-- Departments: anyone can read
DROP POLICY IF EXISTS "depts_public_read" ON public.departments;
CREATE POLICY "depts_public_read"
  ON public.departments FOR SELECT USING (true);

-- Users: anyone can insert (creates profile after Supabase Auth signup)
DROP POLICY IF EXISTS "users_anyone_insert" ON public.users;
CREATE POLICY "users_anyone_insert"
  ON public.users FOR INSERT WITH CHECK (true);

-- Users: authenticated users can read their own profile
DROP POLICY IF EXISTS "users_read_own" ON public.users;
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT TO authenticated
  USING (supabase_uid = auth.uid());

-- Users: authenticated users can update their own profile
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (supabase_uid = auth.uid());

-- Lessons & Quizzes: anyone can read
DROP POLICY IF EXISTS "lessons_public_read" ON public.lessons;
CREATE POLICY "lessons_public_read" ON public.lessons FOR SELECT USING (true);

DROP POLICY IF EXISTS "quizzes_public_read" ON public.quizzes;
CREATE POLICY "quizzes_public_read" ON public.quizzes FOR SELECT USING (true);

-- Notifications: users can read/update their own
DROP POLICY IF EXISTS "notifs_read_own" ON public.notifications;
CREATE POLICY "notifs_read_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

-- Risk Scores: users can read their own
DROP POLICY IF EXISTS "risk_read_own" ON public.risk_scores;
CREATE POLICY "risk_read_own"
  ON public.risk_scores FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

-- User Metrics: users can read their own
DROP POLICY IF EXISTS "metrics_read_own" ON public.user_metrics;
CREATE POLICY "metrics_read_own"
  ON public.user_metrics FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE supabase_uid = auth.uid()));

-- ====================================================================
-- 6. Seed initial data: Roles & Demo Organizations
-- ====================================================================
INSERT INTO public.roles (id, name, description) VALUES
  (1, 'admin',    'Organization Administrator'),
  (2, 'employee', 'Standard Employee')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (name, industry, company_size, is_verified) VALUES
  ('Demo Org',          'Technology',     '50-200',    TRUE),
  ('Acme Corporation',  'Manufacturing',  '500-1000',  TRUE),
  ('Stark Industries',  'Defense & Tech', '1000+',     TRUE),
  ('Cyberdyne Systems', 'AI & Robotics',  '250-500',   TRUE)
ON CONFLICT (name) DO NOTHING;

-- ====================================================================
-- DONE. Verify tables:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
-- ====================================================================
