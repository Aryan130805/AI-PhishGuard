import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, ArrowRight, CheckCircle2, Lock, Sparkles, Zap, 
  BarChart3, Brain, Award, Users, ChevronRight
} from 'lucide-react';

// Hero Heading Intro & Continuous Animation Component
function HeroHeadingAnimation() {
  const [activeIndex, setActiveIndex] = useState<0 | 1>(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion setting
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setReducedMotion(true);
      return;
    }

    const DISPLAY_DURATION = 3000; // 3.0s pause for each headline
    const TRANSITION_DURATION = 2200; // 2.2s smooth ease-out transition

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setActiveIndex((prev) => (prev === 0 ? 1 : 0));

      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, TRANSITION_DURATION);

      return () => clearTimeout(timer);
    }, DISPLAY_DURATION + TRANSITION_DURATION);

    return () => clearInterval(interval);
  }, []);

  if (reducedMotion) {
    return (
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] text-white mb-6 max-w-4xl mx-auto text-center">
        Protect Your Workforce From{' '}
        <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
          Phishing Attacks
        </span>
      </h1>
    );
  }

  // Calculate high-end Apple/Vercel-style transition parameters
  const getHeadingStyle = (index: 0 | 1): React.CSSProperties => {
    const isActive = activeIndex === index;

    if (isActive) {
      return {
        opacity: 1,
        transform: 'translateY(0px) scale(1)',
        filter: 'blur(0px)',
        transition: 'opacity 2200ms cubic-bezier(0.16, 1, 0.3, 1), transform 2200ms cubic-bezier(0.16, 1, 0.3, 1), filter 2200ms cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'opacity, transform, filter',
      };
    }

    // Inactive heading
    if (isTransitioning) {
      // Exiting headline gliding upward with subtle blur
      return {
        opacity: 0,
        transform: 'translateY(-35px) scale(0.95)',
        filter: 'blur(12px)',
        transition: 'opacity 2200ms cubic-bezier(0.16, 1, 0.3, 1), transform 2200ms cubic-bezier(0.16, 1, 0.3, 1), filter 2200ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'none',
        willChange: 'opacity, transform, filter',
      };
    }

    // Idle inactive headline resting below, ready for next turn
    return {
      opacity: 0,
      transform: 'translateY(35px) scale(0.95)',
      filter: 'blur(12px)',
      transition: 'none',
      pointerEvents: 'none',
    };
  };

  return (
    <div className="grid place-items-center mb-6 max-w-4xl mx-auto w-full">
      {/* Heading 0: Welcome to PhishGuard */}
      <h1
        style={getHeadingStyle(0)}
        className="col-start-1 row-start-1 text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] text-white text-center select-none"
        aria-hidden={activeIndex !== 0}
      >
        Welcome to{' '}
        <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
          PhishGuard
        </span>
      </h1>

      {/* Heading 1: Protect Your Workforce From Phishing Attacks */}
      <h1
        style={getHeadingStyle(1)}
        className="col-start-1 row-start-1 text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] text-white text-center select-none"
        aria-hidden={activeIndex !== 1}
      >
        Protect Your Workforce From{' '}
        <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
          Phishing Attacks
        </span>
      </h1>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500 selection:text-white relative flex flex-col justify-between">
      {/* Ambient background glow elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent blur-[140px]" />
        <div className="absolute top-1/3 -left-40 h-[450px] w-[450px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute bottom-10 -right-40 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* ── Top Floating Glassmorphism Header Navigation ── */}
      <div className="sticky top-0 z-50 w-full pt-4 pb-2 px-4 sm:px-6 transition-all duration-300">
        <header className="max-w-7xl mx-auto rounded-2xl sm:rounded-3xl border border-white/15 bg-slate-900/40 backdrop-blur-2xl backdrop-saturate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] ring-1 ring-white/10 px-6 py-3.5 flex items-center justify-between hover:border-white/30 hover:bg-slate-900/50 transition-all duration-300">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
              <Shield size={22} className="fill-blue-200/20" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Phish<span className="text-blue-400">Guard</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#solutions" className="hover:text-white transition-colors">Enterprise Solutions</a>
            <a href="#analytics" className="hover:text-white transition-colors">Risk Analytics</a>
            <a href="#security" className="hover:text-white transition-colors">Security &amp; Trust</a>
          </nav>

          {/* Header Action Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/portal')}
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold tracking-wide transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign In to Portal
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </header>
      </div>

      {/* ── Hero Section ── */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-20 text-center flex-1 flex flex-col justify-center">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 mx-auto shadow-inner animate-pulse">
          <Sparkles size={14} className="text-blue-400" />
          <span>Welcome to PhishGuard · Next-Gen Cyber Awareness Platform</span>
        </div>

        {/* Animated Main Headline */}
        <HeroHeadingAnimation />

        {/* Subheading */}
        <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Transform your employees from potential breach targets into your strongest line of cyber defense with AI-driven simulations, behavioral risk modeling, and continuous awareness training.
        </p>

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => navigate('/portal')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base tracking-wide transition-all duration-300 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.03] active:scale-[0.99] flex items-center justify-center gap-3 border border-blue-400/20"
          >
            <Lock size={18} />
            Sign In to Portal
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Trust & Metric Cards */}
        <div id="features" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
          
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
              <Brain size={20} />
            </div>
            <h3 className="text-sm font-black text-white mb-1">AI Attack Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates hyper-realistic phishing emails contextualized to your industry.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl hover:border-emerald-500/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <BarChart3 size={20} />
            </div>
            <h3 className="text-sm font-black text-white mb-1">Risk Heatmaps</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time department risk scoring &amp; click vulnerability tracking.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl hover:border-indigo-500/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Award size={20} />
            </div>
            <h3 className="text-sm font-black text-white mb-1">Adaptive Learning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated micro-training modules dispatched immediately upon simulation click.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
              <Users size={20} />
            </div>
            <h3 className="text-sm font-black text-white mb-1">Multi-Portal Access</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dedicated portals for employees &amp; organization managers.
            </p>
          </div>

        </div>

        {/* Security Compliance Banner */}
        <div className="mt-16 pt-8 border-t border-slate-850 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" /> SOC2 Type II Certified
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" /> ISO 27001 Compliant
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-blue-400" /> Real-time Threat Intelligence
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-slate-800/60 py-6 text-center text-xs text-slate-400 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} PhishGuard Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 text-slate-400">
            <a href="#" className="hover:text-slate-200 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-200 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-200 transition-colors">Security Overview</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
