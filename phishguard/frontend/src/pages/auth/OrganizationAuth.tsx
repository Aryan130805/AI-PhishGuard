import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2, Mail, Key, Globe, MapPin,
  ArrowLeft, CheckCircle2, Shield, Loader2, Image
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../lib/supabase';

const INDUSTRIES = [
  'Technology & Software',
  'Financial Services & Banking',
  'Healthcare & Pharmaceuticals',
  'Retail & E-commerce',
  'Manufacturing & Industrial',
  'Education & Research',
  'Government & Public Sector',
  'Energy & Utilities',
  'Other / Enterprise'
];

const COMPANY_SIZES = [
  '1-50 employees',
  '51-200 employees',
  '201-1000 employees',
  '1000+ employees'
];

export default function OrganizationAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { login } = useAuth();

  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'signin';
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);

  // Sign In Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Registration Fields
  const [orgName, setOrgName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [companySize, setCompanySize] = useState(COMPANY_SIZES[0]);
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('United States');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordStrong = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  // Handle Organization Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.ok) {
      if (result.role === 'admin') {
        addToast({ title: 'Welcome Admin!', description: 'Logged into Organization Portal.', type: 'success' });
        navigate('/admin/dashboard', { replace: true });
      } else {
        addToast({
          title: 'Access Restricted',
          description: 'This user account belongs to the Employee Portal.',
          type: 'warning'
        });
        navigate('/', { replace: true });
      }
    } else {
      addToast({ title: 'Login Failed', description: result.detail ?? 'Invalid organization credentials.', type: 'error' });
    }
  };

  // Handle Organization Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim() || !email.trim() || !password) {
      addToast({ title: 'Missing Required Fields', description: 'Please complete all required fields.', type: 'error' });
      return;
    }

    if (!agreeTerms) {
      addToast({ title: 'Terms Agreement Required', description: 'Please accept the Terms & Privacy Policy to register.', type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      addToast({ title: 'Password Mismatch', description: 'Password and confirmation do not match.', type: 'error' });
      return;
    }

    if (!isPasswordStrong) {
      addToast({ title: 'Weak Password', description: 'Please meet all password complexity requirements.', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create Supabase Auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { org_name: orgName.trim(), role: 'admin' } },
      });

      if (signUpError || !signUpData.user) {
        setIsLoading(false);
        addToast({
          title: 'Registration Failed',
          description: signUpError?.message ?? 'Could not create account. This email may already be registered.',
          type: 'error',
        });
        return;
      }

      const supabaseUid = signUpData.user.id;

      // 2. Insert organization record
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          industry,
          company_size: companySize,
          website: website.trim() || null,
          country: country.trim() || null,
          state: state.trim() || null,
          city: city.trim() || null,
          logo_url: logoUrl.trim() || null,
          is_verified: false,
        })
        .select('id')
        .single();

      if (orgError || !orgData) {
        setIsLoading(false);
        addToast({
          title: 'Setup Error',
          description: 'Account created but organization setup failed. Please contact support.',
          type: 'error',
        });
        return;
      }

      // 3. Get admin role id
      let roleId: number | null = null;
      const { data: roleRow } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'admin')
        .single();
      if (roleRow) roleId = (roleRow as { id: number }).id;

      // 4. Create user profile linking auth uid → org
      await supabase.from('users').insert({
        supabase_uid: supabaseUid,
        email: email.trim(),
        organization_id: orgData.id,
        is_admin: true,
        is_active: true,
        role_id: roleId,
      });

      // 5. Backend sync call
      await apiFetch('/auth/register-organization', {
        method: 'POST',
        body: JSON.stringify({
          name: orgName.trim(),
          email: email.trim(),
          password,
          industry,
          company_size: companySize,
          website: website.trim() || null,
          country: country.trim() || null,
          state: state.trim() || null,
          city: city.trim() || null,
          logo_url: logoUrl.trim() || null,
          supabase_uid: supabaseUid
        }),
      }).catch(() => null);

      addToast({
        title: 'Organization Registered! 🎉',
        description: 'Logging into your admin dashboard...',
        type: 'success',
      });

      // 5. Auto sign in
      const loginResult = await login(email.trim(), password);
      setIsLoading(false);

      if (loginResult.ok) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        // Supabase may require email confirmation
        addToast({
          title: 'Confirm Your Email',
          description: 'Check your inbox and confirm your email address, then sign in.',
          type: 'info',
        });
        setMode('signin');
      }
    } catch {
      setIsLoading(false);
      addToast({ title: 'Connection Error', description: 'Could not connect to authentication server.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between px-4 py-8 relative">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top Floating Glassmorphism Header Navigation */}
      <div className="sticky top-0 z-50 w-full pt-3.5 pb-2 px-3 sm:px-6 transition-all duration-300">
        <header className="max-w-4xl mx-auto rounded-2xl sm:rounded-3xl border border-slate-800/90 bg-slate-900/75 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl shadow-black/60 ring-1 ring-white/10 px-5 py-3 flex items-center justify-between hover:border-blue-500/30 transition-all duration-300">
          <button
            onClick={() => navigate('/portal')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-semibold transition-all backdrop-blur-md group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to Portal Selection
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Shield size={18} />
            </div>
            <span className="font-bold text-sm text-white tracking-tight">
              Organization<span className="text-blue-400">Portal</span>
            </span>
          </div>
        </header>
      </div>

      {/* Main Authentication Card */}
      <main className="relative z-10 max-w-xl w-full mx-auto my-8">

        {/* Switch Mode Tabs */}
        <div className="flex rounded-2xl bg-slate-900/80 border border-slate-800 p-1.5 mb-6 backdrop-blur-xl">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${mode === 'signin'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            Organization Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${mode === 'register'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            Register Organization
          </button>
        </div>

        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl relative">

          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-blue-500/10 text-blue-400 flex items-center justify-center rounded-2xl mb-3 border border-blue-500/20 shadow-md shadow-blue-500/10">
              <Building2 size={24} />
            </div>
            <h2 className="text-2xl font-black text-white">
              {mode === 'signin' ? 'Organization Login' : 'Register Your Organization'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'signin'
                ? 'Access administration, employee security groups, and phishing campaigns.'
                : 'Set up enterprise phishing protection for your organization.'}
            </p>
          </div>

          {/* ── Organization Login Form ── */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail size={13} className="text-blue-400" /> Organization Admin Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Key size={13} className="text-blue-400" /> Password
                  </label>
                  <button
                    type="button"
                    onClick={() => addToast({ title: 'Forgot Password', description: 'Contact system super-admin or check password recovery email.', type: 'info' })}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all border border-blue-400/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In as Organization</span>
                )}
              </button>

              {/* Quick Demo Credentials Helper */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Demo Accounts (Click to Fill)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setEmail('admin@demo.com'); setPassword('adminpassword123'); }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-blue-400 font-medium transition-colors"
                  >
                    admin@demo.com
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('admin@acme.com'); setPassword('adminpassword123'); }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-blue-400 font-medium transition-colors"
                  >
                    admin@acme.com
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('admin@stark.com'); setPassword('adminpassword123'); }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-blue-400 font-medium transition-colors"
                  >
                    admin@stark.com
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ── Organization Registration Form ── */
            <form onSubmit={handleRegister} className="space-y-4">

              {/* Org Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-400" /> Organization Name <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="CyberShield Technologies"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Admin Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail size={13} className="text-blue-400" /> Admin Email Address <span className="text-blue-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@cybershield.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Key size={13} className="text-blue-400" /> Admin Password <span className="text-blue-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Password Strength Validation Indicator */}
              {password && (
                <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-blue-400' : 'text-slate-500'}`}>
                    <CheckCircle2 size={12} /> Min 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-blue-400' : 'text-slate-500'}`}>
                    <CheckCircle2 size={12} /> 1 Uppercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-blue-400' : 'text-slate-500'}`}>
                    <CheckCircle2 size={12} /> 1 Number
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-blue-400' : 'text-slate-500'}`}>
                    <CheckCircle2 size={12} /> 1 Special character
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Key size={13} className="text-blue-400" /> Confirm Password <span className="text-blue-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Industry & Company Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind} className="bg-slate-900 text-white">{ind}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                  >
                    {COMPANY_SIZES.map((sz) => (
                      <option key={sz} value={sz} className="bg-slate-900 text-white">{sz}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Website URL (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Globe size={13} className="text-blue-400" /> Website (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://cybershield.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Location: Country, State, City */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <MapPin size={11} /> Country
                  </label>
                  <input
                    type="text"
                    placeholder="US"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">State</label>
                  <input
                    type="text"
                    placeholder="CA"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">City</label>
                  <input
                    type="text"
                    placeholder="San Jose"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Company Logo URL (Optional with preview) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Image size={13} className="text-blue-400" /> Company Logo URL (optional)
                  </span>
                  {logoUrl && (
                    <span className="text-[10px] text-blue-400">Preview active</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  />
                  {logoUrl && (
                    <div className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-950 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" onError={() => setLogoUrl('')} />
                    </div>
                  )}
                </div>
              </div>

              {/* Checkbox: Terms & Privacy */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    I agree to the <a href="#" className="text-blue-400 underline">Terms of Service</a> and <a href="#" className="text-blue-400 underline">Privacy Policy</a>.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all border border-blue-400/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating Organization...</span>
                  </>
                ) : (
                  <span>Create Organization</span>
                )}
              </button>
            </form>
          )}

          {/* Footer toggle prompt */}
          <div className="text-center mt-6 pt-4 border-t border-slate-800/80">
            {mode === 'signin' ? (
              <p className="text-xs text-slate-400">
                Need to register your organization?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-bold text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  Create Organization
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Already registered your organization?{' '}
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

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500 py-4">
        © {new Date().getFullYear()} PhishGuard · Enterprise Security Administration
      </footer>
    </div>
  );
}
