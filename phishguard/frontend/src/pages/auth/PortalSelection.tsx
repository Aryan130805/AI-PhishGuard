import { useNavigate } from 'react-router-dom';
import { Shield, Users, Building2, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';

const employeeFeatures = [
  'View security dashboard',
  'Complete awareness training',
  'Take phishing simulations',
  'View personal security score',
];

const orgFeatures = [
  'Manage employees',
  'Launch phishing campaigns',
  'Monitor organization risk',
  'View analytics & reports',
];

export default function PortalSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500 selection:text-white flex flex-col justify-between px-4 py-8 sm:py-12 relative">
      {/* Ambient background glowing orbs & mesh grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[550px] w-[550px] rounded-full bg-emerald-500/10 blur-[140px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-[550px] w-[550px] rounded-full bg-blue-500/10 blur-[140px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[750px] rounded-full bg-indigo-500/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Top Floating Glassmorphism Header */}
      <div className="sticky top-0 z-50 w-full pt-3.5 pb-2 px-3 sm:px-6 transition-all duration-300">
        <header className="max-w-5xl mx-auto rounded-2xl sm:rounded-3xl border border-white/15 bg-slate-900/40 backdrop-blur-2xl backdrop-saturate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] ring-1 ring-white/10 px-5 py-3 flex items-center justify-between hover:border-white/30 hover:bg-slate-900/50 transition-all duration-300">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-semibold transition-all duration-200 backdrop-blur-md"
          >
            <ArrowLeft size={14} />
            Back to Home
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30 border border-blue-400/30">
              <Shield size={20} className="fill-blue-200/20" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Phish<span className="text-blue-400">Guard</span>
            </span>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 text-center mb-10 sm:mb-14 space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
          <span>Enterprise Portal Gateway</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Welcome Back
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Choose how you want to access the platform.
        </p>
      </div>

      {/* Portal Selection Cards */}
      <div className="relative z-10 w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 px-2">

        {/* ── Employee Portal Card ── */}
        <div
          onClick={() => navigate('/auth/employee')}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => e.key === 'Enter' && navigate('/auth/employee')}
          className="group relative cursor-pointer rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 backdrop-blur-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:border-emerald-500/60 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1.5 hover:scale-[1.015] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {/* Animated gradient border glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Glowing Top Accent Line */}
          <div className="absolute top-0 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/0 group-hover:via-emerald-500/80 to-transparent transition-all duration-500" />

          <div>
            {/* Top Bar with Icon & Badge */}
            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50 group-hover:scale-110 transition-all duration-300 shadow-lg shadow-emerald-500/10">
                <Users size={32} className="text-emerald-400" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Employee Access
              </span>
            </div>

            {/* Title & Description */}
            <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-emerald-300 transition-colors mb-3">
              Employee Portal
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Access your security dashboard, training modules, and phishing defense tools.
            </p>

            {/* Feature Description List */}
            <ul className="space-y-3 mb-8">
              {employeeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 group-hover:text-white transition-colors">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Primary CTA Button */}
          <button
            type="button"
            className="w-full mt-2 py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 group-hover:gap-3 transition-all duration-200 border border-emerald-400/20"
          >
            <span>Continue as Employee</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>

        {/* ── Organization Portal Card ── */}
        <div
          onClick={() => navigate('/auth/organization')}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => e.key === 'Enter' && navigate('/auth/organization')}
          className="group relative cursor-pointer rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 backdrop-blur-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:border-blue-500/60 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1.5 hover:scale-[1.015] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {/* Animated gradient border glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Glowing Top Accent Line */}
          <div className="absolute top-0 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-blue-500/0 group-hover:via-blue-500/80 to-transparent transition-all duration-500" />

          <div>
            {/* Top Bar with Icon & Badge */}
            <div className="flex items-start justify-between mb-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:border-blue-500/50 group-hover:scale-110 transition-all duration-300 shadow-lg shadow-blue-500/10">
                <Building2 size={32} className="text-blue-400" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                Organization Access
              </span>
            </div>

            {/* Title & Description */}
            <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-blue-300 transition-colors mb-3">
              Organization Portal
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Manage security policy, launch simulated campaigns, and track organization risk metrics.
            </p>

            {/* Feature Description List */}
            <ul className="space-y-3 mb-8">
              {orgFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 group-hover:text-white transition-colors">
                  <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Primary CTA Button */}
          <button
            type="button"
            className="w-full mt-2 py-3.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group-hover:gap-3 transition-all duration-200 border border-blue-400/20"
          >
            <span>Continue as Organization</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>

      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-12 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} PhishGuard · Multi-Tenant Enterprise Security Platform</p>
      </footer>
    </div>
  );
}
