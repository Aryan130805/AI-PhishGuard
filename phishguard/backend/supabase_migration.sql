-- ====================================================================
-- PhishGuard Supabase Schema Migration
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- Project: ezjmrpdqgiicfprkgadi
-- ====================================================================

-- STEP 1: Add supabase_uid column to users table (links Supabase Auth → profile)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS supabase_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 2: Make hashed_password nullable (Supabase Auth manages passwords)
ALTER TABLE public.users
  ALTER COLUMN hashed_password DROP NOT NULL;

-- STEP 3: Make role_id nullable (we set it after fetching role)
ALTER TABLE public.users
  ALTER COLUMN role_id DROP NOT NULL;

-- STEP 4: Ensure default seed roles exist
INSERT INTO public.roles (name, description)
VALUES
  ('admin', 'Organization Administrator'),
  ('employee', 'Standard Employee')
ON CONFLICT (name) DO NOTHING;

-- ====================================================================
-- STEP 5: Row Level Security Policies
-- Allow anon users to READ organizations (for the searchable dropdown)
-- Allow authenticated users to INSERT their own profile
-- ====================================================================

-- Enable RLS on tables (if not already enabled)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies first
DROP POLICY IF EXISTS "anon_read_organizations" ON public.organizations;
DROP POLICY IF EXISTS "auth_insert_organizations" ON public.organizations;
DROP POLICY IF EXISTS "auth_read_own_org" ON public.organizations;
DROP POLICY IF EXISTS "anon_read_roles" ON public.roles;
DROP POLICY IF EXISTS "auth_insert_own_user" ON public.users;
DROP POLICY IF EXISTS "auth_read_own_user" ON public.users;
DROP POLICY IF EXISTS "anon_read_departments" ON public.departments;

-- Organizations: anyone can read (needed for org dropdown on signup)
CREATE POLICY "anon_read_organizations"
  ON public.organizations FOR SELECT
  USING (true);

-- Organizations: authenticated users can insert (registration)
CREATE POLICY "auth_insert_organizations"
  ON public.organizations FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Roles: anyone can read (needed to fetch role ID on signup)
CREATE POLICY "anon_read_roles"
  ON public.roles FOR SELECT
  USING (true);

-- Departments: anyone can read
CREATE POLICY "anon_read_departments"
  ON public.departments FOR SELECT
  USING (true);

-- Users: authenticated users can insert their own profile
CREATE POLICY "auth_insert_own_user"
  ON public.users FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Users: authenticated users can read their own profile
CREATE POLICY "auth_read_own_user"
  ON public.users FOR SELECT
  TO authenticated
  USING (supabase_uid = auth.uid());

-- Users: authenticated users can update their own profile
CREATE POLICY "auth_update_own_user"
  ON public.users FOR UPDATE
  TO authenticated
  USING (supabase_uid = auth.uid());

-- ====================================================================
-- DONE — Verify with:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
-- WHERE table_name = 'users' ORDER BY ordinal_position;
-- ====================================================================
