import { useEffect, useState } from 'react';
import { Mail, Building, Shield, Edit2, Save, X, Key, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';

interface UserProfile {
  id: number;
  email: string;
  is_active: boolean;
  organization_name?: string;
  department_name?: string;
  role_name?: string;
}

interface Analytics {
  click_rate: number;
  report_rate: number;
  open_rate: number;
  latest_risk_score: number | null;
}

export default function EmployeeProfile() {
  const { addToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [editing, setEditing] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchAnalytics();
  }, []);

  const fetchProfile = async () => {
    const res = await apiFetch('/users/me');
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setFormEmail(data.email);
    }
  };

  const fetchAnalytics = async () => {
    const res = await apiFetch('/analytics/user/me');
    if (res.ok) setAnalytics(await res.json());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const body: Record<string, string> = {};
      if (formEmail && formEmail !== profile?.email) body.email = formEmail;
      if (formPassword) body.password = formPassword;

      const res = await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchProfile();
        setFormPassword('');
        setEditing(false);
        addToast({ title: 'Profile Updated', description: 'Your changes have been saved.', type: 'success' });
      } else {
        const err = await res.json();
        addToast({ title: 'Update Failed', description: err.detail || 'Unknown error.', type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const riskScore = analytics?.latest_risk_score;
  const riskLabel = riskScore === null || riskScore === undefined ? 'No Data'
    : riskScore >= 70 ? 'Low Risk' : riskScore >= 40 ? 'Moderate Risk' : 'High Risk';
  const riskColor = riskScore === null || riskScore === undefined ? 'text-slate-400'
    : riskScore >= 70 ? 'text-emerald-400' : riskScore >= 40 ? 'text-amber-400' : 'text-red-400';
  const riskBg = riskScore === null || riskScore === undefined ? 'bg-slate-800 border-slate-700'
    : riskScore >= 70 ? 'bg-emerald-500/10 border-emerald-500/20' : riskScore >= 40 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

  const initials = profile?.email.substring(0, 2).toUpperCase() || '??';
  const getEmployeeName = () => {
    if (!profile?.email) return 'Employee';
    const namePart = profile.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return namePart === 'Admin' ? 'Employee' : namePart;
  };
  const displayName = getEmployeeName();

  return (
    <div className="space-y-8 max-w-3xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">My Profile</h1>
        <p className="mt-2 text-sm text-slate-400">Manage your account details and view your security statistics.</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        {/* Banner */}
        <div className="h-20 bg-gradient-to-r from-emerald-950 to-slate-900 relative">
          <div className="absolute bottom-0 left-6 translate-y-1/2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 border-4 border-slate-900 flex items-center justify-center text-xl font-black text-white shadow-xl">
              {initials}
            </div>
          </div>
        </div>

        <div className="pt-12 pb-6 px-6 space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-white">{displayName}</h2>
              <p className="text-sm text-slate-400">{profile?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile?.role_name && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    {profile.role_name}
                  </span>
                )}
                {profile?.department_name && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400">
                    {profile.department_name}
                  </span>
                )}
              </div>
            </div>

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Edit2 size={13} /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
                >
                  <Save size={13} /> {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setFormEmail(profile?.email || ''); setFormPassword(''); }}
                  className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  <X size={13} /> Cancel
                </button>
              </div>
            )}
          </div>

          {/* Account fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5"><Mail size={11} /> Email Address</label>
              {editing ? (
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              ) : (
                <p className="text-sm text-slate-200 px-3 py-2 bg-slate-950/60 rounded-lg border border-slate-800">{profile?.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5"><Building size={11} /> Organization</label>
              <p className="text-sm text-slate-200 px-3 py-2 bg-slate-950/60 rounded-lg border border-slate-800">{profile?.organization_name || '—'}</p>
            </div>

            {editing && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5"><Key size={11} /> New Password <span className="text-slate-600">(leave blank to keep)</span></label>
                <input
                  type="password"
                  value={formPassword}
                  placeholder="••••••••"
                  onChange={e => setFormPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Stats */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Shield size={16} className="text-emerald-400" /> Security Statistics
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={`rounded-xl border p-4 ${riskBg}`}>
            <div className={`text-xs font-bold flex items-center gap-1 mb-1 ${riskColor}`}>
              <Activity size={12} /> Risk Status
            </div>
            <p className={`text-lg font-black ${riskColor}`}>{riskScore !== null && riskScore !== undefined ? Math.round(riskScore) : '—'}</p>
            <p className="text-[10px] text-slate-500">{riskLabel}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs font-bold flex items-center gap-1 mb-1 text-slate-400">
              <TrendingDown size={12} /> Click Rate
            </div>
            <p className="text-lg font-black text-white">{analytics ? `${(analytics.click_rate * 100).toFixed(1)}%` : '—'}</p>
            <p className="text-[10px] text-slate-500">Phishing clicks</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs font-bold flex items-center gap-1 mb-1 text-slate-400">
              <TrendingUp size={12} /> Report Rate
            </div>
            <p className="text-lg font-black text-white">{analytics ? `${(analytics.report_rate * 100).toFixed(1)}%` : '—'}</p>
            <p className="text-[10px] text-slate-500">Emails reported</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs font-bold flex items-center gap-1 mb-1 text-slate-400">
              <Activity size={12} /> Open Rate
            </div>
            <p className="text-lg font-black text-white">{analytics ? `${(analytics.open_rate * 100).toFixed(1)}%` : '—'}</p>
            <p className="text-[10px] text-slate-500">Emails opened</p>
          </div>
        </div>
      </div>
    </div>
  );
}
