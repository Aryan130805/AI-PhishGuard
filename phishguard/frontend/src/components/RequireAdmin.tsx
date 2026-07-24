import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

/**
 * RequireAdmin — Admin route guard.
 *
 * Blocks all /admin/* routes until the initial session check resolves.
 *
 * Gate logic:
 *   1. isLoading → show spinner (never redirect before auth resolves).
 *   2. !user     → not authenticated → redirect to /auth/organization.
 *   3. !isAdmin  → authenticated but not an admin → redirect to /dashboard.
 *   4. isAdmin   → allow through.
 */
export default function RequireAdmin() {
  const { user, isAdmin, isLoading } = useAuth();

  // Wait for session check — prevents rendering Admin UI before auth resolves.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Verifying admin session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Not authenticated at all — send to organization login portal
    return <Navigate to="/auth/organization" replace />;
  }

  if (!isAdmin) {
    // Authenticated but not an admin — send to employee dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Authenticated admin — render the admin layout and its children
  return <Outlet />;
}
