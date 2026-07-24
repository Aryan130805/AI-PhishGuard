import { createClient } from '@supabase/supabase-js';

// Supabase Configuration for Project ID: ezjmrpdqgiicfprkgadi
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ezjmrpdqgiicfprkgadi.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const getSupabaseConfigStatus = () => {
  return {
    projectId: 'ezjmrpdqgiicfprkgadi',
    url: SUPABASE_URL,
    hasAnonKey: Boolean(SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== ''),
  };
};
