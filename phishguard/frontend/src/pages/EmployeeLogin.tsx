import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ShieldCheck, Key, Mail, Building, UserPlus, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../AuthContext';

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { login } = useAuth();
  
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('Demo Org');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Redirects based on the authenticated role returned by the backend.
   * Admin credentials -> /admin/dashboard
   * Employee credentials -> / (Employee Dashboard)
   */
  const redirectByRole = (role: 'admin' | 'employee' | null) => {
    if (role === 'admin') {
      addToast({ title: 'Welcome Admin!', description: 'Logged into Admin Portal.', type: 'success' });
      navigate('/admin/dashboard', { replace: true });
    } else {
      addToast({ title: 'Welcome Back!', description: 'Logged into Employee Portal.', type: 'success' });
      navigate('/', { replace: true });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.ok) {
      redirectByRole(result.role);
    } else {
      addToast({ title: 'Login Failed', description: result.detail || 'Invalid credentials.', type: 'error' });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (password !== confirmPassword) {
      addToast({ title: 'Passwords Mismatch', description: 'Password and confirmation do not match.', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          organization_name: organizationName.trim() || 'Demo Org'
        }),
        credentials: 'include'
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setIsLoading(false);
        addToast({ title: 'Registration Failed', description: err.detail || 'Could not create account.', type: 'error' });
        return;
      }

      addToast({ title: 'Account Created!', description: 'Logging you in automatically...', type: 'success' });

      // Automatically sign in after successful registration
      const loginResult = await login(email, password);
      setIsLoading(false);

      if (loginResult.ok) {
        redirectByRole(loginResult.role);
      } else {
        addToast({ title: 'Login Required', description: 'Account registered. Please sign in.', type: 'info' });
        setMode('signin');
      }
    } catch {
      setIsLoading(false);
      addToast({ title: 'Connection Error', description: 'Could not connect to authentication server.', type: 'error' });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] relative overflow-hidden py-8">
      {/* Decorative gradient orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[340px] w-[340px] rounded-full bg-blue-500/10 blur-[90px] pointer-events-none"></div>

      <Card className="max-w-md w-full border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-sm relative z-10 transition-all duration-300 hover:border-blue-500/30">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-blue-500/10 text-blue-400 flex items-center justify-center rounded-xl mb-4 border border-blue-500/20">
            {mode === 'signin' ? <ShieldCheck size={26} /> : <UserPlus size={26} />}
          </div>
          <CardTitle className="text-2xl font-extrabold text-white">
            {mode === 'signin' ? 'PhishGuard Portal Login' : 'Create an Account'}
          </CardTitle>
          <CardDescription className="text-slate-400 mt-1">
            {mode === 'signin'
              ? 'Enter your credentials — system auto-detects your role'
              : 'Register to access phishing simulations and training'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {mode === 'signin' ? (
            /* ── Sign In Form ── */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail size={12} /> Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key size={12} /> Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-colors border border-blue-500/20 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
              >
                <LogIn size={16} />
                {isLoading ? 'Authenticating...' : 'Sign In'}
              </Button>
            </form>
          ) : (
            /* ── Sign Up Form ── */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail size={12} /> Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building size={12} /> Organization Name
                </label>
                <input
                  type="text"
                  placeholder="Demo Org"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key size={12} /> Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key size={12} /> Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition-colors border border-emerald-500/20 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>
          )}

          <div className="relative pt-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900/60 px-2.5 text-slate-500 font-medium">Account Options</span>
            </div>
          </div>

          <div className="text-center">
            {mode === 'signin' ? (
              <p className="text-xs text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline transition-colors"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-bold text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
