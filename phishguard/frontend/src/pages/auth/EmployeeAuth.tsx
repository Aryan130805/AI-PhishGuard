import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, Mail, Key, User, ArrowLeft, Check, CheckCircle2, 
  Search, Building2, AlertCircle, Shield, ChevronDown, Loader2
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../lib/supabase';

interface PublicOrganization {
  id: number;
  name: string;
  logo_url?: string | null;
  industry?: string | null;
  is_verified: boolean;
}

export default function EmployeeAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { login } = useAuth();

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  // Common Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sign Up Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<PublicOrganization | null>(null);

  // Organization Search Dropdown State
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isOrgLoading, setIsOrgLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordStrong = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  // ── Fetch verified organizations from Supabase (debounced) ───────────────────
  const fetchOrganizations = useCallback(async (query: string) => {
    setIsOrgLoading(true);
    try {
      let q = supabase
        .from('organizations')
        .select('id, name, logo_url, industry, is_verified')
        .eq('is_verified', true)
        .order('name', { ascending: true })
        .limit(20);

      if (query.trim()) {
        q = q.ilike('name', `%${query.trim()}%`);
      }

      const { data, error } = await q;
      if (error || !data) {
        setOrganizations([]);
      } else {
        setOrganizations(data as PublicOrganization[]);
      }
    } catch {
      setOrganizations([]);
    } finally {
      setIsOrgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'signup') {
      const timer = setTimeout(() => {
        fetchOrganizations(orgSearchQuery);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [mode, orgSearchQuery, fetchOrganizations]);

  // Click outside listener for org dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for organization dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOrgDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOrgDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < organizations.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : organizations.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < organizations.length) {
        selectOrg(organizations[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOrgDropdownOpen(false);
    }
  };

  const selectOrg = (org: PublicOrganization) => {
    setSelectedOrg(org);
    setOrgSearchQuery(org.name);
    setIsOrgDropdownOpen(false);
  };

  // Handle Login submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.ok) {
      addToast({ title: 'Welcome Back!', description: 'Logged into Employee Portal.', type: 'success' });
      navigate('/dashboard', { replace: true });
    } else {
      addToast({ title: 'Login Failed', description: result.detail || 'Invalid credentials.', type: 'error' });
    }
  };

  // Handle Sign Up submit
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email || !password) {
      addToast({ title: 'Missing Fields', description: 'Please complete all required fields.', type: 'error' });
      return;
    }

    if (!selectedOrg) {
      addToast({ 
        title: 'Organization Required', 
        description: 'Please select a verified organization from the dropdown.', 
        type: 'error' 
      });
      setIsOrgDropdownOpen(true);
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
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role: 'employee',
          },
        },
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

      // 2. Get employee role id
      let roleId: number | null = null;
      const { data: roleRow } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'employee')
        .single();
      if (roleRow) roleId = (roleRow as { id: number }).id;

      // 3. Create user profile row linking auth uid -> org
      await supabase.from('users').insert({
        supabase_uid: supabaseUid,
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        organization_id: selectedOrg.id,
        is_admin: false,
        is_active: true,
        role_id: roleId,
      });

      addToast({ title: 'Account Created! 🎉', description: 'Logging you in automatically...', type: 'success' });

      // 4. Auto login
      const loginResult = await login(email.trim(), password);
      setIsLoading(false);

      if (loginResult.ok) {
        navigate('/dashboard', { replace: true });
      } else {
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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top Floating Glassmorphism Header Navigation */}
      <div className="sticky top-0 z-50 w-full pt-3.5 pb-2 px-3 sm:px-6 transition-all duration-300">
        <header className="max-w-4xl mx-auto rounded-2xl sm:rounded-3xl border border-white/15 bg-slate-900/40 backdrop-blur-2xl backdrop-saturate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] ring-1 ring-white/10 px-5 py-3 flex items-center justify-between hover:border-emerald-500/40 hover:bg-slate-900/50 transition-all duration-300">
          <button
            onClick={() => navigate('/portal')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-semibold transition-all backdrop-blur-md group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to Portal Selection
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
              <Shield size={18} />
            </div>
            <span className="font-bold text-sm text-white tracking-tight">
              Employee<span className="text-emerald-400">Portal</span>
            </span>
          </div>
        </header>
      </div>

      {/* Main Authentication Card */}
      <main className="relative z-10 max-w-md w-full mx-auto my-8">
        
        {/* Switch Mode Tabs */}
        <div className="flex rounded-2xl bg-slate-900/80 border border-slate-800 p-1.5 mb-6 backdrop-blur-xl">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
              mode === 'signin'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Employee Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
              mode === 'signup'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/70 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl relative">
          
          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-2xl mb-3 border border-emerald-500/20 shadow-md shadow-emerald-500/10">
              <Users size={24} />
            </div>
            <h2 className="text-2xl font-black text-white">
              {mode === 'signin' ? 'Employee Login' : 'Employee Registration'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'signin'
                ? 'Enter your organizational credentials to access training & security score.'
                : 'Register under your verified organization.'}
            </p>
          </div>

          {/* ── Employee Sign In Form ── */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail size={13} className="text-emerald-400" /> Work Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Key size={13} className="text-emerald-400" /> Password
                  </label>
                  <button
                    type="button"
                    onClick={() => addToast({ title: 'Forgot Password', description: 'Contact your company admin to reset your credentials.', type: 'info' })}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
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
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all border border-emerald-400/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In as Employee</span>
                )}
              </button>

              {/* Quick Demo Accounts Helper */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Demo Employee Accounts (Click to Fill)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setEmail('alice.smith@acme.com'); setPassword('employeepassword123'); }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-400 font-medium transition-colors"
                  >
                    alice.smith@acme.com
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('tony.stark@stark.com'); setPassword('employeepassword123'); }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-400 font-medium transition-colors"
                  >
                    tony.stark@stark.com
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('sarah.connor@cyberdyne.com'); setPassword('employeepassword123'); }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-400 font-medium transition-colors"
                  >
                    sarah.connor@cyberdyne.com
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ── Employee Sign Up Form ── */
            <form onSubmit={handleSignUp} className="space-y-4">
              
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User size={13} className="text-emerald-400" /> First Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User size={13} className="text-emerald-400" /> Last Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail size={13} className="text-emerald-400" /> Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="jane.doe@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              {/* ── NEW: Searchable Organization Dropdown ── */}
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-emerald-400" /> Select Organization <span className="text-emerald-400">*</span>
                  </span>
                  {selectedOrg && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={11} /> Verified
                    </span>
                  )}
                </label>

                {/* Custom Search Input trigger */}
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search verified organization..."
                    value={orgSearchQuery}
                    onChange={(e) => {
                      setOrgSearchQuery(e.target.value);
                      setSelectedOrg(null);
                      setIsOrgDropdownOpen(true);
                    }}
                    onFocus={() => setIsOrgDropdownOpen(true)}
                    onKeyDown={handleKeyDown}
                    className={`w-full pl-9 pr-9 py-2.5 bg-slate-950 border ${
                      selectedOrg ? 'border-emerald-500/80 ring-1 ring-emerald-500/50' : 'border-slate-800'
                    } rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all`}
                  />
                  {isOrgLoading ? (
                    <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                  ) : (
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  )}
                </div>

                {/* Dropdown Menu Popup */}
                {isOrgDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-1.5 space-y-1">
                    {isOrgLoading && organizations.length === 0 ? (
                      /* Skeleton Loaders */
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-slate-800/60 rounded animate-pulse w-3/4" />
                        <div className="h-4 bg-slate-800/60 rounded animate-pulse w-1/2" />
                      </div>
                    ) : organizations.length > 0 ? (
                      organizations.map((org, index) => {
                        const isSelected = selectedOrg?.id === org.id;
                        const isHighlighted = highlightedIndex === index;
                        return (
                          <div
                            key={org.id}
                            onClick={() => selectOrg(org)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                              isSelected || isHighlighted
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'text-slate-200 hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {/* Logo or Fallback Badge */}
                              {org.logo_url ? (
                                <img src={org.logo_url} alt={org.name} className="w-5 h-5 rounded object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                                  {org.name.charAt(0)}
                                </div>
                              )}
                              <span className="font-semibold truncate">{org.name}</span>
                            </div>

                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex-shrink-0">
                              <Check size={10} /> Verified
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      /* Organization Not Found Helper */
                      <div className="p-4 text-center space-y-1">
                        <AlertCircle size={18} className="mx-auto text-amber-400" />
                        <p className="text-xs font-semibold text-slate-300">Can't find your organization?</p>
                        <p className="text-[11px] text-slate-400">
                          Contact your administrator or ask them to register your organization first.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Key size={13} className="text-emerald-400" /> Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              {/* Password Strength Validation Indicator */}
              {password && (
                <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <CheckCircle2 size={12} /> Min 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <CheckCircle2 size={12} /> 1 Uppercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <CheckCircle2 size={12} /> 1 Number
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <CheckCircle2 size={12} /> 1 Special character
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Key size={13} className="text-emerald-400" /> Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all border border-emerald-400/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Employee Account</span>
                )}
              </button>
            </form>
          )}

          {/* Footer toggle prompt */}
          <div className="text-center mt-6 pt-4 border-t border-slate-800/80">
            {mode === 'signin' ? (
              <p className="text-xs text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline transition-colors"
                >
                  Create Employee Account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline transition-colors"
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
        © {new Date().getFullYear()} PhishGuard · Enterprise Security Awareness
      </footer>
    </div>
  );
}
