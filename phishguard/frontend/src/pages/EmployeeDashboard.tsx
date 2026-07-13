import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, BookOpen, Award, TrendingUp, TrendingDown, ArrowRight, Users, CheckCircle, AlertCircle, ChevronRight, Activity } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface Analytics {
  click_rate: number;
  report_rate: number;
  open_rate: number;
  latest_risk_score: number | null;
  risk_history: { score: number; computed_at: string }[];
}

interface LessonSummary {
  id: number;
  title: string;
  topic: string;
  completed: boolean;
}

interface LeaderboardEntry {
  name: string;
  department: string;
  composite_score: number;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={filled}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-xl font-black text-white">{Math.round(score)}</p>
        <p className="text-[10px] text-slate-400 font-medium">/ 100</p>
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
  const { addToast } = useToast();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

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
    } catch (e) {
      addToast({ title: 'Load Error', description: 'Could not load all dashboard data.', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = userEmail ? userEmail.split('@')[0].replace(/^\w/, c => c.toUpperCase()) : 'Employee';
  const completedCount = lessons.filter(l => l.completed).length;
  const totalCount = lessons.length;
  const riskScore = analytics?.latest_risk_score;
  const riskLabel = riskScore === null || riskScore === undefined
    ? 'No Data'
    : riskScore >= 70 ? 'Low Risk' : riskScore >= 40 ? 'Medium Risk' : 'High Risk';
  const riskColor = riskScore === null || riskScore === undefined
    ? 'text-slate-400'
    : riskScore >= 70 ? 'text-emerald-400' : riskScore >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">Security Dashboard</p>
            <h1 className="text-3xl font-extrabold text-white">Welcome back, {displayName}!</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-lg">
              Here's your security training overview. Complete your assigned modules and quizzes to improve your score.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {completedCount === totalCount && totalCount > 0 ? (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <CheckCircle size={13} /> All Modules Completed
                </span>
              ) : totalCount > 0 ? (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                  <AlertCircle size={13} /> {totalCount - completedCount} Module{totalCount - completedCount !== 1 ? 's' : ''} Outstanding
                </span>
              ) : null}
              <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border ${riskScore !== null && riskScore !== undefined ? (riskScore >= 70 ? 'bg-emerald-500/10 border-emerald-500/20' : riskScore >= 40 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20') : 'bg-slate-800 border-slate-700'} ${riskColor}`}>
                <Activity size={13} /> {riskLabel}
              </span>
            </div>
          </div>
          {riskScore !== null && riskScore !== undefined && (
            <div className="flex flex-col items-center gap-2">
              <ScoreRing score={riskScore} />
              <p className="text-xs text-slate-400 font-medium">Security Score</p>
              <MiniSparkline data={analytics?.risk_history || []} />
            </div>
          )}
        </div>
        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none translate-y-4 translate-x-4">
          <Shield size={220} className="text-emerald-400 fill-emerald-400/20" />
        </div>
      </div>

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
            <Link to="/employee/lessons" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
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
                  <Link to="/employee/lessons" className="text-slate-500 hover:text-emerald-400 transition-colors">
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
