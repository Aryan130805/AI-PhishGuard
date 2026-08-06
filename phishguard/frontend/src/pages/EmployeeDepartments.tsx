import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Users, ShieldCheck, ShieldAlert,
  Search, X, RefreshCw, CheckCircle2,
  Clock, ChevronDown, ChevronUp, UserPlus
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../lib/api';

export interface DepartmentMember {
  id: string | number;
  first_name: string;
  last_name: string;
  email: string;
  role_name: string;
  risk_score: number;
}

export interface DepartmentData {
  id: string | number;
  name: string;
  description: string;
  employee_count: number;
  risk_score: number;
  click_rate: number;
  report_rate: number;
  members: DepartmentMember[];
}

export interface DepartmentRequestItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentDepartmentName: string;
  requestedDepartmentId: string;
  requestedDepartmentName: string;
  requestType: 'join' | 'switch';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_DEPARTMENTS: DepartmentData[] = [
  {
    id: 1,
    name: 'Engineering',
    description: 'Software development, infrastructure, and technical operations team.',
    employee_count: 14,
    risk_score: 94,
    click_rate: 4,
    report_rate: 96,
    members: [
      { id: 1, first_name: 'Alice', last_name: 'Smith', email: 'alice.smith@acme.com', role_name: 'Software Engineer', risk_score: 95 },
      { id: 2, first_name: 'Bob', last_name: 'Jones', email: 'bob.jones@acme.com', role_name: 'DevOps Specialist', risk_score: 88 },
      { id: 6, first_name: 'Tony', last_name: 'Stark', email: 'tony.stark@stark.com', role_name: 'Chief Architect', risk_score: 99 },
      { id: 11, first_name: 'Mark', last_name: 'Taylor', email: 'mark.taylor@company.com', role_name: 'Backend Developer', risk_score: 91 }
    ]
  },
  {
    id: 2,
    name: 'Sales & Business Development',
    description: 'Client acquisition, key account management, and business revenue teams.',
    employee_count: 9,
    risk_score: 76,
    click_rate: 16,
    report_rate: 78,
    members: [
      { id: 3, first_name: 'Charlie', last_name: 'Brown', email: 'charlie.brown@acme.com', role_name: 'Sales Executive', risk_score: 78 },
      { id: 5, first_name: 'Evan', last_name: 'Wright', email: 'evan.wright@acme.com', role_name: 'Account Manager', risk_score: 50 },
      { id: 10, first_name: 'George', last_name: 'Costanza', email: 'george.costanza@demo.com', role_name: 'Sales Specialist', risk_score: 82 }
    ]
  },
  {
    id: 3,
    name: 'Marketing & Communications',
    description: 'Brand strategy, social media campaigns, and public relations.',
    employee_count: 7,
    risk_score: 68,
    click_rate: 24,
    report_rate: 65,
    members: [
      { id: 4, first_name: 'Diana', last_name: 'Prince', email: 'diana.prince@acme.com', role_name: 'Marketing Director', risk_score: 65 },
      { id: 9, first_name: 'Fiona', last_name: 'Gallagher', email: 'fiona.gallagher@demo.com', role_name: 'Content Strategist', risk_score: 90 },
      { id: 12, first_name: 'Jessica', last_name: 'Alba', email: 'jessica.alba@company.com', role_name: 'Digital Marketer', risk_score: 72 }
    ]
  },
  {
    id: 4,
    name: 'Cybersecurity & IT Operations',
    description: 'Information security, network defenses, threat monitoring, and IT helpdesk.',
    employee_count: 5,
    risk_score: 98,
    click_rate: 1,
    report_rate: 99,
    members: [
      { id: 8, first_name: 'Sarah', last_name: 'Connor', email: 'sarah.connor@cyberdyne.com', role_name: 'Security Lead', risk_score: 98 }
    ]
  },
  {
    id: 5,
    name: 'Executive & Management',
    description: 'Corporate leadership, executive board, and strategic planning unit.',
    employee_count: 4,
    risk_score: 92,
    click_rate: 3,
    report_rate: 95,
    members: [
      { id: 7, first_name: 'Pepper', last_name: 'Potts', email: 'pepper.potts@stark.com', role_name: 'Managing Director', risk_score: 95 }
    ]
  },
  {
    id: 6,
    name: 'Human Resources & People Ops',
    description: 'Talent acquisition, employee onboarding, corporate policy, and training.',
    employee_count: 3,
    risk_score: 85,
    click_rate: 10,
    report_rate: 85,
    members: []
  }
];

