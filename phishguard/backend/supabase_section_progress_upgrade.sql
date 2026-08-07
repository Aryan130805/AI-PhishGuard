-- ====================================================================
-- PhishGuard — Section Progress Database Migration Upgrade SQL
-- Run this SQL in Supabase SQL Editor to add section progress tracking
-- ====================================================================

-- 1. Upgrade lesson_assignments table with section progress columns
ALTER TABLE public.lesson_assignments 
ADD COLUMN IF NOT EXISTS completed_sections JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS current_section INT DEFAULT 0;

-- 2. Upgrade lessons table to support custom multi-section structured content
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS sections JSONB;
