import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { apiFetch } from '../lib/api';
import { 
  ShieldAlert, Mail, CheckCircle, RefreshCw, KeyRound
} from 'lucide-react';

interface LandingInfo {
  theme: string;
  difficulty: string;
  language: string;
  subject: string;
  sender_name: string;
  cta_text: string;
}

export default function SimulatedLanding() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [landingInfo, setLandingInfo] = useState<LandingInfo | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await apiFetch(`/track/landing-info/${token}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setLandingInfo(data);
          setEmail('employee@company.com'); // Mock prefill
        }
      } catch (err) {
        console.error("Failed to load landing info", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    try {
      // Send credentials submitted event to backend, NEVER send the password
      await apiFetch(`/track/credentials/${token}`, {
        method: 'POST'
      }).catch(() => null);
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to log credentials submission", err);
      setSubmitted(true); // Fallback to proceed to teaching page anyway
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    setReporting(true);
    try {
      const res = await apiFetch('/report', {
        method: 'POST',
        body: JSON.stringify({ token })
      }).catch(() => null);
      if (res && res.ok) {
        setReported(true);
      }
    } catch (err) {
      console.error("Failed to report", err);
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="animate-spin text-blue-500 mx-auto" size={32} />
          <p className="text-sm text-slate-400">Loading secure portal environment...</p>
        </div>
      </div>
    );
  }

  // Determine rendering theme
  const theme = landingInfo?.theme?.toLowerCase() || '';
  const isMicrosoft = theme.includes('microsoft') || theme.includes('outlook') || theme.includes('office') || theme.includes('o365') || theme.includes('support');
  const isHR = theme.includes('hr') || theme.includes('benefits') || theme.includes('payroll');

  // RENDER THE POST-SUBMISSION EDUCATION PAGE
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-red-500/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 h-[400px] w-[400px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>

        <div className="max-w-2xl w-full space-y-6 relative z-10 animate-in fade-in duration-300">
          <Card className="border border-red-500/30 bg-red-950/10 p-6 shadow-2xl">
            <CardHeader className="text-center pb-4 border-b border-slate-800">
              <div className="mx-auto w-14 h-14 bg-red-500/10 text-red-500 flex items-center justify-center rounded-full mb-3 border border-red-500/20">
                <ShieldAlert size={28} className="animate-bounce" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-white tracking-tight">
                Simulated Phishing Drill Awareness Alert
              </CardTitle>
              <CardDescription className="text-red-400 font-semibold text-xs mt-1">
                You just interacted with a controlled sandbox security training simulation.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="text-sm text-slate-300 space-y-4">
                <p>
                  <strong>Do not worry:</strong> This was a simulated phishing drill set up by your organization's IT security team. No real credentials were stolen or saved, and your data remains completely secure.
                </p>
                <p className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg text-xs leading-relaxed text-slate-400">
                  <span className="font-bold text-slate-200">What is this drill?</span> In a real attack, hackers use deceptive lures matching themes like IT support credentials updates, payroll corrections, or password expiry alerts to trick employees into disclosing sensitive information.
                </p>
              </div>

              {/* Training Guidelines Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <KeyRound size={16} className="text-amber-500" />
                  Key Security Takeaways
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-amber-400">Inspect the Sender's Domain</p>
                    <p className="text-[11px] text-slate-400">
                      The simulated email was sent from an external domain address. Real support services only email from the company's verified domains.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-amber-400">Analyze the Address Bar URL</p>
                    <p className="text-[11px] text-slate-400">
                      Before type-checking passwords, verify that the browser address bar matches the exact hostname of the expected official application.
                    </p>
                  </div>
                  {isMicrosoft && (
                    <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 space-y-2 md:col-span-2">
                      <p className="text-xs font-bold text-blue-400">Microsoft Login Tips</p>
                      <p className="text-[11px] text-slate-400">
                        Microsoft accounts will always host sign-ins on <strong>login.microsoftonline.com</strong> or trusted Microsoft domains. Never trust unsolicited login dialogs opened via link shorteners or unexpected emails.
                      </p>
                    </div>
                  )}
                  {isHR && (
                    <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 space-y-2 md:col-span-2">
                      <p className="text-xs font-bold text-emerald-400">HR Benefits Warning Signs</p>
                      <p className="text-[11px] text-slate-400">
                        Any notification urging you to quickly confirm bank account numbers, payroll allocations, or health policies must be verified directly with the HR team in person or via telephone.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reporting Action */}
              <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 text-center md:text-left">
                  Please click the report button to flag this email as a simulated drill to update your employee reporting record.
                </div>
                {reported ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-2 rounded-lg">
                    <CheckCircle size={16} />
                    Reported successfully
                  </div>
                ) : (
                  <Button 
                    variant="primary" 
                    onClick={handleReport}
                    disabled={reporting}
                    className="bg-red-600 hover:bg-red-500 font-bold px-5 text-white transition-all shadow-lg shadow-red-500/20"
                  >
                    {reporting ? 'Submitting report...' : 'Report Simulation Drill'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 1. RENDER MICROSOFT LOGIN TEMPLATE
  if (isMicrosoft) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-800 flex items-center justify-center p-4 font-sans" style={{ background: '#242424' }}>
        <div className="max-w-[440px] w-full bg-white p-11 shadow-md border border-gray-300 rounded text-left space-y-6">
          <div className="space-y-4">
            {/* Minimal Microsoft Logo Mock */}
            <div className="flex gap-0.5 items-center">
              <div className="w-4 h-4 bg-red-500"></div>
              <div className="w-4 h-4 bg-emerald-500"></div>
            </div>
            <div className="flex gap-0.5 items-center -mt-3.5">
              <div className="w-4 h-4 bg-blue-500"></div>
              <div className="w-4 h-4 bg-amber-500"></div>
            </div>
            
            <h1 className="text-[24px] font-semibold text-gray-900 tracking-tight">Sign in</h1>
            <p className="text-[13px] text-gray-600">to continue to Outlook Web Access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <input 
                type="email" 
                placeholder="Email, phone, or Skype"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border-b border-gray-400 focus:border-blue-600 py-1 text-[15px] focus:outline-none placeholder-gray-500"
              />
              <input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border-b border-gray-400 focus:border-blue-600 py-1 text-[15px] focus:outline-none placeholder-gray-500"
              />
            </div>

            <div className="text-[13px] text-gray-600 flex justify-between items-center pt-2">
              <span>No account? <a href="#" className="text-blue-600 hover:underline">Create one!</a></span>
            </div>

            <div className="flex justify-end pt-4">
              <input 
                type="submit" 
                value={submitting ? "Signing in..." : "Next"} 
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[15px] px-8 py-1.5 cursor-pointer shadow focus:outline-none"
                style={{ background: '#0067b8', color: 'white' }}
              />
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. RENDER HR BENEFITS PORTAL TEMPLATE
  if (isHR) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans">
        <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-emerald-600">
            <CheckCircle size={22} className="text-emerald-500" />
            <span>Enterprise Payroll & HR Portal</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-lg p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-gray-900">Sign In to Benefits Dashboard</h2>
              <p className="text-xs text-gray-500">Access payroll deductions, benefit status, and employee options.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3 text-left">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Company Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3.5 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Benefits PIN / Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3.5 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg shadow transition-colors"
              >
                {submitting ? 'Authenticating...' : (landingInfo?.cta_text || 'Log In')}
              </Button>
            </form>
          </div>
        </main>

        <footer className="bg-gray-100 border-t border-gray-200 py-3 text-center text-xs text-gray-400">
          This portal environment is restricted to authorized employees only.
        </footer>
      </div>
    );
  }

  // 3. RENDER GENERIC PORTAL LOGIN
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>

      <header className="border-b border-slate-800 py-4 px-6 flex items-center justify-between relative z-10 bg-slate-950/20">
        <div className="flex items-center gap-2 font-bold text-lg text-white">
          <Mail className="text-blue-500" />
          <span>Secure Sign-In Hub</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Security Portal Check</h2>
            <p className="text-xs text-slate-400">Authenticate to view the shared document / notification.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Account Username</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Access PIN / Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-blue-500/10 transition-colors"
            >
              {submitting ? 'Verifying access...' : (landingInfo?.cta_text || 'Sign In')}
            </Button>
          </form>
        </div>
      </main>

      <footer className="border-t border-slate-850 py-3 text-center text-[10px] text-slate-600">
        PhishGuard secure sandbox verification portal.
      </footer>
    </div>
  );
}
