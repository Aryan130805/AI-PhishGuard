import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { apiFetch } from './lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
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
  role: UserRole;
  isAdmin: boolean;
  /** True while the initial session check is in progress. */
  isLoading: boolean;
  /**
   * Sends credentials to the backend and, on success, fetches the user
   * profile to derive the role. Returns the role string so callers can
   * immediately redirect to the correct portal.
   */
  login: (email: string, password: string) => Promise<{ ok: boolean; role: UserRole; detail?: string }>;
  logout: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// API base is handled centrally via apiFetch (see src/lib/api.ts)

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // start loading until session check resolves

  // ── Derive role from user object (source of truth = backend) ──
  const role: UserRole = user === null ? null : user.is_admin ? 'admin' : 'employee';
  const isAdmin = role === 'admin';

  // ── Session check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/users/me');
        if (!cancelled) {
          if (res.ok) {
            const data: AuthUser = await res.json();
            setUser(data);
          } else {
            // 401 / 403 → no active session
            localStorage.removeItem('employee_token');
            setUser(null);
          }
        }
      } catch {
        // Network error or backend down → treat as unauthenticated
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; role: UserRole; detail?: string }> => {
    try {
      const loginRes = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        const err = await loginRes.json().catch(() => ({}));
        return { ok: false, role: null, detail: err.detail || 'Invalid credentials.' };
      }

      const loginData = await loginRes.json().catch(() => ({}));
      if (loginData.access_token) {
        localStorage.setItem('employee_token', loginData.access_token);
      }

      // After storing token and setting cookies, fetch profile for authoritative role
      const meRes = await apiFetch('/users/me');
      if (!meRes.ok) {
        localStorage.removeItem('employee_token');
        return { ok: false, role: null, detail: 'Authentication succeeded but session could not be verified.' };
      }

      const userData: AuthUser = await meRes.json();
      setUser(userData);

      const derivedRole: UserRole = userData.is_admin ? 'admin' : 'employee';
      return { ok: true, role: derivedRole };
    } catch {
      return { ok: false, role: null, detail: 'Could not connect to the backend server.' };
    }
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Best effort
    }
    localStorage.removeItem('employee_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, isAdmin, isLoading, login, logout }}>
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