export default function EmployeeDepartments() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [departments, setDepartments] = useState<DepartmentData[]>(INITIAL_DEPARTMENTS);
  const [myRequests, setMyRequests] = useState<DepartmentRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedDeptId, setExpandedDeptId] = useState<string | number | null>(1);

  const loadDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/departments').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDepartments(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await apiFetch('/departments/my-requests').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMyRequests(data);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadDepartments();
    fetchMyRequests();
  }, []);

  // ── Employee Switch / Join Request Action ─────────────────────────────────

  const handleRequestJoinOrSwitch = async (dept: DepartmentData) => {
    try {
      const res = await apiFetch(`/departments/${dept.id}/join-request`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const reqType = user?.department_name ? 'switch' : 'join';
        addToast({
          title: 'Request Submitted! 📩',
          description: `Submitted request to ${reqType} "${dept.name}". Stored in database awaiting admin approval.`,
          type: 'success'
        });
        await fetchMyRequests();
      } else {
        addToast({ title: 'Request Failed', description: data.detail || 'Could not submit request.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to communicate with server.', type: 'error' });
    }
  };

  // ── Summary Metrics ────────────────────────────────────────────────────────
  const totalEmployeesCount = useMemo(() => {
    return departments.reduce((acc, d) => acc + d.employee_count, 0);
  }, [departments]);

  const avgRiskScore = useMemo(() => {
    if (departments.length === 0) return 85;
    return Math.round(departments.reduce((acc, d) => acc + d.risk_score, 0) / departments.length);
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    return departments.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.members.some(m => `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [departments, searchQuery]);

  const currentDeptName = useMemo(() => {
    return user?.department_name || null;
  }, [user]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Department Overview</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
              {user?.organization_name || 'Organization Units'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            View organization departments, employee rosters, and submit requests to switch departments.
          </p>
        </div>

        <button
          onClick={() => { loadDepartments(); fetchMyRequests(); }}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all backdrop-blur-md self-start sm:self-center"
          title="Refresh Departments"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin text-blue-400' : ''} />
        </button>
      </div>

      {/* Employee Active Department Status Banner */}
      {currentDeptName ? (
        <Card className="border border-emerald-500/30 bg-emerald-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Your Assigned Department</p>
              <h3 className="text-lg font-bold text-white">{currentDeptName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">To change department, select another department below and click &quot;Switch Department&quot;.</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border border-amber-500/30 bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Department Status</p>
              <h3 className="text-sm font-bold text-white">Unassigned (Not in any department)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Choose a department below and click &quot;Request to Join&quot;.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Departments</p>
              <h3 className="text-2xl font-bold text-white mt-1">{departments.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Building2 size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Active organizational units</p>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Workforce</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{totalEmployeesCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Users size={20} />
            </div>
          </div>
          <p className="text-xs text-emerald-400/80 mt-2">Assigned organization members</p>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Security Score</p>
              <h3 className="text-2xl font-bold text-blue-400 mt-1">{avgRiskScore} / 100</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <ShieldCheck size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Org security average</p>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High Risk Units</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">
                {departments.filter(d => d.risk_score < 70).length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <ShieldAlert size={20} />
            </div>
          </div>
          <p className="text-xs text-rose-400/80 mt-2">Score below 70% threshold</p>
        </Card>
      </div>

      {/* Search Input Toolbar */}
      <Card className="border border-slate-800 bg-slate-900/50 p-4">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search departments, roles, or members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={14} />
            </button>
          )}
        </div>
      </Card>

      {/* Departments Roster List */}
      <div className="space-y-4">
        {filteredDepartments.map((dept) => {
          const isExpanded = expandedDeptId === dept.id;
          const isHighRisk = dept.risk_score < 70;
          const isMediumRisk = dept.risk_score >= 70 && dept.risk_score < 88;

          const isUserInThisDept = !!currentDeptName && currentDeptName.toLowerCase().trim() === dept.name.toLowerCase().trim();
          const hasPendingReqForThisDept = myRequests.some(r => String(r.requestedDepartmentId) === String(dept.id));

          return (
            <Card key={dept.id} className="border border-slate-800 bg-slate-900/40 overflow-hidden transition-all">
              
              {/* Department Overview Banner */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 bg-slate-950/40">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl shrink-0 border ${
                    isHighRisk 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                      : isMediumRisk 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-bold text-white">{dept.name}</h3>
                      <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-extrabold flex items-center gap-1.5">
                        <Users size={12} />
                        {dept.employee_count} Employees
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">{dept.description}</p>
                  </div>
                </div>

                {/* Metrics & Employee Actions */}
                <div className="flex items-center gap-4 self-end md:self-center flex-wrap">
                  
                  {/* Security Score Badge */}
                  <div className="text-right px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Security Score</span>
                    <span className={`text-base font-black ${
                      isHighRisk ? 'text-rose-400' : isMediumRisk ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {dept.risk_score} / 100
                    </span>
                  </div>

                  {/* EMPLOYEE CONTROLS (Your Department Badge OR Switch/Join Request Button) */}
                  {isUserInThisDept ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Your Department
                    </span>
                  ) : hasPendingReqForThisDept ? (
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5">
                      <Clock size={14} /> Request Pending Approval
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRequestJoinOrSwitch(dept)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all inline-flex items-center gap-1.5"
                    >
                      {currentDeptName ? <RefreshCw size={14} /> : <UserPlus size={14} />}
                      <span>{currentDeptName ? 'Switch Department' : 'Request to Join'}</span>
                    </button>
                  )}

                  {/* Expand / Collapse Roster Toggle */}
                  <button
                    onClick={() => setExpandedDeptId(isExpanded ? null : dept.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all inline-flex items-center gap-1 text-xs font-semibold"
                  >
                    <span>{isExpanded ? 'Hide Members' : 'View Members'}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Department Roster Accordion Body */}
              {isExpanded && (
                <div className="p-5 bg-slate-950/60 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Users size={14} className="text-blue-400" />
                      Department Roster ({dept.members.length} Members)
                    </h4>
                    <span className="text-xs text-slate-500">Total Workforce: {dept.employee_count}</span>
                  </div>

                  {dept.members.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                      <Users size={24} className="mx-auto text-slate-600 mb-2" />
                      <p className="text-xs text-slate-400">No specific roster members listed for {dept.name}.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dept.members.map((member) => (
                        <div
                          key={member.id}
                          className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                              {member.first_name[0]}{member.last_name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                {member.first_name} {member.last_name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">{member.email}</p>
                              <span className="text-[10px] text-slate-500">{member.role_name}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {member.risk_score}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
