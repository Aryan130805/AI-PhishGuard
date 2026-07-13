import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChartWrapper, ChartTooltip } from '../components/ui/ChartWrapper';
import { useToast } from '../components/ui/Toast';
import { 
  RefreshCw, TrendingUp, Percent, Shield, Award
} from 'lucide-react';

interface SummaryData {
  click_rate: number;
  report_rate: number;
  open_rate: number;
  avg_risk_score: number;
  total_users: number;
}

interface TrendItem {
  date: string;
  sent: number;
  clicks: number;
  reports: number;
  click_rate: number;
  report_rate: number;
}

interface DepartmentItem {
  department_id: number;
  department_name: string;
  click_rate: number;
  report_rate: number;
  open_rate: number;
  avg_time_to_click: number;
}

export default function AdminAnalytics() {
  const { success, error } = useToast();
  const [range, setRange] = useState<'30d' | '90d' | '1y'>('30d');
  
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Authentication fetch wrapper
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      }
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, trendsRes, deptsRes] = await Promise.all([
        fetchWithAuth('http://localhost:8000/analytics/summary'),
        fetchWithAuth(`http://localhost:8000/analytics/trends?range=${range}`),
        fetchWithAuth('http://localhost:8000/analytics/departments')
      ]);

      if (summaryRes.ok && trendsRes.ok && deptsRes.ok) {
        setSummary(await summaryRes.json());
        setTrends(await trendsRes.json());
        setDepartments(await deptsRes.json());
      }
    } catch (err) {
      console.error("Failed to load analytics data", err);
      error("Could not fetch simulation metrics. Check server connectivity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  const handleRecompute = async () => {
    setSyncing(true);
    try {
      const res = await fetchWithAuth('http://localhost:8000/analytics/recompute', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        success(`Successfully recomputed metrics for ${data.recomputed_users} employees.`);
        loadData(); // Refresh values
      } else {
        throw new Error("Trigger failed");
      }
    } catch (err) {
      console.error(err);
      error("An error occurred during metrics updates.");
    } finally {
      setSyncing(false);
    }
  };

  // Convert rates to percentages for display on charts
  const trendChartData = trends.map(item => ({
    ...item,
    'Click Rate (%)': Number((item.click_rate * 100).toFixed(1)),
    'Report Rate (%)': Number((item.report_rate * 100).toFixed(1))
  }));

  const deptChartData = departments.map(item => ({
    name: item.department_name,
    'Click Rate (%)': Number((item.click_rate * 100).toFixed(1)),
    'Report Rate (%)': Number((item.report_rate * 100).toFixed(1))
  }));

  const formatPercent = (val: number) => `${Number(val * 100).toFixed(1)}%`;
  const formatRiskScore = (val: number) => Number(val).toFixed(1);

  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Simulation Analytics</h1>
          <p className="mt-2 text-sm text-slate-400">Deep-dive org trends, target click rates, and department metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Range filter buttons */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center">
            <button 
              onClick={() => setRange('30d')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${range === '30d' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              30 Days
            </button>
            <button 
              onClick={() => setRange('90d')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${range === '90d' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              90 Days
            </button>
            <button 
              onClick={() => setRange('1y')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${range === '1y' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              1 Year
            </button>
          </div>

          <Button 
            variant="secondary"
            onClick={handleRecompute}
            disabled={syncing || loading}
            className="flex items-center gap-2 border-slate-800 hover:bg-slate-900"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? 'Recomputing...' : 'Recompute Metrics'}
          </Button>
        </div>
      </div>

      {/* SUMMARY METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-800 bg-slate-900/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Org Click Rate</span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                {summary ? formatPercent(summary.click_rate) : '0.0%'}
              </h2>
              <p className="text-[10px] text-slate-500">Targeted users who opened links</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
              <Percent size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Org Report Rate</span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                {summary ? formatPercent(summary.report_rate) : '0.0%'}
              </h2>
              <p className="text-[10px] text-slate-500">Simulations reported to assistant</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Risk Score</span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                {summary ? formatRiskScore(summary.avg_risk_score) : '15.0'}
              </h2>
              <p className="text-[10px] text-slate-500">Average score across {summary?.total_users || 0} employees</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Shield size={22} />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card className="border border-slate-800 bg-slate-900/40 p-16 flex justify-center items-center">
          <div className="text-center space-y-3">
            <RefreshCw className="animate-spin text-primary-500 mx-auto" size={32} />
            <p className="text-sm text-slate-400">Loading visual intelligence parameters...</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* HISTORICAL TREND LINE CHART */}
          <ChartWrapper 
            title="Simulation Performance Over Time" 
            description="Org-wide daily progression of phishing click rate vs employee report rate"
            height={320}
          >
            <LineChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
              <YAxis unit="%" stroke="#64748b" fontSize={10} />
              <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v}%`} />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Line 
                type="monotone" 
                dataKey="Click Rate (%)" 
                stroke="#ef4444" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4 }} 
              />
              <Line 
                type="monotone" 
                dataKey="Report Rate (%)" 
                stroke="#10b981" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4 }} 
              />
            </LineChart>
          </ChartWrapper>

          {/* DEPARTMENT COMPARISON BAR CHART */}
          <ChartWrapper
            title="Performance Comparison by Department"
            description="Click vs Report rate side-by-side performance of organizational groups"
            height={320}
          >
            <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis unit="%" stroke="#64748b" fontSize={10} />
              <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v}%`} />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Bar dataKey="Click Rate (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Report Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartWrapper>

          {/* QUICK FACTS CARD */}
          <Card className="border border-slate-800 bg-slate-900/40 lg:col-span-2 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                Defensive Intelligence Observations
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Strategic notes automatically compiled based on active training drill outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-sm text-slate-300 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-850 space-y-1.5">
                  <span className="font-bold text-xs text-slate-400 block uppercase tracking-wide">Primary Target Areas</span>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Groups displaying higher click rates should be scheduled for additional targeted training campaigns.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-850 space-y-1.5">
                  <span className="font-bold text-xs text-slate-400 block uppercase tracking-wide">Reporting Timeliness</span>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    A high report rate within the first 24 hours of campaign dispatch is critical to blocking real-world campaigns early.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-850 space-y-1.5">
                  <span className="font-bold text-xs text-slate-400 block uppercase tracking-wide">Drill Optimization</span>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Create a mix of difficulty levels to train employees on both obvious social engineering tell-tales and complex expert indicators.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
