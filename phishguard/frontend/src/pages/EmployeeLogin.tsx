import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { UserCheck, Key, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (res.ok) {
        addToast({ title: 'Welcome Back!', description: 'Logged in successfully.', type: 'success' });
        navigate('/employee/dashboard');
      } else {
        const errorData = await res.json();
        addToast({ title: 'Login Failed', description: errorData.detail || 'Invalid credentials.', type: 'error' });
      }
    } catch (err) {
      addToast({ title: 'Network Error', description: 'Could not connect to the backend server.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSeed = async () => {
    setIsLoading(true);
    const testUser = {
      email: 'employee@phishguard.com',
      password: 'EmployeePass123!',
      organization_name: 'PhishGuard Sandbox'
    };

    try {
      // 1. Try to register
      await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
        credentials: 'include'
      });

      // 2. Try to log in
      const res = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email, password: testUser.password }),
        credentials: 'include'
      });

      if (res.ok) {
        addToast({ title: 'Sandbox Mode Active', description: 'Logged in as test employee user.', type: 'success' });
        navigate('/employee/dashboard');
      } else {
        addToast({ title: 'Auto Login Failed', description: 'Failed to authenticate seeded user.', type: 'error' });
      }
    } catch (err) {
      addToast({ title: 'Connection Error', description: 'Could not communicate with training API.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none"></div>

      <Card className="max-w-md w-full border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-sm relative z-10 transition-all duration-300 hover:border-emerald-500/30">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-xl mb-4 border border-emerald-500/20">
            <UserCheck size={24} />
          </div>
          <CardTitle className="text-2xl font-extrabold text-white">Employee Login</CardTitle>
          <CardDescription className="text-slate-400 mt-1">Authenticate to access your cybersecurity curriculum</CardDescription>
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
                placeholder="e.g. employee@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition-colors border border-emerald-500/20 focus:ring-emerald-500"
            >
              {isLoading ? 'Processing...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900/40 px-2 text-slate-500">Or Sandbox Mode</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] text-center text-slate-400">
              For evaluation, register and login instantly using a preset sandbox employee account.
            </p>
            <Button
              onClick={handleAutoSeed}
              disabled={isLoading}
              variant="outline"
              className="w-full border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5 hover:text-emerald-300 font-semibold"
            >
              🚀 Launch with Sandbox Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
