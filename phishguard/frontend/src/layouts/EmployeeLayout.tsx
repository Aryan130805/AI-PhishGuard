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

export default function EmployeeLayout() {
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
        { name: 'Dashboard', to: '/dashboard', icon: Home, description: 'Overview & metrics' },
      ],
    },
    {
      category: 'Simulations',
      icon: Target,
      items: [
        { name: 'Campaigns', to: '/campaigns', icon: Mail, description: 'Active & past phishing tests' },
        { name: 'Templates', to: '/templates', icon: FileCode, description: 'Email template library' },
        { name: 'AI Campaign Generator', to: '/ai-generator', icon: Sparkles, description: 'Generate AI test campaigns' },
      ],
    },
    {
      category: 'Employees',
      icon: Users,
      items: [
        { name: 'Employees', to: '/employees', icon: UserCheck, description: 'User & staff management' },
        { name: 'Departments', to: '/departments', icon: Building2, description: 'Department performance' },
        { name: 'Groups', to: '/groups', icon: Users, description: 'Phishing target groups' },
      ],
    },
    {
      category: 'AI Center',
      icon: Brain,
      items: [
        { name: 'AI Email Generator', to: '/ai-email', icon: Bot, description: 'Craft AI email simulations' },
        { name: 'AI Coach', to: '/ai-coach', icon: GraduationCap, description: 'Personalized AI advice' },
        { name: 'AI Report Generator', to: '/ai-report', icon: FileText, description: 'Instant executive reports' },
        { name: 'AI Predictions', to: '/ai-predictions', icon: TrendingUp, description: 'Risk forecasting' },
      ],
    },
    {
      category: 'Analytics',
      icon: BarChart3,
      items: [
        { name: 'Risk Dashboard', to: '/analytics', icon: BarChart3, description: 'Company & user risk scores' },
        { name: 'Heat Maps', to: '/heatmap', icon: Flame, description: 'Department threat heat map' },
        { name: 'Behavioral Analytics', to: '/behavioral-analytics', icon: Activity, description: 'User security habits' },
      ],
    },
    {
      category: 'Learning',
      icon: GraduationCap,
      items: [
        { name: 'Adaptive Learning', to: '/lessons', icon: Workflow, description: 'Interactive training modules' },
        { name: 'Quizzes', to: '/quizzes', icon: HelpCircle, description: 'Knowledge checks' },
        { name: 'Progress', to: '/certificates', icon: Award, description: 'Certificates & leaderboards' },
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
    navigate('/portal', { replace: true });
  };

  const getInitials = () => {
    if (!user) return 'GU';
    return user.email.substring(0, 2).toUpperCase();
  };

  const displayName = () => {
    if (!user) return 'Guest';
    const namePart = user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return namePart === 'Admin' ? 'Employee' : namePart;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Floating Glassmorphism Navbar */}
      <div className="sticky top-0 z-50 w-full pt-3.5 pb-2 px-3 sm:px-6 transition-all duration-300">
        <header className="max-w-7xl mx-auto rounded-2xl sm:rounded-3xl border border-white/15 bg-slate-900/40 backdrop-blur-2xl backdrop-saturate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] ring-1 ring-white/10 px-4 sm:px-6 hover:border-emerald-500/40 hover:bg-slate-900/50 transition-all duration-300">
          <div className="flex h-16 items-center justify-between gap-4">
            
            {/* Left: Brand Logo */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white mr-4">
                <div className="p-1.5 bg-emerald-600 rounded-lg text-white shadow-md shadow-emerald-500/20">
                  <Shield size={20} className="fill-emerald-200/20" />
                </div>
                Phish<span className="text-emerald-500">Guard</span>
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
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`
                      }
                    >
                      <GroupIcon size={15} className="text-emerald-400" />
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
                          ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <GroupIcon size={15} className="text-emerald-400" />
                      <span>{group.category}</span>
                      <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-400' : 'text-slate-400'}`} />
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
                                  `flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 group ${
                                    isActive
                                      ? 'bg-emerald-600/90 text-white font-bold shadow-md shadow-emerald-500/10'
                                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                  }`
                                }
                              >
                                <ItemIcon size={16} className="mt-0.5 text-emerald-400 group-hover:scale-110 transition-transform" />
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
              <NotificationBell role="employee" />
              <div className="h-6 w-px bg-slate-800"></div>

              {/* Profile Icon with Dropdown Menu */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => {
                    setActiveDropdown(null);
                    setProfileDropdownOpen(!profileDropdownOpen);
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-800 group"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-emerald-500/20 group-hover:bg-emerald-500 transition-colors">
                    {getInitials()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors leading-tight">{displayName()}</p>
                    {user && (
                      <p className="text-[10px] text-slate-400 leading-tight">{user.department_name || 'General Dept'}</p>
                    )}
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                </button>

                {/* Profile Popup Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-60 rounded-2xl border border-white/15 bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150 p-2.5 shadow-[0_12px_40px_0_rgba(0,0,0,0.5)] ring-1 ring-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {user ? (
                      <>
                        {/* User Summary Header */}
                        <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                          <p className="text-xs font-bold text-slate-100">{user.email}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-400 truncate">
                              {user.department_name || 'General Dept'}
                            </span>
                          </div>
                        </div>

                        {/* Menu Options */}
                        <div className="space-y-0.5">
                          <NavLink
                            to="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className={({ isActive }: { isActive: boolean }) =>
                              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`
                            }
                          >
                            <User size={15} className="text-emerald-400" />
                            <span>Profile</span>
                          </NavLink>

                          <NavLink
                            to="/account"
                            onClick={() => setProfileDropdownOpen(false)}
                            className={({ isActive }: { isActive: boolean }) =>
                              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`
                            }
                          >
                            <CreditCard size={15} className="text-emerald-400" />
                            <span>Account</span>
                          </NavLink>

                          <NavLink
                            to="/settings"
                            onClick={() => setProfileDropdownOpen(false)}
                            className={({ isActive }: { isActive: boolean }) =>
                              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`
                            }
                          >
                            <Settings size={15} className="text-emerald-400" />
                            <span>Settings</span>
                          </NavLink>
                        </div>

                        <div className="border-t border-slate-800/80 my-1"></div>

                        {/* Logout Option */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                          <LogOut size={15} />
                          <span>Logout</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Guest Summary Header */}
                        <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                          <p className="text-xs font-bold text-slate-100">Guest User</p>
                          <p className="text-[10px] text-slate-400 mt-1">Please sign in to access your profile.</p>
                        </div>

                        {/* Login Option */}
                        <NavLink
                          to="/portal"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                        >
                          <LogIn size={15} />
                          <span>Login</span>
                        </NavLink>
                      </>
                    )}

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
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800/80">
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
                                  ? 'bg-emerald-600 text-white font-bold'
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
