-- ====================================================================
-- PhishGuard Supabase Database Schema & Logic Setup
-- Project ID: ezjmrpdqgiicfprkgadi
-- Target URL: https://ezjmrpdqgiicfprkgadi.supabase.co
-- ====================================================================

-- 1. Create Custom Enum Types
DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE email_event_type AS ENUM ('sent', 'delivered', 'opened', 'clicked', 'attachment_downloaded', 'credentials_submitted', 'reported', 'ignored');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    website VARCHAR(255),
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_org_name UNIQUE (organization_id, name)
);

-- 4. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    needs_advanced_training BOOLEAN DEFAULT FALSE NOT NULL,
    suggested_next_difficulty VARCHAR(50) DEFAULT 'easy' NOT NULL,
    organization_id INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    department_id INT REFERENCES public.departments(id) ON DELETE SET NULL,
    role_id INT NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    theme VARCHAR(100) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    language VARCHAR(10) NOT NULL,
    department_id INT REFERENCES public.departments(id) ON DELETE SET NULL,
    status campaign_status DEFAULT 'draft' NOT NULL,
    scheduled_at TIMESTAMPTZ,
    created_by INT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Email Templates Table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id SERIAL PRIMARY KEY,
    campaign_id INT REFERENCES public.campaigns(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    cta_text VARCHAR(100) NOT NULL,
    fake_url VARCHAR(255) NOT NULL,
    ai_generated BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT FALSE
);

-- 9. Campaign Targets Table
CREATE TABLE IF NOT EXISTS public.campaign_targets (
    id SERIAL PRIMARY KEY,
    campaign_id INT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tracking_token VARCHAR(255) UNIQUE NOT NULL
);

-- 10. Email Events Table
CREATE TABLE IF NOT EXISTS public.email_events (
    id SERIAL PRIMARY KEY,
    campaign_id INT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type email_event_type NOT NULL,
    occurred_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- 11. Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
    id SERIAL PRIMARY KEY,
    topic VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    ai_generated BOOLEAN DEFAULT FALSE
);

-- 12. Quizzes Table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id SERIAL PRIMARY KEY,
    lesson_id INT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    questions JSONB NOT NULL
);

-- 13. Quiz Attempts Table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score INT NOT NULL,
    passed BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Certificates Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lesson_id INT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    pdf_path TEXT NOT NULL
);

-- 15. Lesson Assignments Table
CREATE TABLE IF NOT EXISTS public.lesson_assignments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lesson_id INT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

-- 16. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type VARCHAR(100) DEFAULT 'executive_summary' NOT NULL,
    generated_by INT REFERENCES public.users(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    job_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    error_message TEXT,
    date_from TIMESTAMPTZ,
    date_to TIMESTAMPTZ,
    department_id INT REFERENCES public.departments(id) ON DELETE SET NULL,
    formats JSONB,
    file_paths JSONB,
    file_path TEXT
);

-- 18. Risk Scores Table
CREATE TABLE IF NOT EXISTS public.risk_scores (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. User Metrics Table
CREATE TABLE IF NOT EXISTS public.user_metrics (
    user_id INT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    click_rate DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    report_rate DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    open_rate DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    avg_time_to_click DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Performance Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS ix_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS ix_users_org ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS ix_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX IF NOT EXISTS ix_email_events_user ON public.email_events(user_id);
CREATE INDEX IF NOT EXISTS ix_email_events_occurred ON public.email_events(occurred_at);
CREATE INDEX IF NOT EXISTS ix_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS ix_risk_scores_user ON public.risk_scores(user_id);

-- ====================================================================
-- Automated Database Logic (Triggers & Functions)
-- ====================================================================

-- Function: Auto-update user metrics whenever a new email event occurs
CREATE OR REPLACE FUNCTION update_user_metrics_func()
RETURNS TRIGGER AS $$
DECLARE
    t_user_id INT;
    v_total INT;
    v_opens INT;
    v_clicks INT;
    v_reports INT;
BEGIN
    t_user_id := NEW.user_id;

    SELECT COUNT(*) INTO v_total FROM public.email_events WHERE user_id = t_user_id;
    SELECT COUNT(*) INTO v_opens FROM public.email_events WHERE user_id = t_user_id AND event_type = 'opened';
    SELECT COUNT(*) INTO v_clicks FROM public.email_events WHERE user_id = t_user_id AND event_type = 'clicked';
    SELECT COUNT(*) INTO v_reports FROM public.email_events WHERE user_id = t_user_id AND event_type = 'reported';

    IF v_total > 0 THEN
        INSERT INTO public.user_metrics (user_id, open_rate, click_rate, report_rate, updated_at)
        VALUES (
            t_user_id,
            ROUND((v_opens::numeric / v_total::numeric) * 100, 2),
            ROUND((v_clicks::numeric / v_total::numeric) * 100, 2),
            ROUND((v_reports::numeric / v_total::numeric) * 100, 2),
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id) DO UPDATE SET
            open_rate = EXCLUDED.open_rate,
            click_rate = EXCLUDED.click_rate,
            report_rate = EXCLUDED.report_rate,
            updated_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_metrics ON public.email_events;
CREATE TRIGGER trg_update_user_metrics
AFTER INSERT ON public.email_events
FOR EACH ROW
EXECUTE FUNCTION update_user_metrics_func();

-- ====================================================================
-- Row Level Security (RLS) Policies for Supabase
-- ====================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Allow public read on verified organizations for registration select
CREATE POLICY "Public Read Verified Orgs" ON public.organizations
    FOR SELECT USING (is_verified = TRUE);

-- Allow authenticated users to read public lessons & quizzes
CREATE POLICY "Public Read Lessons" ON public.lessons FOR SELECT USING (TRUE);
CREATE POLICY "Public Read Quizzes" ON public.quizzes FOR SELECT USING (TRUE);

-- ====================================================================
-- Initial Seed Roles
-- ====================================================================
INSERT INTO public.roles (id, name, description) VALUES
(1, 'admin', 'Organization Administrator'),
(2, 'employee', 'Standard Employee target')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- Security Groups & Join Requests Tables
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.security_groups (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    tier VARCHAR(100) DEFAULT 'Tier 4 (Standard)' NOT NULL,
    tier_number INT DEFAULT 4 NOT NULL,
    description TEXT,
    simulation_frequency VARCHAR(50) DEFAULT 'Bi-weekly',
    simulation_type VARCHAR(255) DEFAULT 'Spear Phishing & Link Verification',
    risk_score INT DEFAULT 15,
    policies JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.group_join_requests (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id INT NOT NULL REFERENCES public.security_groups(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL
);

CREATE TABLE IF NOT EXISTS public.group_members (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    group_id INT NOT NULL REFERENCES public.security_groups(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.department_requests (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    department_id INT NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    request_type VARCHAR(50) DEFAULT 'join' NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


