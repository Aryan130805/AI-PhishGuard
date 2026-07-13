import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Users, Mail, BarChart3, Settings, Menu, TrendingUp, FileSpreadsheet, ShieldAlert, Cpu, LogIn } from 'lucide-react';
import NotificationBell from '../components/ui/NotificationBell';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (location.pathname === '/admin/login') return;

    fetch('http://localhost:8000/users/me', {
      credentials: 'include'
    })
    .then(res => {
      if (!res.ok) {
        throw new Error("Unauthorized");
      }
      return res.json();
    })
    .then(data => setProfile(data))
    .catch(() => {
      navigate('/admin/login');
    });
  }, [location.pathname, navigate]);

  const navigation = [
    { name: 'Dashboard', to: '/admin/dashboard', icon: BarChart3 },
    { name: 'Campaigns', to: '/admin/campaigns', icon: Mail },
    { name: 'Analytics', to: '/admin/analytics', icon: TrendingUp },
    { name: 'Reports', to: '/admin/reports', icon: FileSpreadsheet },
    { name: 'Users', to: '/admin/users', icon: Users },
    { name: 'Heatmap', to: '/admin/heatmap', icon: ShieldAlert },
    { name: 'AI Generator', to: '/admin/ai-generator', icon: Cpu },
    { name: 'Login Page', to: '/admin/login', icon: LogIn },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <Link to="/admin" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <Shield size={20} className="fill-blue-200/20" />
              </div>
              Phish<span className="text-blue-500">Guard</span>
              <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 ml-2">
                Admin
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell role="admin" />
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-blue-500/20">
                AD
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-300">Admin Panel</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0 -translate-x-64'} transition-all duration-300 border-r border-slate-900 bg-slate-900/50 backdrop-blur-sm overflow-hidden flex flex-col`}>
          <nav className="flex-1 space-y-1 px-3 py-6">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                end
                className={({ isActive }: { isActive: boolean }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`
                }
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-900">
            <button 
              onClick={async () => {
                try {
                  await fetch('http://localhost:8000/auth/logout', { method: 'POST', credentials: 'include' });
                } catch {}
                navigate('/admin/login');
              }}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-sm font-medium transition-colors"
            >
              Exit to Portal
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 bg-slate-950 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
