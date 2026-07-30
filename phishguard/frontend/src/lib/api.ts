/**
 * Central API utility for PhishGuard frontend.
 *
 * All backend requests go through this module.
 * In development, Vite proxies `/api/*` → `http://localhost:8000/*`.
 * In production, set VITE_API_BASE_URL in your build environment.
 */

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE = 
  import.meta.env.VITE_API_BASE_URL || 
  (isLocalhost ? 'http://localhost:8000' : '/api');

/**
 * Wrapper around fetch that:
 *  - Prepends the API base URL
 *  - Sends credentials (cookies) on every request
 *  - Attaches an Authorization header when an `employee_token` is stored in localStorage
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('employee_token');

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set Content-Type for JSON bodies automatically
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = path.startsWith('http://') || path.startsWith('https://') 
    ? path 
    : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

