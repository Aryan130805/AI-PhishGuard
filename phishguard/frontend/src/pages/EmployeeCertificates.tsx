import { useEffect, useState } from 'react';
import { Award, Download, FileText, CheckCircle, Calendar } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface Certificate {
  id: number;
  lesson_id: number;
  lesson_title: string;
  issued_at: string;
}

export default function EmployeeCertificates() {
  const { addToast } = useToast();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('employee_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('http://localhost:8000/certificates', {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        setCerts(await res.json());
      } else {
        addToast({ title: 'Load Error', description: 'Could not load your certificates.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Network Error', description: 'Could not connect to server.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (cert: Certificate) => {
    setDownloading(cert.id);
    try {
      const token = localStorage.getItem('employee_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`http://localhost:8000/certificates/${cert.id}/download`, {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate_${cert.lesson_title.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        addToast({ title: 'Download Started', description: 'Your certificate PDF is downloading.', type: 'success' });
      } else {
        addToast({ title: 'Download Failed', description: 'Certificate file not available.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Network Error', description: 'Could not fetch certificate.', type: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Certificates of Achievement</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your earned compliance certifications. Download PDF copies to share with your manager.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          Loading certificates...
        </div>
      ) : certs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 rounded-2xl text-center">
          <Award size={48} className="text-slate-700 mb-3" />
          <p className="text-base font-bold text-slate-400">No Certificates Yet</p>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            Complete assigned training modules and pass their quizzes to earn compliance certificates.
          </p>
        </div>
      ) : (
        <>
          {/* Summary banner */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{certs.length} Certificate{certs.length !== 1 ? 's' : ''} Earned</p>
              <p className="text-xs text-slate-400">You have demonstrated security awareness across {certs.length} training module{certs.length !== 1 ? 's' : ''}.</p>
            </div>
          </div>

          {/* Certificate Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {certs.map(cert => (
              <div
                key={cert.id}
                className="group relative rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                {/* Decorative background */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <Award size={20} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                      Certified
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-extrabold text-white text-base leading-snug mb-1">{cert.lesson_title}</h3>
                  <p className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
                    <Calendar size={11} />
                    Issued {formatDate(cert.issued_at)}
                  </p>

                  {/* Decorative cert lines */}
                  <div className="space-y-1.5 mb-5 opacity-30">
                    <div className="h-1 rounded bg-slate-700 w-full" />
                    <div className="h-1 rounded bg-slate-700 w-3/4" />
                    <div className="h-1 rounded bg-slate-700 w-1/2" />
                  </div>

                  {/* Download button */}
                  <button
                    onClick={() => handleDownload(cert)}
                    disabled={downloading === cert.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 hover:text-emerald-300 text-sm font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-wait"
                  >
                    {downloading === cert.id ? (
                      <>
                        <FileText size={16} className="animate-pulse" /> Preparing...
                      </>
                    ) : (
                      <>
                        <Download size={16} /> Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
