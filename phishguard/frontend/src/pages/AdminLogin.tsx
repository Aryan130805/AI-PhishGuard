import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Shield, Key, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.ok) {
      if (result.role === 'admin') {
        addToast({ title: 'Welcome Admin!', description: 'Logged in successfully.', type: 'success' });
        navigate('/admin/dashboard', { replace: true });
      } else {
        // Credentials are valid but this user is not an admin — deny access
        addToast({
          title: 'Access Denied',
          description: 'This portal requires admin privileges.',
          type: 'error'
        });
        await supabase.auth.signOut().catch(() => {});
      }
    } else {
      addToast({ title: 'Login Failed', description: result.detail || 'Invalid credentials.', type: 'error' });
    }
  };

  const handleAutoSeed = async () => {
    setIsLoading(true);
    const testAdmin = {
      email: 'admin@phishguard.com',
      password: 'AdminPass123!',
      organization_name: 'PhishGuard Sandbox'
    };

    try {
      // 1. Register test admin in Supabase Auth
      const { data: supaData } = await supabase.auth.signUp({
        email: testAdmin.email,
        password: testAdmin.password,
        options: { data: { role: 'admin', org_name: testAdmin.organization_name } }
      }).catch(() => ({ data: null }));

      const supabaseUid = supaData?.user?.id;

      // 2. Register profile in backend database
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...testAdmin, supabase_uid: supabaseUid }),
      }).catch(() => {});
    } catch { /* ignore */ }

    // 3. Log in via context
    const result = await login(testAdmin.email, testAdmin.password);
    setIsLoading(false);

    if (result.ok && result.role === 'admin') {
      addToast({ title: 'Admin Seeding Active', description: 'Logged in as test admin.', type: 'success' });
      navigate('/admin/dashboard', { replace: true });
    } else if (result.ok) {
      addToast({ title: 'Access Denied', description: 'Seeded user does not have admin privileges.', type: 'error' });
    } else {
      addToast({ title: 'Auto Login Failed', description: result.detail || 'Failed to authenticate seeded admin.', type: 'error' });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-blue-500/5 blur-[80px] pointer-events-none"></div>

      <Card className="max-w-md w-full border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-sm relative z-10 transition-all duration-300 hover:border-blue-500/30">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-blue-500/10 text-blue-400 flex items-center justify-center rounded-xl mb-4 border border-blue-500/20">
            <Shield size={24} />
          </div>
          <CardTitle className="text-2xl font-extrabold text-white">Admin Login</CardTitle>
          <CardDescription className="text-slate-400 mt-1">Authenticate to access the admin portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail size={12} /> Email Address
              </label>
              <input
                type="email"
                required
                placeholder="admin@phishguard.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full bg-blue-600 hover:bg-blue-500 font-bold tracking-wide mt-2 text-white shadow-lg shadow-blue-500/10"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">Developer Sandbox</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full border-slate-850 hover:bg-slate-850 text-slate-300 hover:text-white font-semibold flex items-center justify-center gap-2"
            onClick={handleAutoSeed}
            disabled={isLoading}
          >
            Seed Test Admin &amp; Login
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-xs text-slate-400 hover:text-blue-400 underline transition-colors"
            >
              Switch to Employee Login Portal
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
