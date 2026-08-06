import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Users, UserPlus, UserMinus, ShieldCheck, ShieldAlert,
  Search, Plus, X, Loader2, ChevronDown, ChevronUp, RefreshCw,
  Trash2, ArrowRight, CheckCircle2, Inbox, Check
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

export interface UnassignedEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
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

export default function AdminDepartments() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [departments, setDepartments] = useState<DepartmentData[]>(INITIAL_DEPARTMENTS);
  const [deptRequests, setDeptRequests] = useState<DepartmentRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedDeptId, setExpandedDeptId] = useState<string | number | null>(1);
  const [activeTab, setActiveTab] = useState<'departments' | 'requests'>('departments');

  // Add Employee Modal State & Unassigned Employees List
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState<boolean>(false);
  const [targetDeptId, setTargetDeptId] = useState<string | number | null>(null);
  const [unassignedEmployees, setUnassignedEmployees] = useState<UnassignedEmployee[]>([]);
  const [selectedUnassignedId, setSelectedUnassignedId] = useState<string>('');
  const [isLoadingUnassigned, setIsLoadingUnassigned] = useState<boolean>(false);

  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('Specialist');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Create Department Modal State
  const [isCreateDeptModalOpen, setIsCreateDeptModalOpen] = useState<boolean>(false);
  const [newDeptName, setNewDeptName] = useState<string>('');
  const [newDeptDesc, setNewDeptDesc] = useState<string>('');

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

  const fetchDeptRequests = async () => {
    try {
      const res = await apiFetch('/departments/requests').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDeptRequests(data);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchUnassignedEmployees = async () => {
    setIsLoadingUnassigned(true);
    try {
      const res = await apiFetch('/departments/unassigned-employees').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUnassignedEmployees(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingUnassigned(false);
    }
  };

  const openAddMemberModal = (deptId: string | number) => {
    setTargetDeptId(deptId);
    setSelectedUnassignedId('');
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('Specialist');
    setIsAddMemberModalOpen(true);
    fetchUnassignedEmployees();
  };

  useEffect(() => {
    loadDepartments();
    fetchDeptRequests();
  }, []);

  // ── Admin Actions ──────────────────────────────────────────────────────────

  const handleApproveDeptRequest = async (req: DepartmentRequestItem) => {
    try {
      const res = await apiFetch(`/departments/requests/${req.id}/approve`, { method: 'POST' });
      if (res.ok) {
        addToast({
          title: 'Request Approved! ✅',
          description: `Approved ${req.userName}'s request into "${req.requestedDepartmentName}". Details moved to department database.`,
          type: 'success'
        });
        await fetchDeptRequests();
        await loadDepartments();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Approval Failed', description: data.detail || 'Could not approve request.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to communicate with server.', type: 'error' });
    }
  };

  const handleRejectDeptRequest = async (req: DepartmentRequestItem) => {
    try {
      const res = await apiFetch(`/departments/requests/${req.id}/reject`, { method: 'POST' });
      if (res.ok) {
        addToast({
          title: 'Request Rejected ❌',
          description: `Rejected ${req.userName}'s department request and deleted from database.`,
          type: 'info'
        });
        await fetchDeptRequests();
        await loadDepartments();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Rejection Failed', description: data.detail || 'Could not reject request.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to communicate with server.', type: 'error' });
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) {
      addToast({ title: 'Missing Name', description: 'Please provide department name.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: newDeptName.trim(),
          description: newDeptDesc.trim()
        })
      });

      if (res.ok) {
        addToast({
          title: 'Department Created! 🏢',
          description: `Added "${newDeptName}" department to database.`,
          type: 'success'
        });
        setNewDeptName('');
        setNewDeptDesc('');
        setIsCreateDeptModalOpen(false);
        await loadDepartments();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Creation Failed', description: data.detail || 'Could not create department.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to communicate with server.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (deptId: string | number, deptName: string) => {
    if (!window.confirm(`Are you sure you want to delete department "${deptName}"? This will delete department data from database and unassign employees.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/departments/${deptId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast({
          title: 'Department Deleted 🗑️',
          description: `Deleted department "${deptName}" from database. Unassigned employees will be prompted to select a new department.`,
          type: 'info'
        });
        await loadDepartments();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Error', description: data.detail || 'Could not delete department.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to communicate with server.', type: 'error' });
    }
  };

  const handleAddMemberToDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !targetDeptId) {
      addToast({ title: 'Missing Info', description: 'Please choose or enter employee email.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/departments/${targetDeptId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          name: newMemberName.trim(),
          email: newMemberEmail.trim(),
          role_name: newMemberRole.trim()
        })
      });

      if (res.ok) {
        const targetDeptName = departments.find(d => String(d.id) === String(targetDeptId))?.name;
        addToast({
          title: 'Employee Assigned! 🎉',
          description: `Assigned ${newMemberEmail} to ${targetDeptName} in database.`,
          type: 'success'
        });
        setNewMemberName('');
        setNewMemberEmail('');
        setSelectedUnassignedId('');
        setIsAddMemberModalOpen(false);
        await loadDepartments();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Assignment Failed', description: data.detail || 'Could not add employee.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to communicate with server.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMemberFromDept = async (deptId: string | number, member: DepartmentMember) => {
    try {
      const res = await apiFetch(`/departments/${deptId}/members/${member.id}`, { method: 'DELETE' });
      if (res.ok) {
        const deptName = departments.find(d => String(d.id) === String(deptId))?.name;
        addToast({
          title: 'Employee Removed',
          description: `Removed ${member.first_name} ${member.last_name} from ${deptName} in database.`,
          type: 'info'
        });
        await loadDepartments();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Error', description: data.detail || 'Could not remove member.', type: 'error' });
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Department Management</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
              {user?.organization_name || 'Organization Units'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Create departments, assign workforce employees, and manage department join/switch requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateDeptModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add Department</span>
          </button>

          <button
            onClick={() => { loadDepartments(); fetchDeptRequests(); }}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all backdrop-blur-md"
            title="Refresh Departments"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin text-blue-400' : ''} />
          </button>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'departments'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 size={14} />
          <span>Departments Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Inbox size={14} />
          <span>Join &amp; Switch Requests</span>
          {deptRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/30">
              {deptRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* REQUESTS APPROVAL TAB */}
      {activeTab === 'requests' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Inbox size={18} className="text-blue-400" />
              Pending Department Requests ({deptRequests.length})
            </h3>
            <button
              onClick={fetchDeptRequests}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {deptRequests.length === 0 ? (
            <Card className="p-8 text-center border border-slate-800 bg-slate-900/40">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm font-bold text-white">No Pending Requests</p>
              <p className="text-xs text-slate-400 mt-1">All employee department requests have been processed.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {deptRequests.map((req) => (
                <Card key={req.id} className="p-5 border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{req.userName}</span>
                        <span className="text-xs text-slate-400">({req.userEmail})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {req.requestType} Request
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>Current: <strong className="text-slate-300">{req.currentDepartmentName}</strong></span>
                        <ArrowRight size={12} className="text-slate-500" />
                        <span>Requested: <strong className="text-blue-400">{req.requestedDepartmentName}</strong></span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Requested {req.requestedAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApproveDeptRequest(req)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>Approve &amp; Move</span>
                    </button>
                    <button
                      onClick={() => handleRejectDeptRequest(req)}
                      className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <X size={14} />
                      <span>Reject &amp; Delete</span>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* DEPARTMENTS OVERVIEW */
        <>
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
              <p className="text-xs text-emerald-400/80 mt-2">Active assigned workforce</p>
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

          {/* Search Toolbar */}
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

                    {/* Admin Actions */}
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

                      {/* Admin Management Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openAddMemberModal(dept.id)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all inline-flex items-center gap-1.5"
                        >
                          <UserPlus size={14} />
                          <span>Add Employee</span>
                        </button>

                        <button
                          onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all inline-flex items-center gap-1.5 text-xs font-semibold"
                          title={`Delete department ${dept.name}`}
                        >
                          <Trash2 size={14} />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>

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

                  {/* Roster Accordion */}
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
                          <p className="text-xs text-slate-400">No specific roster members loaded for {dept.name}.</p>
                          <button
                            onClick={() => openAddMemberModal(dept.id)}
                            className="mt-3 text-xs font-semibold text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            <UserPlus size={12} /> Add an employee to {dept.name}
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {dept.members.map((member) => (
                            <div
                              key={member.id}
                              className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors group"
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

                                <button
                                  onClick={() => handleRemoveMemberFromDept(dept.id, member)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  title={`Remove ${member.first_name} from ${dept.name}`}
                                >
                                  <UserMinus size={15} />
                                </button>
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
        </>
      )}

      {/* Add Employee to Department Modal */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAddMemberModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <UserPlus size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Add Employee to Department</h3>
                <p className="text-xs text-slate-400">
                  Assign staff member to {departments.find(d => d.id === targetDeptId)?.name || 'Department'}
                </p>
              </div>
            </div>

            <form onSubmit={handleAddMemberToDept} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Department</label>
                <select
                  value={targetDeptId || ''}
                  onChange={(e) => setTargetDeptId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.employee_count} Employees)</option>
                  ))}
                </select>
              </div>

              {/* Unassigned Employees Select Dropdown */}
              <div>
                <label className="text-xs text-amber-400 block mb-1 font-semibold">
                  Select Unassigned Employee ({unassignedEmployees.length} Available)
                </label>
                <select
                  value={selectedUnassignedId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedUnassignedId(id);
                    const emp = unassignedEmployees.find(u => u.id === id);
                    if (emp) {
                      setNewMemberName(emp.name);
                      setNewMemberEmail(emp.email);
                      setNewMemberRole(emp.role);
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">-- Choose Unassigned Employee --</option>
                  {unassignedEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email}) - {emp.role}
                    </option>
                  ))}
                </select>
                {unassignedEmployees.length === 0 && !isLoadingUnassigned && (
                  <p className="text-[10px] text-slate-500 mt-1">No unassigned employees found in organization. Enter details manually below if creating a new member.</p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Employee Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robert Downey"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Employee Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="robert@company.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Job Title / Role</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Specialist"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all inline-flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Assign to Department</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Department Modal */}
      {isCreateDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsCreateDeptModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Building2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Add New Department</h3>
                <p className="text-xs text-slate-400">
                  Create an organizational unit in the database.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance & Compliance"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Department Description</label>
                <textarea
                  rows={3}
                  placeholder="Summary of department functions and responsibilities..."
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all inline-flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Create Department</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
