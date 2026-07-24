import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  Shield, Menu, X, LogOut, Home, Target, Mail, FileCode, Sparkles,
  Users, Building2, UserCheck, Brain, Bot, FileText, TrendingUp,
  BarChart3, Flame, Activity, GraduationCap, Workflow, HelpCircle,
  Award, ChevronDown, User, CreditCard, Settings, LogIn
} from 'lucide-react';
import NotificationBell from '../components/ui/NotificationBell';
import PhishGuardAIChat from '../components/ui/PhishGuardAIChat';
import { useAuth } from '../AuthContext';

interface NavGroup {
  category: string;
  icon: React.ElementType;
  items: {
    name: string;
    to: string;
    icon: React.ElementType;
    description?: string;
  }[];
}

export default function AdminLayout() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navGroups: NavGroup[] = [
    {
      category: 'Overview',
      icon: Home,
      items: [
        { name: 'Dashboard', to: '/admin/dashboard', icon: Home, description: 'Admin metrics & summary' },
      ],
    },
    {
      category: 'Simulations',
      icon: Target,
      items: [
        { name: 'Campaigns', to: '/admin/campaigns', icon: Mail, description: 'Phishing campaign manager' },
        { name: 'Templates', to: '/admin/templates', icon: FileCode, description: 'Phishing email templates' },
        { name: 'AI Campaign Generator', to: '/admin/ai-generator', icon: Sparkles, description: 'Generate AI test campaigns' },
      ],
    },
    {
      category: 'Employees',
      icon: Users,
      items: [
        { name: 'Employees', to: '/admin/users', icon: UserCheck, description: 'User & staff management' },
        { name: 'Departments', to: '/admin/departments', icon: Building2, description: 'Department performance' },
        { name: 'Groups', to: '/admin/groups', icon: Users, description: 'Phishing target groups' },
      ],
    },
    {
      category: 'AI Center',
      icon: Brain,
      items: [
        { name: 'AI Email Generator', to: '/admin/ai-generator', icon: Bot, description: 'AI email crafting engine' },
        { name: 'AI Coach', to: '/admin/ai-coach', icon: GraduationCap, description: 'Automated security coach' },
        { name: 'AI Report Generator', to: '/admin/reports', icon: FileText, description: 'Instant executive reports' },
        { name: 'AI Predictions', to: '/admin/ai-predictions', icon: TrendingUp, description: 'Predictive breach risk models' },
      ],
    },
    {
      category: 'Analytics',
      icon: BarChart3,
      items: [
        { name: 'Risk Dashboard', to: '/admin/analytics', icon: BarChart3, description: 'System risk analytics' },
        { name: 'Heat Maps', to: '/admin/heatmap', icon: Flame, description: 'Department threat heat maps' },
        { name: 'Behavioral Analytics', to: '/admin/behavioral-analytics', icon: Activity, description: 'User security behaviors' },
      ],
    },
    {
      category: 'Learning',
      icon: GraduationCap,
      items: [
        { name: 'Adaptive Learning', to: '/admin/adaptive-learning', icon: Workflow, description: 'Adaptive training rules' },
        { name: 'Quizzes', to: '/admin/quizzes', icon: HelpCircle, description: 'Knowledge assessments' },
        { name: 'Progress', to: '/admin/learning-progress', icon: Award, description: 'Training certificates & ranks' },
      ],
    },
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const getInitials = () => {
    if (!user) return 'AD';
    return user.email.substring(0, 2).toUpperCase();
  };

  const displayName = () => {
    if (!user) return 'Admin';
    return user.email.split('@')[0].replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Floating Glassmorphism Navbar */}
      <div className="sticky top-0 z-50 w-full pt-3.5 pb-2 px-3 sm:px-6 transition-all duration-300">
        <header className="max-w-7xl mx-auto rounded-2xl sm:rounded-3xl border border-white/15 bg-slate-900/40 backdrop-blur-2xl backdrop-saturate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] ring-1 ring-white/10 px-4 sm:px-6 hover:border-blue-500/40 hover:bg-slate-900/50 transition-all duration-300">
          <div className="flex h-16 items-center justify-between gap-4">
            
            {/* Left: Brand Logo */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <Link to="/admin" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white mr-4">
                <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-500/20">
                  <Shield size={20} className="fill-blue-200/20" />
                </div>
                Phish<span className="text-blue-500">Guard</span>
              </Link>
            </div>

            {/* Middle: Horizontal Nav Items with Dropdowns (Desktop) */}
            <nav ref={navRef} className="hidden lg:flex items-center space-x-1 relative">
              {navGroups.map((group) => {
                const GroupIcon = group.icon;
                const isOpen = activeDropdown === group.category;
                const isSingleItem = group.items.length === 1;

                if (isSingleItem) {
                  return (
                    <NavLink
                      key={group.category}
                      to={group.items[0].to}
                      end
                      onClick={() => setActiveDropdown(null)}
                      className={({ isActive }: { isActive: boolean }) =>
                        `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`
                      }
                    >
                      <GroupIcon size={15} className="text-blue-400" />
                      <span>{group.category}</span>
                    </NavLink>
                  );
                }

                return (
                  <div key={group.category} className="relative">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setActiveDropdown(isOpen ? null : group.category);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        isOpen
                          ? 'bg-slate-800 text-blue-400 border border-slate-700'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <GroupIcon size={15} className="text-blue-400" />
                      <span>{group.category}</span>
                      <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'}`} />
                    </button>

                    {/* Category Dropdown Menu Popup */}
                    {isOpen && (
                      <div className="absolute top-full left-0 mt-3 w-64 rounded-2xl border border-white/15 bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150 p-2.5 shadow-[0_12px_40px_0_rgba(0,0,0,0.5)] ring-1 ring-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 mb-1 border-b border-slate-800/60">
                          {group.category} Options
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                              <NavLink
                                key={item.name}
                                to={item.to}
                                end
                                onClick={() => setActiveDropdown(null)}
                                className={({ isActive }: { isActive: boolean }) =>
                                  `flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-155 group ${
                                    isActive
                                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/10'
                                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                  }`
                                }
                              >
                                <ItemIcon size={16} className="mt-0.5 text-blue-400 group-hover:scale-110 transition-transform" />
                                <div>
                                  <div className="font-semibold leading-tight">{item.name}</div>
                                  {item.description && (
                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">{item.description}</div>
                                  )}
                                </div>
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Right: Actions & Profile Menu */}
            <div className="flex items-center gap-3">
              <NotificationBell role="admin" />
              <div className="h-6 w-px bg-slate-800"></div>

              {/* Profile Icon with Dropdown Menu */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => {
                    setActiveDropdown(null);
                    setProfileDropdownOpen(!profileDropdownOpen);
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-800 group focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
                    {getInitials()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors leading-tight">{displayName()}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">{user?.organization_name || 'Organization'}</p>
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </button>

                {/* Profile Popup Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-60 rounded-2xl border border-white/15 bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150 p-2.5 shadow-[0_12px_40px_0_rgba(0,0,0,0.5)] ring-1 ring-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User Summary Header */}
                    <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                      <p className="text-xs font-bold text-slate-100 truncate">{user?.email || 'org@phishguard.com'}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                          {user?.organization_name || 'Organization Panel'}
                        </span>
                      </div>
                    </div>

                    {/* Menu Options */}
                    <div className="space-y-0.5">
                      <NavLink
                        to="/admin/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={({ isActive }: { isActive: boolean }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <User size={15} className="text-blue-400" />
                        <span>Profile</span>
                      </NavLink>

                      <NavLink
                        to="/admin/account"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={({ isActive }: { isActive: boolean }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <CreditCard size={15} className="text-blue-400" />
                        <span>Account</span>
                      </NavLink>

                      <NavLink
                        to="/admin/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={({ isActive }: { isActive: boolean }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <Settings size={15} className="text-blue-400" />
                        <span>Settings</span>
                      </NavLink>
                    </div>

                    <div className="border-t border-slate-800/80 my-1"></div>

                    {/* Logout Option */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                    >
                      <LogOut size={15} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Mobile Accordion Navigation Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden my-3 rounded-2xl border border-slate-800/90 bg-slate-900/95 backdrop-blur-2xl px-4 py-3 space-y-3 max-h-[80vh] overflow-y-auto shadow-2xl ring-1 ring-white/10">
              {navGroups.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.category} className="space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800/80">
                      <GroupIcon size={14} />
                      <span>{group.category}</span>
                    </div>
                    <div className="pl-3 space-y-1 mt-1">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <NavLink
                            key={item.name}
                            to={item.to}
                            end
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }: { isActive: boolean }) =>
                              `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                                isActive
                                  ? 'bg-blue-600 text-white font-bold'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`
                            }
                          >
                            <ItemIcon size={15} />
                            <span>{item.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </header>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* PhishGuard AI Floating Chatbot Button & Widget */}
      <PhishGuardAIChat />
    </div>
  );
}
