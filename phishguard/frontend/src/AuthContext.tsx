import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from './lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  organization_name?: string;
  department_name?: string;
  role_name?: string;
}

export type UserRole = 'admin' | 'employee' | null;

interface AuthContextValue {
  user: AuthUser | null;
  supabaseUser: User | null;
  session: Session | null;
  role: UserRole;
  isAdmin: boolean;
  /** True while the initial session check is in progress. */
  isLoading: boolean;
  /**
   * Logs in via Supabase Auth then reads the profile from the `users` table
   * to determine the role. Returns the role so callers can redirect.
   */
  login: (email: string, password: string) => Promise<{ ok: boolean; role: UserRole; detail?: string }>;
  logout: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchProfile(supabaseUid: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      is_admin,
      is_active,
      organizations ( name ),
      departments ( name ),
      roles ( name )
    `)
    .eq('supabase_uid', supabaseUid)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    is_admin: data.is_admin ?? false,
    is_active: data.is_active ?? true,
    organization_name: (data.organizations as { name?: string })?.name ?? undefined,
    department_name: (data.departments as { name?: string })?.name ?? undefined,
    role_name: (data.roles as { name?: string })?.name ?? undefined,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Derive role from user object ───────────────────────────────────────────
  const role: UserRole = user === null ? null : user.is_admin ? 'admin' : 'employee';
  const isAdmin = role === 'admin';

  // ── Session bootstrap — runs once on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const s = data?.session ?? null;
        if (cancelled) return;
        setSession(s);
        setSupabaseUser(s?.user ?? null);

        if (s?.user) {
          // Check localStorage for role first (fast path)
          const cached = localStorage.getItem('pg_user');
          if (cached) {
            try { setUser(JSON.parse(cached)); } catch { /* ignore */ }
          }
          const profile = await fetchProfile(s.user.id);
          if (!cancelled) {
            setUser(profile);
            if (profile) localStorage.setItem('pg_user', JSON.stringify(profile));
          }
        } else {
          localStorage.removeItem('pg_user');
          localStorage.removeItem('employee_token');
        }
      } catch (err) {
        console.warn('Auth session check error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Listen for auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (cancelled) return;
        setSession(s);
        setSupabaseUser(s?.user ?? null);

        if (s?.user) {
          const profile = await fetchProfile(s.user.id);
          setUser(profile);
          if (profile) localStorage.setItem('pg_user', JSON.stringify(profile));
        } else {
          setUser(null);
          localStorage.removeItem('pg_user');
          localStorage.removeItem('employee_token');
        }
        setIsLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; role: UserRole; detail?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        return { ok: false, role: null, detail: error?.message ?? 'Invalid credentials.' };
      }

      // Store access token for any legacy apiFetch calls still referencing local backend
      if (data.session?.access_token) {
        localStorage.setItem('employee_token', data.session.access_token);
      }

      const profile = await fetchProfile(data.user.id);
      if (!profile) {
        // Supabase Auth succeeded but no profile row — treat as employee with no org
        const minimal: AuthUser = {
          id: data.user.id,
          email: data.user.email ?? email,
          is_admin: false,
          is_active: true,
        };
        setUser(minimal);
        return { ok: true, role: 'employee' };
      }

      setUser(profile);
      localStorage.setItem('pg_user', JSON.stringify(profile));
      const derivedRole: UserRole = profile.is_admin ? 'admin' : 'employee';
      return { ok: true, role: derivedRole };
    } catch (err) {
      return { ok: false, role: null, detail: 'Could not connect to authentication server.' };
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => { /* best effort */ });
    localStorage.removeItem('employee_token');
    localStorage.removeItem('pg_user');
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, supabaseUser, session, role, isAdmin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
