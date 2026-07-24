import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { apiFetch } from './lib/api';
import type { User, Session } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string | number;
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
   * Hybrid login handler:
   * 1. Tries local backend API (/auth/login) first (for local dev SQLite)
   * 2. Falls back to Supabase Auth if backend is unreachable or not using local auth
   */
  login: (email: string, password: string) => Promise<{ ok: boolean; role: UserRole; detail?: string }>;
  logout: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchSupabaseProfile(supabaseUid: string, email?: string): Promise<AuthUser | null> {
  try {
    // 1. Query by supabase_uid
    let { data } = await supabase
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
      .maybeSingle();

    // 2. Fallback query by email
    if (!data && email) {
      const res = await supabase
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
        .eq('email', email)
        .maybeSingle();
      data = res.data;
    }

    if (data) {
      const isAdminFlag = data.is_admin ?? (email ? email.toLowerCase().includes('admin') : false);
      return {
        id: data.id,
        email: data.email,
        is_admin: isAdminFlag,
        is_active: data.is_active ?? true,
        organization_name: (data.organizations as { name?: string })?.name ?? undefined,
        department_name: (data.departments as { name?: string })?.name ?? undefined,
        role_name: (data.roles as { name?: string })?.name ?? undefined,
      };
    }
  } catch (err) {
    console.warn('[Auth] fetchSupabaseProfile error:', err);
  }

  // 3. Last fallback if database profile row is missing
  if (email) {
    const isAdminEmail = email.toLowerCase().includes('admin');
    return {
      id: supabaseUid,
      email: email,
      is_admin: isAdminEmail,
      is_active: true,
    };
  }

  return null;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  // Load cached user from localStorage immediately to avoid flicker or logout on tab switch
  const [user, setUser] = useState<AuthUser | null>(() => {
    const cached = localStorage.getItem('pg_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // ── Derive role from user object ───────────────────────────────────────────
  const role: UserRole = user === null ? null : user.is_admin ? 'admin' : 'employee';
  const isAdmin = role === 'admin';

  // ── Session bootstrap — runs once on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Check local backend session if token exists
        const token = localStorage.getItem('employee_token');
        if (token) {
          const res = await apiFetch('/users/me').catch(() => null);
          if (res && res.ok) {
            const data: AuthUser = await res.json();
            if (!cancelled) {
              setUser(data);
              localStorage.setItem('pg_user', JSON.stringify(data));
              setIsLoading(false);
              return;
            }
          }
        }

        // 2. Check Supabase session
        const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const s = data?.session ?? null;
        if (cancelled) return;

        setSession(s);
        setSupabaseUser(s?.user ?? null);

        if (s?.user) {
          const profile = await fetchSupabaseProfile(s.user.id, s.user.email);
          if (!cancelled && profile) {
            setUser(profile);
            localStorage.setItem('pg_user', JSON.stringify(profile));
          }
        }
      } catch (err) {
        console.warn('[Auth] Session check error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Listen for auth state changes — ONLY react to explicit SIGNED_OUT or new SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (cancelled) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setSupabaseUser(null);
          localStorage.removeItem('pg_user');
          localStorage.removeItem('employee_token');
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' && s?.user) {
          setSession(s);
          setSupabaseUser(s.user);
          const profile = await fetchSupabaseProfile(s.user.id, s.user.email);
          if (!cancelled && profile) {
            setUser(profile);
            localStorage.setItem('pg_user', JSON.stringify(profile));
          }
        }
        setIsLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── Hybrid Login (Local Backend First → Supabase Auth Second) ───────────────
  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; role: UserRole; detail?: string }> => {
    const trimmedEmail = email.trim();

    // 1. Try Local Backend API
    try {
      const loginRes = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, password }),
      }).catch(() => null);

      if (loginRes && loginRes.ok) {
        const loginData = await loginRes.json().catch(() => ({}));
        if (loginData.access_token) {
          localStorage.setItem('employee_token', loginData.access_token);
        }

        const meRes = await apiFetch('/users/me').catch(() => null);
        if (meRes && meRes.ok) {
          const userData: AuthUser = await meRes.json();
          setUser(userData);
          localStorage.setItem('pg_user', JSON.stringify(userData));
          const derivedRole: UserRole = userData.is_admin ? 'admin' : 'employee';
          return { ok: true, role: derivedRole };
        }
      }
    } catch {
      // Local backend unavailable or failed, try Supabase next
    }

    // 2. Try Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error || !data.user) {
        return { ok: false, role: null, detail: error?.message ?? 'Invalid credentials.' };
      }

      if (data.session?.access_token) {
        localStorage.setItem('employee_token', data.session.access_token);
      }

      const profile = await fetchSupabaseProfile(data.user.id, trimmedEmail);
      if (profile) {
        setUser(profile);
        localStorage.setItem('pg_user', JSON.stringify(profile));
        const derivedRole: UserRole = profile.is_admin ? 'admin' : 'employee';
        return { ok: true, role: derivedRole };
      }

      // Fallback user object
      const isAdminEmail = trimmedEmail.toLowerCase().includes('admin');
      const fallbackUser: AuthUser = {
        id: data.user.id,
        email: trimmedEmail,
        is_admin: isAdminEmail,
        is_active: true,
      };
      setUser(fallbackUser);
      localStorage.setItem('pg_user', JSON.stringify(fallbackUser));
      return { ok: true, role: isAdminEmail ? 'admin' : 'employee' };
    } catch (err) {
      return { ok: false, role: null, detail: 'Could not connect to authentication server.' };
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
      await supabase.auth.signOut().catch(() => {});
    } catch {
      // Best effort
    }
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
