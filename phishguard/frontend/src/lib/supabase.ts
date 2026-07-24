import { createClient } from '@supabase/supabase-js';

// Supabase Configuration for Project ID: ezjmrpdqgiicfprkgadi
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://ezjmrpdqgiicfprkgadi.supabase.co';

const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6am1ycGRxZ2lpY2ZwcmtnYWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NzAyNjUsImV4cCI6MjEwMDQ0NjI2NX0.h-Y4cbRDEamIrieqqrOK-g95tQMsA9et7OeChx9TcSU';

export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'phishguard-auth',
  },
});

export const SUPABASE_ANON_KEY_VALUE = SUPABASE_ANON_KEY;

export const getSupabaseConfigStatus = () => ({
  projectId: 'ezjmrpdqgiicfprkgadi',
  url: SUPABASE_URL,
  hasAnonKey: Boolean(SUPABASE_ANON_KEY),
});
