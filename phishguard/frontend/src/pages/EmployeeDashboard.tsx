import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, BookOpen, Award, TrendingUp, TrendingDown, ArrowRight, Users, 
  CheckCircle, AlertCircle, ChevronRight, Activity, LogIn, Zap, X, Sparkles, ShieldAlert, CheckCircle2, Calendar
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../AuthContext';

const getScoreDetails = (score: number) => {
  if (score >= 85) {
    return {
      label: 'Excellent Security',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/20',
      barClass: 'bg-emerald-500',
      colorCode: '#10b981'
    };
  }
  if (score >= 70) {
    return {
      label: 'Good Security',
      textClass: 'text-blue-400',
      bgClass: 'bg-blue-500/10',
      borderClass: 'border-blue-500/20',
      barClass: 'bg-blue-500',
      colorCode: '#3b82f6'
    };
  }
  if (score >= 50) {
    return {
      label: 'Moderate Risk',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/20',
      barClass: 'bg-amber-500',
      colorCode: '#f59e0b'
    };
  }
  if (score >= 30) {
    return {
      label: 'High Risk',
      textClass: 'text-orange-400',
      bgClass: 'bg-orange-500/10',
      borderClass: 'border-orange-500/20',
      barClass: 'bg-orange-500',
      colorCode: '#f97316'
    };
  }
  return {
    label: 'Critical Risk',
    textClass: 'text-red-400',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/20',
    barClass: 'bg-red-500',
    colorCode: '#ef4444'
  };
};

function ConfidenceGauge({ value }: { value: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference - (value / 100) * circumference;

  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(filled);
    }, 200);
    return () => clearTimeout(timer);
  }, [filled]);

  return (
    <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle
          cx="20" cy="20" r={radius} fill="none"
          stroke="#10b981" strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <span className="text-[9px] font-bold text-white z-10">{value}%</span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference - (score / 100) * circumference;
  const scoreDetails = getScoreDetails(score);

  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(filled);
    }, 100);
    return () => clearTimeout(timer);
  }, [filled]);

  return (
    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={scoreDetails.colorCode} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-lg font-black text-white">{Math.round(score)}</p>
        <p className="text-[9px] text-slate-400 font-medium">/ 100</p>
      </div>
    </div>
  );
}

