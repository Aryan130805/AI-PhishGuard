import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

/**
 * RequireAuth — Employee route guard.
 *
 * Blocks access to protected employee routes until the initial session check
 * resolves. If the user is not authenticated, redirects to /portal.
 * Authenticated users (any role) are allowed through.
 */
export default function RequireAuth() {
  const { user, isLoading } = useAuth();

  // Wait for the session check to complete before making any redirect decisions.
  // This prevents a brief flash-redirect when the app starts with a valid cookie.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal" replace />;
  }

  return <Outlet />;
}
