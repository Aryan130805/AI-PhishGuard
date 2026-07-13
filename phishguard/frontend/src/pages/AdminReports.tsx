import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, type Column } from '../components/ui/Table';
import { useToast } from '../components/ui/Toast';
import {
  FileSpreadsheet, FileText, FolderArchive, RefreshCw, Download,
  Loader2, CheckCircle2, AlertTriangle, Clock, Send,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReportRow {
  report_id: number;
  job_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  type: string;
  generated_at: string;
  date_from: string | null;
  date_to: string | null;
  department_id: number | null;
  formats: string[] | null;
  file_paths: Record<string, string> | null;
  error_message: string | null;
}

interface DeptOption { department_id: number; department_name: string; }

const API_BASE = 'http://localhost:8000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    pending: { icon: <Clock size={11} />, label: 'Pending', cls: 'bg-slate-800 text-slate-300 border-slate-700' },
    running: { icon: <Loader2 size={11} className="animate-spin" />, label: 'Running', cls: 'bg-primary-500/10 text-primary-400 border-primary-500/20' },
    completed: { icon: <CheckCircle2 size={11} />, label: 'Completed', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    failed: { icon: <AlertTriangle size={11} />, label: 'Failed', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const s = map[status] ?? map['pending'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

function formatIcon(fmt: string) {
  if (fmt === 'pdf') return <FileText size={12} className="text-red-400" />;
  if (fmt === 'excel') return <FileSpreadsheet size={12} className="text-emerald-400" />;
  return <FolderArchive size={12} className="text-blue-400" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminReports() {
  const { success, error, info } = useToast();

  // Filter options
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([]);

  // Form state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [fmtPdf, setFmtPdf] = useState(true);
  const [fmtExcel, setFmtExcel] = useState(true);
  const [fmtCsv, setFmtCsv] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Active job polling
  const [activeJob, setActiveJob] = useState<{ reportId: number; jobId: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // History table
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ─── Auth helper ───────────────────────────────────────────────────────────
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: { ...options.headers, 'Content-Type': 'application/json' },
    });
  }, []);

  // ─── Load dept options ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchWithAuth(`${API_BASE}/analytics/departments`)
      .then(r => r.ok ? r.json() : [])
      .then(setDeptOptions)
      .catch(() => {});
  }, [fetchWithAuth]);

  // ─── Load report history ───────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const r = await fetchWithAuth(`${API_BASE}/reports/`);
      if (r.ok) setReports(await r.json());
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }, [fetchWithAuth]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ─── Poll active job ───────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => {
    if (!activeJob) return;
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetchWithAuth(`${API_BASE}/reports/${activeJob.reportId}/status`);
        if (!r.ok) return;
        const data: ReportRow = await r.json();
        if (data.status === 'completed') {
          stopPolling();
          setActiveJob(null);
          success('Report generation complete! Download links are now available.');
          loadHistory();
        } else if (data.status === 'failed') {
          stopPolling();
          setActiveJob(null);
          error(`Report generation failed: ${data.error_message ?? 'Unknown error'}`);
          loadHistory();
        }
        // Update row in-place in the table while polling
        setReports(prev => prev.map(row => row.report_id === data.report_id ? data : row));
      } catch { /* silent */ }
    }, 2500);
    return stopPolling;
  }, [activeJob, fetchWithAuth, stopPolling, success, error, loadHistory]);

  // ─── Submit handler ────────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const formats = [fmtPdf && 'pdf', fmtExcel && 'excel', fmtCsv && 'csv'].filter(Boolean) as string[];
    if (formats.length === 0) { error('Select at least one export format.'); return; }

    setGenerating(true);
    try {
      const body: Record<string, unknown> = { type: 'executive_summary', formats };
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;
      if (deptFilter) body.department_id = parseInt(deptFilter, 10);

      const r = await fetchWithAuth(`${API_BASE}/reports/generate`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Generation request failed');
      }

      const data = await r.json();
      info(`Report queued (ID #${data.report_id}). Generating files…`);
      setActiveJob({ reportId: data.report_id, jobId: data.job_id });
      // Add pending row immediately
      setReports(prev => [{
        report_id: data.report_id,
        job_id: data.job_id,
        status: 'pending',
        type: 'executive_summary',
        generated_at: new Date().toISOString(),
        date_from: dateFrom || null,
        date_to: dateTo || null,
        department_id: deptFilter ? parseInt(deptFilter, 10) : null,
        formats,
        file_paths: null,
        error_message: null,
      }, ...prev]);
    } catch (err: any) {
      error(err.message ?? 'Failed to queue report.');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Download handler ──────────────────────────────────────────────────────
  const handleDownload = async (reportId: number, fmt: string) => {
    const token = localStorage.getItem('token') ?? '';
    const a = document.createElement('a');
    a.href = `${API_BASE}/reports/download/${reportId}/${fmt}`;
    a.download = `phishguard_report_${reportId}.${fmt === 'csv' ? 'zip' : fmt}`;
    // Pass auth via query param for file downloads (standard pattern for FileResponse)
    // Or we can open in new tab with auth header via fetch blob
    try {
      const r = await fetchWithAuth(`${API_BASE}/reports/download/${reportId}/${fmt}`);
      if (!r.ok) throw new Error('Download failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = a.download;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      error(`Could not download ${fmt.toUpperCase()} report.`);
    }
  };

  // ─── Table columns ─────────────────────────────────────────────────────────
  const columns: Column<ReportRow>[] = [
    {
      key: 'generated_at',
      label: 'Generated At',
      sortable: true,
      render: row => (
        <span className="text-xs text-slate-400 font-mono">
          {new Date(row.generated_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: row => statusBadge(row.status),
    },
    {
      key: 'date_from',
      label: 'Date Range',
      render: row => (
        <span className="text-xs text-slate-400 font-mono">
          {row.date_from ? `${row.date_from} → ${row.date_to ?? 'now'}` : 'All time'}
        </span>
      ),
    },
    {
      key: 'department_id',
      label: 'Department',
      render: row => {
        const d = deptOptions.find(d => d.department_id === row.department_id);
        return (
          <span className="text-xs text-slate-400">
            {d ? d.department_name : row.department_id ? `#${row.department_id}` : 'All'}
          </span>
        );
      },
    },
    {
      key: 'formats',
      label: 'Formats',
      render: row => (
        <div className="flex items-center gap-1.5">
          {(row.formats ?? []).map(f => (
            <span key={f} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-700 bg-slate-800/60 text-slate-300">
              {formatIcon(f)} {f.toUpperCase()}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'file_paths',
      label: 'Download',
      render: row => {
        if (row.status !== 'completed' || !row.file_paths) {
          return <span className="text-xs text-slate-600">—</span>;
        }
        const fmts = Object.keys(row.file_paths);
        return (
          <div className="flex items-center gap-2 flex-wrap">
            {fmts.map(fmt => (
              <button
                key={fmt}
                onClick={() => handleDownload(row.report_id, fmt)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-150 hover:scale-105 active:scale-95"
                style={
                  fmt === 'pdf'
                    ? { borderColor: 'rgba(239,68,68,0.4)', color: '#f87171', background: 'rgba(239,68,68,0.08)' }
                    : fmt === 'excel'
                    ? { borderColor: 'rgba(16,185,129,0.4)', color: '#34d399', background: 'rgba(16,185,129,0.08)' }
                    : { borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8', background: 'rgba(99,102,241,0.08)' }
                }
              >
                <Download size={11} />
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        );
      },
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-300">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20">
              <FileSpreadsheet size={20} />
            </span>
            Executive Reports
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Generate AI-narrated PDF/Excel/CSV reports — all statistics sourced directly from the database.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadHistory}
          disabled={loadingHistory}
          className="flex items-center gap-2 border-slate-800 hover:bg-slate-900 shrink-0"
        >
          <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
          Refresh History
        </Button>
      </div>

      {/* GENERATE FORM */}
      <Card className="border border-slate-800 bg-slate-900/40 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Send size={15} className="text-primary-400" />
            Generate New Report
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Choose filters and export formats. The report is generated asynchronously — you'll see it appear in the history table below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-5">

            {/* Date range + department */}
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[160px] flex-1">
                <Input label="Date From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={dateTo || undefined} />
              </div>
              <div className="min-w-[160px] flex-1">
                <Input label="Date To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom || undefined} />
              </div>
              <div className="min-w-[200px] flex-1">
                <Select
                  label="Department"
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Departments' },
                    ...deptOptions.map(d => ({ value: String(d.department_id), label: d.department_name })),
                  ]}
                />
              </div>
            </div>

            {/* Format toggles */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Export Formats</span>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'pdf',   label: 'PDF Report',      icon: <FileText size={14} />,         color: 'red',     checked: fmtPdf,   set: setFmtPdf },
                  { key: 'excel', label: 'Excel Workbook',  icon: <FileSpreadsheet size={14} />,  color: 'emerald', checked: fmtExcel, set: setFmtExcel },
                  { key: 'csv',   label: 'CSV Archive',     icon: <FolderArchive size={14} />,      color: 'indigo',  checked: fmtCsv,   set: setFmtCsv },
                ].map(({ key, label, icon, color, checked, set }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set(v => !v)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-150 ${
                      checked
                        ? color === 'red'
                          ? 'border-red-500/40 bg-red-500/10 text-red-400'
                          : color === 'emerald'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                        : 'border-slate-700 bg-slate-800/40 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {icon}
                    {label}
                    {checked && <CheckCircle2 size={13} className="ml-1" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-4 pt-1">
              <Button
                type="submit"
                variant="primary"
                disabled={generating || (!fmtPdf && !fmtExcel && !fmtCsv)}
                className="flex items-center gap-2 min-w-[180px]"
              >
                {generating
                  ? <><Loader2 size={14} className="animate-spin" /> Queuing…</>
                  : <><Send size={14} /> Generate Report</>
                }
              </Button>
              {activeJob && (
                <div className="flex items-center gap-2 text-xs text-primary-400">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Generating report #{activeJob.reportId}… polling for updates</span>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* INFO STRIP */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3 flex items-start gap-3">
        <div className="h-6 w-6 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 size={13} className="text-primary-400" />
        </div>
        <div className="text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Data integrity guarantee:</span>{' '}
          All numeric figures in generated reports are computed directly from the PhishGuard database.
          The AI model is used only to write narrative summary text and recommendations — it cannot
          generate or alter statistical values.
        </div>
      </div>

      {/* HISTORY TABLE */}
      <Card className="border border-slate-800 bg-slate-900/40 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-white">Report History</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Previously generated reports. Click format buttons to download files.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-sm">Loading report history…</span>
            </div>
          ) : (
            <Table
              columns={columns}
              data={reports}
              emptyStateMessage="No reports generated yet. Use the form above to generate your first executive report."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
