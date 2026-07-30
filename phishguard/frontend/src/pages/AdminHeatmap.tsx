import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge, type RiskLevel } from '../components/ui/Badge';
import { ChartWrapper, ChartTooltip } from '../components/ui/ChartWrapper';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import {
  ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2, Users, Filter, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeptData {
  department_id: number;
  department_name: string;
  avg_risk_score: number;
  click_rate: number;
  report_rate: number;
  user_count: number;
}

interface MonthTrend {
  month: string;
  avg_risk_score: number | null;
}

interface CampaignStat {
  campaign_id: number;
  campaign_name: string;
  sent: number;
  clicked: number;
  reported: number;
}

interface HeatmapResponse {
  departments: DeptData[];
  monthly_trend: MonthTrend[];
  campaign_stats: CampaignStat[];
}

interface DeptOption { id: number; name: string; }
interface CampaignOption { id: number; name: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskLevel(score: number): RiskLevel {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'needs-improvement';
  return 'critical';
}

// Maps risk score 0–100 to a green-to-red hex (same semantic as Badge colors)
function riskColor(score: number): string {
  if (score >= 90) return '#10b981'; // emerald-500
  if (score >= 70) return '#eab308'; // yellow-500
  if (score >= 50) return '#f97316'; // orange-500
  return '#ef4444';                   // red-500
}

// Light bg tint for tile fill
function riskBgStyle(score: number): React.CSSProperties {
  if (score >= 90) return { background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.25)' };
  if (score >= 70) return { background: 'rgba(234,179,8,0.12)',  borderColor: 'rgba(234,179,8,0.25)' };
  if (score >= 50) return { background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.25)' };
  return { background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)' };
}

import { API_BASE } from '../lib/api';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminHeatmap() {
  const { error } = useToast();

  // Filter state
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [campaignFilter, setCampaignFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Data state
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Auth helper ────────────────────────────────────────────────────────────
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
    });
  }, []);

  // ─── Load filter options (departments + campaigns) once ─────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [dRes, cRes] = await Promise.all([
          fetchWithAuth(`${API_BASE}/analytics/departments`),
          fetchWithAuth(`${API_BASE}/campaigns`),
        ]);
        if (dRes.ok) {
          const depts: { department_id: number; department_name: string }[] = await dRes.json();
          setDeptOptions(depts.map(d => ({ id: d.department_id, name: d.department_name })));
        }
        if (cRes.ok) {
          const camps: { id: number; name: string }[] = await cRes.json();
          setCampaignOptions(camps);
        }
      } catch { /* non-fatal */ }
    })();
  }, [fetchWithAuth]);

  // ─── Load heatmap data whenever any filter changes ───────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (deptFilter)     params.set('department_id', deptFilter);
      if (campaignFilter) params.set('campaign_id', campaignFilter);
      if (dateFrom)       params.set('date_from', dateFrom);
      if (dateTo)         params.set('date_to', dateTo);

      const res = await fetchWithAuth(`${API_BASE}/analytics/heatmap?${params.toString()}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        throw new Error('Non-OK response');
      }
    } catch {
      error('Could not load heatmap data. Check server connectivity.');
    } finally {
      setLoading(false);
    }
  }, [deptFilter, campaignFilter, dateFrom, dateTo, fetchWithAuth, error]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Reset filters ───────────────────────────────────────────────────────────
  const resetFilters = () => {
    setDeptFilter('');
    setCampaignFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = !!(deptFilter || campaignFilter || dateFrom || dateTo);

  // ─── Derived values ──────────────────────────────────────────────────────────
  const depts = data?.departments ?? [];
  const trend  = data?.monthly_trend ?? [];
  const campStats = data?.campaign_stats ?? [];

  const sortedByRisk = [...depts].sort((a, b) => b.avg_risk_score - a.avg_risk_score);

  const orgAvg = depts.length
    ? Math.round(depts.reduce((s, d) => s + d.avg_risk_score, 0) / depts.length)
    : null;
  const worst = depts.length ? depts.reduce((a, b) => a.avg_risk_score < b.avg_risk_score ? a : b) : null;
  const best  = depts.length ? depts.reduce((a, b) => a.avg_risk_score > b.avg_risk_score ? a : b) : null;

  // Chart data
  const trendChartData = trend.map(t => ({
    month: t.month,
    'Avg Risk': t.avg_risk_score,
  }));

  const rankChartData = sortedByRisk.map(d => ({
    name: d.department_name,
    'Risk Score': d.avg_risk_score,
    fill: riskColor(d.avg_risk_score),
  }));

  const campChartData = campStats.map(c => ({
    name: c.campaign_name.length > 20 ? c.campaign_name.slice(0, 18) + '…' : c.campaign_name,
    Clicked: c.clicked,
    Reported: c.reported,
  }));

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-300">

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20">
              <ShieldAlert size={20} />
            </span>
            Risk Heatmap
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Per-department vulnerability concentration — filter by group, campaign, and date window.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 border-slate-800 hover:bg-slate-900 shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {/* FILTER BAR */}
      <Card className="border border-slate-800 bg-slate-900/40 shadow-xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-primary-400 mb-1 shrink-0">
              <Filter size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filters</span>
            </div>

            {/* Department */}
            <div className="min-w-[180px] flex-1">
              <Select
                label="Department"
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Departments' },
                  ...deptOptions.map(d => ({ value: String(d.id), label: d.name })),
                ]}
              />
            </div>

            {/* Campaign */}
            <div className="min-w-[180px] flex-1">
              <Select
                label="Campaign"
                value={campaignFilter}
                onChange={e => setCampaignFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Campaigns' },
                  ...campaignOptions.map(c => ({ value: String(c.id), label: c.name })),
                ]}
              />
            </div>

            {/* Date From */}
            <div className="min-w-[150px] flex-1">
              <Input
                label="Date From"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                max={dateTo || undefined}
              />
            </div>

            {/* Date To */}
            <div className="min-w-[150px] flex-1">
              <Input
                label="Date To"
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                min={dateFrom || undefined}
              />
            </div>

            {hasFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 mb-0.5 shrink-0"
              >
                <X size={12} />
                Reset
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI STRIP */}
      {!loading && orgAvg !== null && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Org avg risk */}
          <Card className="border border-slate-800 bg-slate-900/40 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: riskColor(orgAvg) }} />
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Org Avg Risk</span>
                <p className="text-3xl font-extrabold text-white">{orgAvg}</p>
                <Badge variant={getRiskLevel(orgAvg)}>{getRiskLevel(orgAvg).replace('-', ' ')}</Badge>
              </div>
              <div className="h-12 w-12 rounded-xl flex items-center justify-center border" style={{ background: `${riskColor(orgAvg)}18`, borderColor: `${riskColor(orgAvg)}33` }}>
                <ShieldAlert size={22} style={{ color: riskColor(orgAvg) }} />
              </div>
            </CardContent>
          </Card>

          {/* Highest risk dept */}
          <Card className="border border-slate-800 bg-slate-900/40 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Highest Risk</span>
                <p className="text-xl font-extrabold text-white leading-tight">{worst?.department_name ?? '—'}</p>
                <p className="text-sm font-semibold text-red-400">{worst ? `Score: ${worst.avg_risk_score}` : ''}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
                <AlertTriangle size={22} />
              </div>
            </CardContent>
          </Card>

          {/* Best dept */}
          <Card className="border border-slate-800 bg-slate-900/40 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Best Performing</span>
                <p className="text-xl font-extrabold text-white leading-tight">{best?.department_name ?? '—'}</p>
                <p className="text-sm font-semibold text-emerald-400">{best ? `Score: ${best.avg_risk_score}` : ''}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 size={22} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <Card className="border border-slate-800 bg-slate-900/40 p-16 flex justify-center items-center">
          <div className="text-center space-y-3">
            <RefreshCw className="animate-spin text-primary-500 mx-auto" size={32} />
            <p className="text-sm text-slate-400">Computing department risk vectors…</p>
          </div>
        </Card>
      ) : (
        <>
          {/* HEAT GRID */}
          <Card className="border border-slate-800 bg-slate-900/40 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-primary-400" />
                Department Risk Heat-Grid
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Each tile represents one department. Color maps to the risk score scale — green (excellent) → yellow (good) → orange (needs improvement) → red (critical).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mb-5 pb-4 border-b border-slate-800">
                {[
                  { label: 'Excellent (≥90)', color: '#10b981' },
                  { label: 'Good (≥70)',      color: '#eab308' },
                  { label: 'Needs Work (≥50)',color: '#f97316' },
                  { label: 'Critical (<50)',  color: '#ef4444' },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>

              {depts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No department data found for the selected filters.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {depts.map(dept => (
                    <div
                      key={dept.department_id}
                      className="rounded-xl border p-4 space-y-2.5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-default"
                      style={riskBgStyle(dept.avg_risk_score)}
                    >
                      {/* Dept name */}
                      <div className="text-xs font-bold text-white leading-tight line-clamp-2" title={dept.department_name}>
                        {dept.department_name}
                      </div>

                      {/* Risk Score — big focal number */}
                      <div className="flex items-end justify-between gap-1">
                        <span className="text-2xl font-extrabold" style={{ color: riskColor(dept.avg_risk_score) }}>
                          {dept.avg_risk_score}
                        </span>
                        <Badge variant={getRiskLevel(dept.avg_risk_score)} className="text-[10px] px-1.5 py-0.5 shrink-0">
                          {getRiskLevel(dept.avg_risk_score) === 'needs-improvement' ? 'Needs Work' : getRiskLevel(dept.avg_risk_score)}
                        </Badge>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Click rate</span>
                          <span className="font-semibold text-slate-300">{(dept.click_rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Report rate</span>
                          <span className="font-semibold text-slate-300">{(dept.report_rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1"><Users size={9} /> Users</span>
                          <span className="font-semibold text-slate-300">{dept.user_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Monthly Risk Trend */}
            <ChartWrapper
              title="Monthly Risk Score Trend"
              description="6-month rolling average risk score across the filtered population"
              height={300}
            >
              <LineChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                <Tooltip content={<ChartTooltip valueFormatter={v => v !== null ? String(v) : '—'} />} />
                <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Line
                  type="monotone"
                  dataKey="Avg Risk"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ChartWrapper>

            {/* Department Ranking Bar */}
            <ChartWrapper
              title="Department Risk Ranking"
              description="Departments sorted by average risk score — higher is safer"
              height={300}
            >
              <BarChart data={rankChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={10} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} width={90} />
                <Tooltip content={<ChartTooltip valueFormatter={v => String(v)} />} />
                <Bar dataKey="Risk Score" radius={[0, 4, 4, 0]}>
                  {rankChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ChartWrapper>

            {/* Campaign Success Rate */}
            <ChartWrapper
              title="Campaign Success Rate"
              description="Clicked vs Reported counts per campaign — reporting indicates employee awareness"
              height={300}
              className="lg:col-span-2"
            >
              <BarChart data={campChartData.length ? campChartData : [{ name: 'No data', Clicked: 0, Reported: 0 }]} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={55}
                />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Bar dataKey="Clicked"  fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Reported" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartWrapper>
          </div>
        </>
      )}
    </div>
  );
}