function MiniSparkline({ data }: { data: { score: number }[] }) {
  if (data.length < 2) return null;
  const width = 120, height = 36;
  const max = Math.max(...data.map(d => d.score), 1);
  const min = Math.min(...data.map(d => d.score));
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.score - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-60">
      <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // States for micro-interactions
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedConfidence, setAnimatedConfidence] = useState(0);
  const [isHealthPanelOpen, setIsHealthPanelOpen] = useState(false);
  const [visibleInsights, setVisibleInsights] = useState(0);

  useEffect(() => {
    if (user) {
      fetchAll();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !isLoading) {
      // Score count-up
      let start = 0;
      const end = 85;
      const duration = 800; // ms
      const incrementTime = Math.floor(duration / end);
      const scoreTimer = setInterval(() => {
        start += 1;
        setAnimatedScore(start);
        if (start >= end) clearInterval(scoreTimer);
      }, incrementTime);

      // Confidence count-up
      let confStart = 0;
      const confEnd = 96;
      const confDuration = 800;
      const confIncrementTime = Math.floor(confDuration / confEnd);
      const confTimer = setInterval(() => {
        confStart += 1;
        setAnimatedConfidence(confStart);
        if (confStart >= confEnd) clearInterval(confTimer);
      }, confIncrementTime);

      // Insights sequence animation
      const insightsTimer = setInterval(() => {
        setVisibleInsights(prev => (prev < 3 ? prev + 1 : prev));
      }, 300);

      return () => {
        clearInterval(scoreTimer);
        clearInterval(confTimer);
        clearInterval(insightsTimer);
      };
    }
  }, [user, isLoading]);

  const fetchAll = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('employee_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const [analyticsRes, lessonsRes, leaderboardRes, meRes] = await Promise.allSettled([
        fetch('http://localhost:8000/analytics/user/me', { headers, credentials: 'include' }),
        fetch('http://localhost:8000/training/lessons', { headers, credentials: 'include' }),
        fetch('http://localhost:8000/training/leaderboard', { headers, credentials: 'include' }),
        fetch('http://localhost:8000/users/me', { headers, credentials: 'include' })
      ]);

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
        setAnalytics(await analyticsRes.value.json());
      }
      if (lessonsRes.status === 'fulfilled' && lessonsRes.value.ok) {
        setLessons(await lessonsRes.value.json());
      }
      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.ok) {
        setLeaderboard(await leaderboardRes.value.json());
      }
      if (meRes.status === 'fulfilled' && meRes.value.ok) {
        const me = await meRes.value.json();
        setUserEmail(me.email || '');
      }
    } catch {
      addToast({ title: 'Load Error', description: 'Could not load all dashboard data.', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const getEmployeeName = () => {
    const email = userEmail || user?.email;
    if (!email) return 'Employee';
    const namePart = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return namePart === 'Admin' ? 'Employee' : namePart;
  };
  const displayName = getEmployeeName();
  const completedCount = lessons.filter(l => l.completed).length;
  const totalCount = lessons.length;
  const riskScore = analytics?.latest_risk_score;
  const riskLabel = riskScore === null || riskScore === undefined
    ? 'No Data'
    : riskScore >= 70 ? 'Low Risk' : riskScore >= 40 ? 'Medium Risk' : 'High Risk';
  const riskColor = riskScore === null || riskScore === undefined
    ? 'text-slate-400'
    : riskScore >= 70 ? 'text-emerald-400' : riskScore >= 40 ? 'text-amber-400' : 'text-red-400';
  const scoreDetails = getScoreDetails(animatedScore);

  // Unauthenticated Public Landing State
  if (!authLoading && !user) {
    return (
      <div className="space-y-12 animate-in fade-in duration-300">
        {/* Guest Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-8 sm:p-12 text-center sm:text-left">
          <div className="relative z-10 max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
              <Zap size={14} /> Cyber Defense & Phishing Awareness Platform
            </span>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Welcome to <span className="text-emerald-400">PhishGuard</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Empowering organizations and employees with AI-driven simulated phishing drills, interactive security training modules, and real-time threat reporting.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 text-sm"
              >
                <LogIn size={18} /> Sign In to Portal
              </button>
            </div>
          </div>

          <div className="absolute right-[-40px] bottom-[-40px] opacity-10 pointer-events-none hidden lg:block">
            <Shield size={340} className="text-emerald-400 fill-emerald-400/20" />
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-3 hover:border-emerald-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Shield size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Simulated Phishing Drills</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Practice recognizing modern phishing, spear-phishing, and social engineering attacks in a safe environment.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-3 hover:border-emerald-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <BookOpen size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Interactive Training Paths</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete bitesize interactive modules and quizzes tailored to your role and risk score.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-3 hover:border-emerald-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Award size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Earn Badges &amp; Certificates</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track your security achievements, climb the department leaderboard, and earn official security certificates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const insights = [
    {
      text: 'No simulated clicks registered this month',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      badgeColor: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
      confidence: 98,
      pulse: false
    },
    {
      text: 'Recommended: Complete Email Safety quiz',
      icon: Sparkles,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      badgeColor: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
      confidence: 94,
      pulse: true
    },
    {
      text: 'Strong authentication settings verified',
      icon: Shield,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      badgeColor: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
      confidence: 96,
      pulse: false
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Redesigned Hero AI Command Center */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900/60 to-emerald-950/20 p-6 md:p-8 shadow-2xl backdrop-blur-md">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* 3-Column Layout: Left (4/12) -> Center (3/12) -> Right (5/12) */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Welcome Greeting & AI Insights Panel (col-span-4) */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour < 12) return 'Good morning';
                    if (hour < 17) return 'Good afternoon';
                    return 'Good evening';
                  })()},
                </span>
                <span>{displayName} 👋</span>
              </h1>
              <p className="mt-1 text-xs md:text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-400 shrink-0" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </p>
              <p className="mt-1.5 text-xs md:text-sm text-slate-400 leading-relaxed lg:whitespace-nowrap">
                Your personal security posture remains excellent.
              </p>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400 animate-pulse" />
                  AI Insights
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                  Live Analysis
                </span>
              </div>

              {/* Insights List */}
              <div className="space-y-2.5">
                {insights.map((insight, index) => {
                  const InsightIcon = insight.icon;
                  const isVisible = index < visibleInsights;
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-sm flex items-center justify-between gap-3 hover:bg-slate-900/50 hover:border-slate-700/60 transition-all duration-500 transform ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      } ${insight.pulse ? 'ring-1 ring-amber-500/30' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${insight.bg} ${insight.color} relative`}>
                          <InsightIcon size={16} />
                          {insight.pulse && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-200 font-medium">{insight.text}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${insight.badgeColor} border`}>
                          {insight.confidence}% Conf.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Column: Actions & Quick Stats (col-span-3) */}
          <div className="lg:col-span-3 flex flex-col justify-end space-y-4">
            {/* CTA Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
              <Link
                to="/lessons"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-sm"
              >
                <BookOpen size={16} />
                <span>Resume Learning</span>
              </Link>
              <button
                onClick={() => setIsHealthPanelOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-sm"
              >
                <Activity size={16} />
                <span>View Score Details</span>
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Completed</span>
                <p className="text-lg font-bold text-white">{completedCount} <span className="text-xs font-normal text-slate-400">/ {totalCount}</span></p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Completion</span>
                <p className="text-lg font-bold text-white">{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Risk Level</span>
                <p className={`text-lg font-bold ${riskColor}`}>{riskLabel}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Last Test</span>
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-0.5 mt-1">
                  <CheckCircle2 size={12} /> Passed
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Personal Security Score Card (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-end">
            {/* AI-powered Security Health Card */}
            <div 
              onClick={() => setIsHealthPanelOpen(true)}
              className="p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/50 to-slate-950/80 backdrop-blur-sm flex flex-col hover:border-slate-700 hover:shadow-xl hover:shadow-emerald-950/10 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all duration-300 group relative overflow-hidden"
            >
              {/* Score glow */}
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none ${scoreDetails.bgClass}`}></div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">My Security Score</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreDetails.bgClass} ${scoreDetails.textClass} ${scoreDetails.borderClass}`}>
                  AI Computed
                </span>
              </div>

              <div className="flex items-center gap-6">
                <ScoreRing score={animatedScore} />
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{animatedScore}</span>
                    <span className="text-sm font-semibold text-slate-400">/ 100</span>
                  </div>
                  <p className={`text-sm font-extrabold tracking-tight ${scoreDetails.textClass}`}>
                    {scoreDetails.label}
                  </p>
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <TrendingUp size={14} className="animate-bounce" />
                    <span>▲ +3 this week</span>
                  </div>
                </div>
              </div>

              {/* Horizontal Progress Bar */}
              <div className="mt-5 space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>Vulnerability Level</span>
                  <span>{animatedScore}%</span>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-2 relative overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ease-out ${scoreDetails.barClass}`}
                    style={{ width: `${animatedScore}%` }}
                  />
                </div>
              </div>

              {/* AI Confidence Meter Section */}
              <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI Confidence Rating</p>
                  <p className="text-xs text-slate-400 font-medium">Based on 8 personal security signals</p>
                </div>
                <ConfidenceGauge value={animatedConfidence} />
              </div>

              {/* Supporting Metrics Panel */}
              <div className="mt-5 pt-4 border-t border-slate-800/60 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">Email Safety</span>
                  <span className="font-bold text-emerald-400">Excellent</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">Password Strength</span>
                  <span className="font-bold text-emerald-400">Strong</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">Training Progress</span>
                  <span className="font-bold text-blue-400">92%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">Last Phishing Test</span>
                  <span className="font-bold text-emerald-400">Passed</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">Security Status</span>
                  <span className="font-bold text-emerald-400">Protected</span>
                </div>
              </div>

              {/* Metadata tags */}
              <div className="mt-5 pt-3 border-t border-slate-800/50 flex flex-wrap gap-2 items-center justify-between text-[9px] text-slate-500 font-semibold tracking-tight">
                <span>Threat Model v4.2</span>
                <span>Behavior Analysis Complete</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Detailed Personal Security Health Panel slide-out Modal */}
      {isHealthPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in duration-200">
          {/* Backdrop */}
          <div 
            onClick={() => setIsHealthPanelOpen(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
          />

          {/* Sliding Panel */}
          <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl z-10 flex flex-col h-full animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="text-emerald-400" size={20} />
                  My Personal Security Health
                </h3>
                <p className="text-xs text-slate-400 mt-1">Personal security health metrics, factors, and recommendations.</p>
              </div>
              <button 
                onClick={() => setIsHealthPanelOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Score Recap Banner */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center gap-5">
                <div className="h-16 w-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-2xl text-emerald-400">
                  85
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Status</p>
                  <h4 className="text-sm font-extrabold text-emerald-400 mt-0.5">Excellent Security Posture</h4>
                  <p className="text-[11px] text-slate-400">Your score increased by 3 points compared to last week.</p>
                </div>
              </div>

              {/* AI Explanation */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-400" />
                  AI Explanation
                </h4>
                <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 text-xs text-slate-300 leading-relaxed">
                  "Your personal security rating is Excellent. You successfully reported the Q2 credential harvest simulated phishing email within 14 seconds and passed all assigned training modules with a high score. Ensure you keep your passwords rotated to maintain this status."
                </div>
              </div>

              {/* Risk Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal Risk Breakdown</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Phishing Susceptibility', value: 2, colorClass: 'bg-emerald-500' },
                    { label: 'Password Vulnerability', value: 5, colorClass: 'bg-emerald-500' },
                    { label: 'Training Path Completion Delay', value: 12, colorClass: 'bg-emerald-500' },
                  ].map((risk) => (
                    <div key={risk.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{risk.label}</span>
                        <span className="font-bold text-white">{risk.value}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${risk.colorClass}`} style={{ width: `${risk.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drill Performance */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Drill History</h4>
                <div className="divide-y divide-slate-800/60">
                  {[
                    { name: 'CEO Urgent Wire Transfer Scam', type: 'Spear Phish', result: 'Reported (Passed)', color: 'text-emerald-400' },
                    { name: 'IT Support Password Reset', type: 'Office365 Phish', result: 'Ignored (Passed)', color: 'text-emerald-400' },
                    { name: 'HR Benefits Policy Update', type: 'Attachment Phish', result: 'Completed (Good)', color: 'text-emerald-400' },
                  ].map((item, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-slate-200">{item.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.type}</p>
                      </div>
                      <span className={`font-semibold ${item.color}`}>{item.result}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Factors */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contributing Security Factors</h4>
                <div className="space-y-2.5">
                  {[
                    { name: 'Simulated Phishing Quick Response Detections', effect: 'Strong positive impact', pos: true },
                    { name: 'Completed Training Modules Score', effect: 'High passing threshold met', pos: true },
                    { name: 'Drill Click Susceptibility Ratio', effect: 'No clicks recorded this quarter', pos: true },
                  ].map((factor, i) => (
                    <div key={i} className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 flex items-start gap-2.5">
                      <div className="p-1 rounded mt-0.5 bg-emerald-500/10 text-emerald-400">
                        <TrendingUp size={12} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{factor.name}</p>
                        <p className="text-[10px] font-medium mt-0.5 text-emerald-400">
                          {factor.effect}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historical Trend Graph */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal Score History</h4>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                  <div className="h-32 w-full flex items-end justify-between gap-1 relative pt-4">
                    {/* SVG Sparkline Graph */}
                    <svg className="absolute inset-x-0 bottom-0 w-full h-24" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path 
                        d="M0,35 Q15,30 30,28 T60,20 T90,15 T100,12" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                      />
                      <path 
                        d="M0,35 Q15,30 30,28 T60,20 T90,15 T100,12 L100,40 L0,40 Z" 
                        fill="url(#gradient)" 
                        opacity="0.1"
                      />
                    </svg>

                    {/* Simple chart labels */}
                    <div className="absolute top-0 left-0 text-[9px] font-bold text-slate-500">85 score</div>
                    <div className="absolute bottom-0 right-0 text-[9px] font-bold text-slate-500">July 2026</div>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase mt-3">
                    <span>March</span>
                    <span>April</span>
                    <span>May</span>
                    <span>June</span>
                    <span>July</span>
                  </div>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Recommended Next Actions</h4>
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-start gap-2.5 hover:border-slate-700/60 transition-colors">
                  <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 mt-0.5">
                    <Sparkles size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-100">Review Social Engineering Defense module</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Complete this short course path to sustain your Excellent security posture.</p>
                  </div>
                  <Link 
                    to="/lessons" 
                    onClick={() => setIsHealthPanelOpen(false)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all self-center"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span>Security Engine v2.0.4</span>
              <span>Refreshed 10m ago</span>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Modules Completed',
            value: `${completedCount}/${totalCount}`,
            icon: BookOpen,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
          },
          {
            label: 'Click Rate',
            value: analytics ? `${(analytics.click_rate * 100).toFixed(1)}%` : '—',
            icon: TrendingDown,
            color: (analytics?.click_rate || 0) > 0.2 ? 'text-red-400' : 'text-emerald-400',
            bg: (analytics?.click_rate || 0) > 0.2 ? 'bg-red-500/10' : 'bg-emerald-500/10',
            border: (analytics?.click_rate || 0) > 0.2 ? 'border-red-500/20' : 'border-emerald-500/20',
          },
          {
            label: 'Report Rate',
            value: analytics ? `${(analytics.report_rate * 100).toFixed(1)}%` : '—',
            icon: TrendingUp,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
          },
          {
            label: 'Certificates',
            value: completedCount,
            icon: Award,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20'
          }
        ].map((stat, i) => (
          <div key={i} className={`rounded-xl border ${stat.border} ${stat.bg} p-4 flex flex-col gap-3`}>
            <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center border ${stat.border}`}>
              <stat.icon size={16} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Lessons */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen size={16} className="text-emerald-400" /> Training Path
            </h2>
            <Link to="/lessons" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          {isLoading ? (
            <p className="text-xs text-slate-500 py-4">Loading modules...</p>
          ) : lessons.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No modules assigned yet.</p>
              <p className="text-xs mt-1">Modules are assigned after simulated phishing campaigns.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.slice(0, 4).map(lesson => (
                <div key={lesson.id} className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${lesson.completed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${lesson.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    {lesson.completed ? <CheckCircle size={16} /> : <BookOpen size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{lesson.topic.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-bold text-white truncate">{lesson.title}</p>
                  </div>
                  <Link to="/lessons" className="text-slate-500 hover:text-emerald-400 transition-colors">
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-amber-400" /> Department Leaderboard
            </h2>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No rankings available yet.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 6).map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/40 transition-colors">
                  <span className={`text-xs font-black w-5 text-center ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {idx + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">{entry.name}</p>
                    <p className="text-[10px] text-slate-500">{entry.department}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-400">{entry.composite_score.toFixed(0)}</span>
                    <p className="text-[10px] text-slate-500">pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
