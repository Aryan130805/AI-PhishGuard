import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './AuthContext';

// ── Guards ────────────────────────────────────────────────────────────────────
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';

// ── Layouts ───────────────────────────────────────────────────────────────────
import AdminLayout from './layouts/AdminLayout';
import EmployeeLayout from './layouts/EmployeeLayout';

// ── Authentication & Portal Pages ─────────────────────────────────────────────
import LandingPage from './pages/LandingPage';
import PortalSelection from './pages/auth/PortalSelection';
import EmployeeAuth from './pages/auth/EmployeeAuth';
import OrganizationAuth from './pages/auth/OrganizationAuth';

// ── Admin Pages ───────────────────────────────────────────────────────────────
import AdminDashboard from './pages/AdminDashboard';
import AdminCampaigns from './pages/AdminCampaigns';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminReports from './pages/AdminReports';
import AdminUsers from './pages/AdminUsers';
import AdminHeatmap from './pages/AdminHeatmap';
import AdminAiGenerator from './pages/AdminAiGenerator';
import AdminNotifications from './pages/AdminNotifications';

// ── Employee Pages ────────────────────────────────────────────────────────────
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeLessons from './pages/EmployeeLessons';
import EmployeeQuiz from './pages/EmployeeQuiz';
import EmployeeCertificates from './pages/EmployeeCertificates';
import EmployeeProfile from './pages/EmployeeProfile';
import EmployeeNotifications from './pages/EmployeeNotifications';
import SimulatedLanding from './pages/SimulatedLanding';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* ── Public Entry & Portal Selection Routes ──────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/portal" element={<PortalSelection />} />
            <Route path="/auth/portal" element={<Navigate to="/portal" replace />} />
            <Route path="/auth/select" element={<Navigate to="/portal" replace />} />

            {/* ── Dedicated Authentication Routes ─────────────────────────── */}
            <Route path="/auth/employee" element={<EmployeeAuth />} />
            <Route path="/auth/organization" element={<OrganizationAuth />} />

            {/* Legacy redirect routes for backwards compatibility */}
            <Route path="/login" element={<Navigate to="/portal" replace />} />
            <Route path="/employee/login" element={<Navigate to="/auth/employee" replace />} />
            <Route path="/admin/login" element={<Navigate to="/auth/organization" replace />} />

            {/* ── Employee Portal (Protected) ────────────────────────────── */}
            <Route element={<EmployeeLayout />}>
              <Route element={<RequireAuth />}>
                <Route path="/dashboard" element={<EmployeeDashboard />} />
                <Route path="/lessons" element={<EmployeeLessons />} />
                <Route path="/quiz/:id" element={<EmployeeQuiz />} />
                <Route path="/quizzes" element={<EmployeeLessons />} />
                <Route path="/certificates" element={<EmployeeCertificates />} />
                <Route path="/profile" element={<EmployeeProfile />} />
                <Route path="/account" element={<EmployeeProfile />} />
                <Route path="/settings" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">Account &amp; Security Settings</h2>
                    <p className="text-sm text-slate-400 mt-2">Manage security preferences, notifications, and authentication settings.</p>
                  </div>
                } />
                <Route path="/notifications" element={<EmployeeNotifications />} />
                <Route path="/campaigns" element={<AdminCampaigns />} />
                <Route path="/templates" element={<AdminAiGenerator />} />
                <Route path="/ai-generator" element={<AdminAiGenerator />} />
                <Route path="/employees" element={<AdminUsers />} />
                <Route path="/departments" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">Department Overview</h2>
                    <p className="text-sm text-slate-400 mt-2">View department training performance and metrics.</p>
                  </div>
                } />
                <Route path="/groups" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">Employee Security Groups</h2>
                    <p className="text-sm text-slate-400 mt-2">Group assignments and security role tiers.</p>
                  </div>
                } />
                <Route path="/ai-email" element={<AdminAiGenerator />} />
                <Route path="/ai-coach" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">AI Security Coach</h2>
                    <p className="text-sm text-slate-400 mt-2">Personalized AI security tips and interactive coaching assistant.</p>
                  </div>
                } />
                <Route path="/ai-report" element={<AdminReports />} />
                <Route path="/ai-predictions" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">AI Predictive Risk</h2>
                    <p className="text-sm text-slate-400 mt-2">AI-driven breach risk forecast and mitigation actions.</p>
                  </div>
                } />
                <Route path="/analytics" element={<AdminAnalytics />} />
                <Route path="/heatmap" element={<AdminHeatmap />} />
                <Route path="/behavioral-analytics" element={<AdminAnalytics />} />
                <Route
                  path="/badges"
                  element={
                    <div className="p-4">
                      <h2 className="text-xl font-bold text-white">My Badges</h2>
                      <p className="text-sm text-slate-400 mt-2">Earned security credentials and achievements.</p>
                    </div>
                  }
                />
                <Route
                  path="/report"
                  element={
                    <div className="p-4">
                      <h2 className="text-xl font-bold text-white">Report Phishing</h2>
                      <p className="text-sm text-slate-400 mt-2">Report suspicious emails or simulated attacks.</p>
                    </div>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <div className="p-4">
                      <h2 className="text-xl font-bold text-white">Support Center</h2>
                      <p className="text-sm text-slate-400 mt-2">Security support and helpdesk resources.</p>
                    </div>
                  }
                />
              </Route>
            </Route>

            {/* Legacy /employee/* redirects */}
            <Route path="/employee" element={<Navigate to="/dashboard" replace />} />
            <Route path="/employee/dashboard" element={<Navigate to="/dashboard" replace />} />

            {/* ── Admin Portal (Protected) ─────────────────────────────────── */}
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="campaigns" element={<AdminCampaigns />} />
                <Route path="templates" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">Email Templates</h2>
                    <p className="text-sm text-slate-400 mt-2">Manage phishing email templates and sandboxes.</p>
                  </div>
                } />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="employees" element={<AdminUsers />} />
                <Route path="departments" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">Department Management</h2>
                    <p className="text-sm text-slate-400 mt-2">Configure organizational units and department structures.</p>
                  </div>
                } />
                <Route path="groups" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">Employee Groups</h2>
                    <p className="text-sm text-slate-400 mt-2">Segment target groups for simulated campaigns.</p>
                  </div>
                } />
                <Route path="heatmap" element={<AdminHeatmap />} />
                <Route path="ai-generator" element={<AdminAiGenerator />} />
                <Route path="ai-coach" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">AI Security Coach</h2>
                    <p className="text-sm text-slate-400 mt-2">Automated security tips and personalized coaching recommendations.</p>
                  </div>
                } />
                <Route path="ai-predictions" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">AI Predictive Risk Modeling</h2>
                    <p className="text-sm text-slate-400 mt-2">Predict future breach probabilities and high-risk department clusters.</p>
                  </div>
                } />
                <Route path="behavioral-analytics" element={<AdminAnalytics />} />
                <Route path="adaptive-learning" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">Adaptive Learning Engine</h2>
                    <p className="text-sm text-slate-400 mt-2">Automated training assignment rules based on campaign click rates.</p>
                  </div>
                } />
                <Route path="quizzes" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">Security Quizzes</h2>
                    <p className="text-sm text-slate-400 mt-2">Manage interactive assessments and passing thresholds.</p>
                  </div>
                } />
                <Route path="learning-progress" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">Training Progress &amp; Leaderboard</h2>
                    <p className="text-sm text-slate-400 mt-2">Track completion metrics and organization-wide certificates.</p>
                  </div>
                } />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="profile" element={
                  <div className="p-6 max-w-4xl mx-auto space-y-6">
                    <div className="border-b border-slate-800 pb-4">
                      <h1 className="text-2xl font-bold text-white">Organization Profile</h1>
                      <p className="text-slate-400 text-sm mt-1">Manage your organization account info and notification preferences.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                        <h3 className="text-base font-semibold text-white">Personal Details</h3>
                        <div className="space-y-3 text-sm">
                          <div>
                            <label className="text-slate-400 text-xs block mb-1">Role</label>
                            <div className="px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-blue-400 font-medium text-xs inline-block">Organization Manager</div>
                          </div>
                          <div>
                            <label className="text-slate-400 text-xs block mb-1">Status</label>
                            <div className="px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-emerald-400 font-medium text-xs inline-block">Active • Verified</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                        <h3 className="text-base font-semibold text-white">Security &amp; Audit</h3>
                        <p className="text-xs text-slate-400">Two-factor authentication (2FA) and session logs are active for all administrator tasks.</p>
                      </div>
                    </div>
                  </div>
                } />
                <Route path="account" element={
                  <div className="p-6 max-w-4xl mx-auto space-y-6">
                    <div className="border-b border-slate-800 pb-4">
                      <h1 className="text-2xl font-bold text-white">Organization Account</h1>
                      <p className="text-slate-400 text-sm mt-1">View organization subscription, security policy standards, and license tier.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-base font-semibold text-white">Subscription &amp; Plan</h3>
                      <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                        <div>
                          <p className="font-semibold text-white">PhishGuard Enterprise Tier</p>
                          <p className="text-xs text-slate-400 mt-0.5">Unlimited campaigns, AI Email Generator, &amp; Behavioral Risk Analytics</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/20">Active</span>
                      </div>
                    </div>
                  </div>
                } />
                <Route path="settings" element={
                  <div className="p-4">
                    <h2 className="text-xl font-bold text-white">System Settings</h2>
                    <p className="text-sm text-slate-400 mt-2">Configure system parameters, API keys, and email delivery integrations.</p>
                  </div>
                } />
              </Route>
            </Route>

            {/* ── Simulated phishing landing ───────────────────────────────── */}
            <Route path="/simulated-landing/:token" element={<SimulatedLanding />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
