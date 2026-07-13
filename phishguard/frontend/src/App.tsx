import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import EmployeeLayout from './layouts/EmployeeLayout';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import { Shield, UserCheck, ShieldAlert, Chrome } from 'lucide-react';
import { ToastProvider } from './components/ui/Toast';

import AdminLogin from './pages/AdminLogin';
import AdminCampaigns from './pages/AdminCampaigns';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminReports from './pages/AdminReports';
import AdminUsers from './pages/AdminUsers';
import AdminHeatmap from './pages/AdminHeatmap';
import AdminAiGenerator from './pages/AdminAiGenerator';
import AdminNotifications from './pages/AdminNotifications';

import EmployeeLogin from './pages/EmployeeLogin';
import EmployeeLessons from './pages/EmployeeLessons';
import EmployeeQuiz from './pages/EmployeeQuiz';
import EmployeeCertificates from './pages/EmployeeCertificates';
import EmployeeProfile from './pages/EmployeeProfile';
import EmployeeNotifications from './pages/EmployeeNotifications';
import SimulatedLanding from './pages/SimulatedLanding';

function PortalSelection() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full space-y-8 text-center relative z-10">
        <div className="flex flex-col items-center">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mb-4 text-blue-500 animate-pulse">
            <Shield size={48} className="fill-blue-500/10" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Phish<span className="text-blue-500">Guard</span>
          </h1>
          <p className="mt-3 text-slate-400 text-sm max-w-xs">
            Phishing simulation, security awareness training, and reporting metrics dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-8">
          {/* Admin Entry Card */}
          <Link
            to="/admin"
            className="group relative overflow-hidden rounded-xl border border-slate-800 hover:border-blue-500/50 bg-slate-900/40 p-5 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">Admin Dashboard</p>
                <p className="text-xs text-slate-400">Launch campaigns, manage employees, and review analytics.</p>
              </div>
              <ShieldAlert size={20} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Employee Entry Card */}
          <Link
            to="/employee"
            className="group relative overflow-hidden rounded-xl border border-slate-800 hover:border-emerald-500/50 bg-slate-900/40 p-5 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/5"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">Employee Portal</p>
                <p className="text-xs text-slate-400">Review training materials and inspect phishing badges.</p>
              </div>
              <UserCheck size={20} className="text-emerald-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Extension Info */}
          <div className="rounded-xl border border-slate-900 bg-slate-950 p-4 flex items-center justify-between text-xs text-slate-500 border-dashed">
            <div className="flex items-center gap-2">
              <Chrome size={16} />
              <span>Manifest V3 extension simulator ready</span>
            </div>
            <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-full text-[10px] text-slate-400">Active</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-900 text-xs text-slate-600">
          This is an authorized training sandbox environment.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PortalSelection />} />
          
          {/* Admin Section */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="login" element={<AdminLogin />} />
            <Route path="campaigns" element={<AdminCampaigns />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="heatmap" element={<AdminHeatmap />} />
            <Route path="ai-generator" element={<AdminAiGenerator />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="employees" element={<div className="p-4"><h2 className="text-xl font-bold text-white">Employee Management</h2><p className="text-sm text-slate-400 mt-2">Placeholder for employee database.</p></div>} />
            <Route path="templates" element={<div className="p-4"><h2 className="text-xl font-bold text-white">Template Sandbox</h2><p className="text-sm text-slate-400 mt-2">Placeholder for phishing emails editor.</p></div>} />
            <Route path="settings" element={<div className="p-4"><h2 className="text-xl font-bold text-white">Settings</h2><p className="text-sm text-slate-400 mt-2">Placeholder for system configuration parameters.</p></div>} />
          </Route>

          {/* Employee Section */}
          <Route path="/employee" element={<EmployeeLayout />}>
            <Route index element={<EmployeeDashboard />} />
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="login" element={<EmployeeLogin />} />
            <Route path="lessons" element={<EmployeeLessons />} />
            <Route path="quiz/:id" element={<EmployeeQuiz />} />
            <Route path="certificates" element={<EmployeeCertificates />} />
            <Route path="profile" element={<EmployeeProfile />} />
            <Route path="notifications" element={<EmployeeNotifications />} />
            <Route path="badges" element={<div className="p-4"><h2 className="text-xl font-bold text-white">My Badges</h2><p className="text-sm text-slate-400 mt-2">Placeholder for earned credentials list.</p></div>} />
            <Route path="report" element={<div className="p-4"><h2 className="text-xl font-bold text-white">Report Phishing</h2><p className="text-sm text-slate-400 mt-2">Placeholder for reporting simulated phishing emails.</p></div>} />
            <Route path="support" element={<div className="p-4"><h2 className="text-xl font-bold text-white">Support</h2><p className="text-sm text-slate-400 mt-2">Placeholder for security support center.</p></div>} />
          </Route>
          <Route path="/simulated-landing/:token" element={<SimulatedLanding />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
