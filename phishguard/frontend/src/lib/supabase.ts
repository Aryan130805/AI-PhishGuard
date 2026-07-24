import { createClient } from '@supabase/supabase-js';

// Supabase Configuration for Project ID: ezjmrpdqgiicfprkgadi
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://ezjmrpdqgiicfprkgadi.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_ANON_KEY) {
  console.warn('[PhishGuard] VITE_SUPABASE_ANON_KEY is not set. Auth will not work.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'phishguard-auth',
  },
});

export const SUPABASE_ANON_KEY_VALUE = SUPABASE_ANON_KEY;
export { SUPABASE_URL };

export const getSupabaseConfigStatus = () => ({
  projectId: 'ezjmrpdqgiicfprkgadi',
  url: SUPABASE_URL,
  hasAnonKey: Boolean(SUPABASE_ANON_KEY),
});
