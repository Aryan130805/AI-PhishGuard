import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, BookOpen, Award, User, Bell, LayoutDashboard } from 'lucide-react';
import NotificationBell from '../components/ui/NotificationBell';

export default function EmployeeLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<{ email: string; department_name?: string } | null>(null);

  useEffect(() => {
    if (location.pathname === '/employee/login') return;

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
      navigate('/employee/login');
    });
  }, [location.pathname, navigate]);

  const navigation = [
    { name: 'Dashboard', to: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'Lessons', to: '/employee/lessons', icon: BookOpen },
    { name: 'Certificates', to: '/employee/certificates', icon: Award },
    { name: 'Notifications', to: '/employee/notifications', icon: Bell },
    { name: 'Profile', to: '/employee/profile', icon: User },
  ];

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8000/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    navigate('/employee/login');
  };

  const getInitials = () => {
    if (!profile) return '??';
    return profile.email.substring(0, 2).toUpperCase();
  };

  const displayName = () => {
    if (!profile) return 'Loading...';
    return profile.email.split('@')[0].replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link to="/employee" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
              <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
                <Shield size={20} className="fill-emerald-200/20" />
              </div>
              Phish<span className="text-emerald-500">Guard</span>
              <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 ml-2">
                Employee
              </span>
            </Link>
            
            <nav className="hidden md:flex space-x-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  end
                  className={({ isActive }: { isActive: boolean }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`
                  }
                >
                  <item.icon size={16} />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell role="employee" />
            <div className="h-8 w-px bg-slate-800"></div>
            {profile && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-emerald-500/20">
                  {getInitials()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-300">{displayName()}</p>
                  <p className="text-[10px] text-slate-500">{profile.department_name || 'General'}</p>
                </div>
              </div>
            )}
            <div className="h-8 w-px bg-slate-800"></div>
            {profile ? (
              <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                Logout
              </button>
            ) : (
              <Link to="/employee/login" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden border-b border-slate-900 bg-slate-900/30 px-4 py-2 flex justify-around">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            end
            className={({ isActive }: { isActive: boolean }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                isActive ? 'text-emerald-400' : 'text-slate-400'
              }`
            }
          >
            <item.icon size={16} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </div>
    </div>
  );
}
