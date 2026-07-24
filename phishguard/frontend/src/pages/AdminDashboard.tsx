import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { 
  Mail, Users, AlertTriangle, CheckCircle2, TrendingUp, ShieldAlert,
  Sparkles, ArrowRight, Shield, Activity, ChevronRight, Zap, X, Calendar
} from 'lucide-react';


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

export default function AdminDashboard() {
  const { user } = useAuth();

  // States for micro-interactions
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedConfidence, setAnimatedConfidence] = useState(0);
  const [visibleInsights, setVisibleInsights] = useState(0);
  const [isHealthPanelOpen, setIsHealthPanelOpen] = useState(false);

  useEffect(() => {
    // Score count-up animation
    let start = 0;
    const end = 72;
    const duration = 800; // ms
    const incrementTime = Math.floor(duration / end);
    const scoreTimer = setInterval(() => {
      start += 1;
      setAnimatedScore(start);
      if (start >= end) clearInterval(scoreTimer);
    }, incrementTime);

    // Confidence count-up animation
    let confStart = 0;
    const confEnd = 94;
    const confDuration = 800;
    const confIncrementTime = Math.floor(confDuration / confEnd);
    const confTimer = setInterval(() => {
      confStart += 1;
      setAnimatedConfidence(confStart);
      if (confStart >= confEnd) clearInterval(confTimer);
    }, confIncrementTime);

    // Insights sequential fade-in
    const insightsTimer = setInterval(() => {
      setVisibleInsights(prev => {
        if (prev < 4) return prev + 1;
        clearInterval(insightsTimer);
        return prev;
      });
    }, 150);

    return () => {
      clearInterval(scoreTimer);
      clearInterval(confTimer);
      clearInterval(insightsTimer);
    };
  }, []);

  const displayName = user?.email 
    ? user.email.split('@')[0].replace(/^\w/, c => c.toUpperCase()) 
    : 'Alice';

  const stats = [
    { name: 'Active Campaigns', value: '4', change: '+12%', icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Targeted Employees', value: '1,248', change: '+8%', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { name: 'Average Click Rate', value: '12.4%', change: '-3.2%', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Reporting Rate', value: '68.2%', change: '+15.4%', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  const recentCampaigns = [
    { id: '1', name: 'Q2 Credential Harvest Drill', type: 'Office365 Phish', sent: '1,248', clicked: '155', reported: '850', status: 'In Progress' },
    { id: '2', name: 'CEO Urgent Wire Transfer Scam', type: 'Spear Phish', sent: '45', clicked: '2', reported: '41', status: 'Completed' },
    { id: '3', name: 'HR Benefits Policy Update', type: 'Attachment Phish', sent: '1,120', clicked: '240', reported: '512', status: 'Completed' },
  ];

  const insights = [
    {
      text: 'Finance department risk increased 14%',
      icon: ShieldAlert,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      badgeColor: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
      confidence: 94,
      pulse: true
    },
    {
      text: 'HR completed phishing training',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      badgeColor: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
      confidence: 98,
      pulse: false
    },
    {
      text: 'Two high-risk users detected',
      icon: Users,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      badgeColor: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
      confidence: 89,
      pulse: false
    },
    {
      text: 'Recommend Invoice phishing campaign',
      icon: Sparkles,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      badgeColor: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
      confidence: 92,
      pulse: false
    }
  ];

  const scoreDetails = getScoreDetails(animatedScore);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Redesigned Hero AI Command Center */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900/60 to-emerald-950/20 p-6 md:p-8 shadow-2xl backdrop-blur-md animate-in fade-in duration-500">
        
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
              <p className="mt-1 text-xs md:text-sm font-semibold text-blue-400 flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-400 shrink-0" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </p>
              <p className="mt-1.5 text-xs md:text-sm text-slate-400 leading-relaxed lg:whitespace-nowrap">
                Your organization's security posture has improved this week.
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
                      } ${insight.pulse ? 'ring-1 ring-rose-500/30' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${insight.bg} ${insight.color} relative`}>
                          <InsightIcon size={16} />
                          {insight.pulse && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
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
                to="/admin/ai-generator"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-sm"
              >
                <Sparkles size={16} />
                <span>Generate Campaign</span>
              </Link>
              <Link
                to="/admin/reports"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-sm"
              >
                <Mail size={16} />
                <span>View Full Report</span>
              </Link>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Campaigns</span>
                <p className="text-lg font-bold text-white">18 <span className="text-xs font-normal text-slate-400">/mo</span></p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Completion</span>
                <p className="text-lg font-bold text-white">87%</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Click Rate</span>
                <p className="text-lg font-bold text-rose-400">9%</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Risk Trend</span>
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-0.5 mt-1">
                  <TrendingUp size={12} /> Improving
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Organization Security Score Card (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-end">
            {/* AI-powered Security Health Card */}
            <div 
              onClick={() => setIsHealthPanelOpen(true)}
              className="p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/50 to-slate-950/80 backdrop-blur-sm flex flex-col hover:border-slate-700 hover:shadow-xl hover:shadow-emerald-950/10 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all duration-300 group relative overflow-hidden"
            >
              {/* Score glow */}
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none ${scoreDetails.bgClass}`}></div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Organization Security Score</span>
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
                    <span>▲ +5 this week</span>
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
                  <p className="text-xs text-slate-400 font-medium">Based on 18 data signals</p>
                </div>
                <ConfidenceGauge value={animatedConfidence} />
              </div>

              {/* Supporting Metrics Panel */}
              <div className="mt-5 pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-y-3 gap-x-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Organization Trend</span>
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp size={12} /> Security improving
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Departments at Risk</span>
                  <p className="text-xs font-bold text-amber-400">Finance • HR</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Employees Protected</span>
                  <p className="text-xs font-bold text-white">843 / 910</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Last AI Scan</span>
                  <p className="text-xs font-bold text-white">12 minutes ago</p>
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

      {/* Detailed Security Health Panel slide-out Modal */}
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
                  Organization Security Health
                </h3>
                <p className="text-xs text-slate-400 mt-1">Detailed security signals and AI threat modeling assessment.</p>
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
                <div className="h-16 w-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-2xl text-white">
                  72
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Status</p>
                  <h4 className="text-sm font-extrabold text-amber-400 mt-0.5">Moderate Risk Posture</h4>
                  <p className="text-[11px] text-slate-400">Score has increased by 5 points compared to last month.</p>
                </div>
              </div>

              {/* AI Explanation */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-400" />
                  AI Explanation
                </h4>
                <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 text-xs text-slate-300 leading-relaxed">
                  "Your score of 72 reflects high reporting rates in Marketing offset by an active credential harvest drill click in the Finance department. AI suggests training Finance on urgent wire transfer headers."
                </div>
              </div>

              {/* Risk Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Susceptibility Risk Breakdown</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Phishing Susceptibility', value: 15, colorClass: 'bg-rose-500' },
                    { label: 'Social Engineering Susceptibility', value: 8, colorClass: 'bg-emerald-500' },
                    { label: 'Credential Harvesting vulnerability', value: 28, colorClass: 'bg-amber-500' },
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

              {/* Department Comparison */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Department Performance Comparison</h4>
                <div className="divide-y divide-slate-800/60">
                  {[
                    { dept: 'Engineering', score: 85, status: 'Excellent', statusColor: 'text-emerald-400' },
                    { dept: 'Marketing', score: 78, status: 'Good', statusColor: 'text-blue-400' },
                    { dept: 'Sales', score: 65, status: 'Moderate', statusColor: 'text-amber-400' },
                    { dept: 'Finance', score: 42, status: 'High Risk', statusColor: 'text-rose-400' },
                  ].map((item) => (
                    <div key={item.dept} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">{item.dept}</span>
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${item.statusColor}`}>{item.status}</span>
                        <span className="font-bold text-white bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">{item.score} / 100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Factors */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contributing Security Factors</h4>
                <div className="space-y-2.5">
                  {[
                    { name: 'Simulated Phishing Report Rate', effect: '+12% positive effect', pos: true },
                    { name: 'Completed Training Modules Ratio', effect: '+8% positive effect', pos: true },
                    { name: 'Drill Click Susceptibility Ratio', effect: '-14% risk offset', pos: false },
                  ].map((factor, i) => (
                    <div key={i} className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 flex items-start gap-2.5">
                      <div className={`p-1 rounded mt-0.5 ${factor.pos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {factor.pos ? <TrendingUp size={12} /> : <ShieldAlert size={12} />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{factor.name}</p>
                        <p className={`text-[10px] font-medium mt-0.5 ${factor.pos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {factor.effect}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historical Trend Graph */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Score History</h4>
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
                    <div className="absolute top-0 left-0 text-[9px] font-bold text-slate-500">72 score</div>
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
                  <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-0.5">
                    <Sparkles size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-100">Launch Invoice-themed phishing drill</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Target the Finance department to mitigate click susceptibility spikes.</p>
                  </div>
                  <Link 
                    to="/admin/ai-generator" 
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
              <span>Refreshed 12m ago</span>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 p-5 shadow-lg backdrop-blur-sm hover:border-slate-700 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-300`}>
                <stat.icon size={22} />
              </div>
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                stat.change.startsWith('+') && stat.name.includes('Rate') && !stat.name.includes('Click')
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : stat.change.startsWith('-') && stat.name.includes('Click')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-slate-500/10 text-slate-400'
              }`}>
                <TrendingUp size={12} />
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight text-white">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard Grid split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Drill Results */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Active Simulations</h2>
            <button className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors">View all campaigns</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                  <th className="pb-3 font-medium">Campaign Name</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium text-center">Sent</th>
                  <th className="pb-3 font-medium text-center">Clicked</th>
                  <th className="pb-3 font-medium text-center">Reported</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 font-medium text-white">{camp.name}</td>
                    <td className="py-4 text-xs">{camp.type}</td>
                    <td className="py-4 text-center">{camp.sent}</td>
                    <td className="py-4 text-center text-red-400 font-semibold">{camp.clicked}</td>
                    <td className="py-4 text-center text-emerald-400 font-semibold">{camp.reported}</td>
                    <td className="py-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        camp.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Risk Indicator */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm p-6 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-500" />
              Risk Assessment
            </h2>
            <p className="text-xs text-slate-400">Aggregate telemetry from campaigns indicators.</p>
            
            <div className="mt-8 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                {/* Circular indicator mock */}
                <div className="h-32 w-32 rounded-full border-8 border-slate-800 border-t-red-500 border-r-amber-500 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-white">Med</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Score: 4.2</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Vulnerability Rating</span>
                <span className="font-semibold text-amber-400">Moderate Risk</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500">
            Based on Q2 simulated drills and training enrollment ratios.
          </div>
        </div>
      </div>
    </div>
  );
}
