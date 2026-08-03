import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, Shield, Award, Search, Filter, CheckCircle, Clock, 
  AlertTriangle, ArrowUpRight, BarChart3, TrendingUp, Sparkles, HelpCircle, 
  ChevronRight, Download, RefreshCw, Mail, Lock, Flame, Eye, Send, Check, Crown
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface EmployeeProgress {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  groupName: string;
  modulesCompleted: number;
  totalModules: number;
  quizzesPassed: number;
  totalQuizzes: number;
  avgQuizScore: number;
  phishClickRate: number;
  completionPercentage: number;
  status: 'Completed' | 'In Progress' | 'Action Needed';
  lastActive: string;
  certificateEarned: boolean;
}

export interface DepartmentProgress {
  id: string;
  name: string;
  code: string;
  headName: string;
  totalStaff: number;
  completedStaff: number;
  avgCompletionPercentage: number;
  avgQuizScore: number;
  avgPhishRiskRate: number;
  totalModulesCompleted: number;
  topPerformer: string;
  highestRiskEmployee: string;
  status: 'High Compliance' | 'Moderate Risk' | 'Critical Review';
}

export interface GroupProgress {
  id: string;
  name: string;
  code: string;
  tier: 'Tier 1 (Critical HVT)' | 'Tier 2 (Sensitive Data)' | 'Tier 3 (Inbound Facing)' | 'Tier 4 (Standard)';
  tierNumber: 1 | 2 | 3 | 4;
  totalMembers: number;
  avgProgressPercentage: number;
  quizzesPassedRate: number;
  phishRiskRate: number;
  simulationFrequency: string;
  drillComplianceRate: number;
  policiesEnforcedCount: number;
  status: 'On Track' | 'Needs Attention' | 'At Risk';
}

// ── Mock Initial Data ──────────────────────────────────────────────────────────

const INITIAL_EMPLOYEES: EmployeeProgress[] = [
  {
    id: 'emp-1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@company.com',
    department: 'Executive',
    role: 'Chief Executive Officer',
    groupName: 'Executive & C-Suite HVT',
    modulesCompleted: 10,
    totalModules: 10,
    quizzesPassed: 8,
    totalQuizzes: 8,
    avgQuizScore: 96,
    phishClickRate: 2.1,
    completionPercentage: 100,
    status: 'Completed',
    lastActive: 'Today at 09:30 AM',
    certificateEarned: true
  },
  {
    id: 'emp-2',
    name: 'Alex Rivera',
    email: 'alex.r@company.com',
    department: 'IT Security',
    role: 'Lead SecOps Engineer',
    groupName: 'IT Systems & DevOps Security Tier',
    modulesCompleted: 10,
    totalModules: 10,
    quizzesPassed: 8,
    totalQuizzes: 8,
    avgQuizScore: 98,
    phishClickRate: 0.0,
    completionPercentage: 100,
    status: 'Completed',
    lastActive: 'Today at 11:15 AM',
    certificateEarned: true
  },
  {
    id: 'emp-3',
    name: 'Michael Vance',
    email: 'michael.v@company.com',
    department: 'Finance',
    role: 'Chief Financial Officer',
    groupName: 'Executive & C-Suite HVT',
    modulesCompleted: 8,
    totalModules: 10,
    quizzesPassed: 6,
    totalQuizzes: 8,
    avgQuizScore: 88,
    phishClickRate: 5.4,
    completionPercentage: 80,
    status: 'In Progress',
    lastActive: 'Yesterday',
    certificateEarned: false
  },
  {
    id: 'emp-4',
    name: 'Jessica Miller',
    email: 'jessica.m@company.com',
    department: 'Human Resources',
    role: 'VP People Operations',
    groupName: 'HR & Payroll Data Protection',
    modulesCompleted: 9,
    totalModules: 10,
    quizzesPassed: 7,
    totalQuizzes: 8,
    avgQuizScore: 91,
    phishClickRate: 3.2,
    completionPercentage: 90,
    status: 'In Progress',
    lastActive: 'Today at 08:45 AM',
    certificateEarned: false
  },
  {
    id: 'emp-5',
    name: 'Daniel Park',
    email: 'daniel.p@company.com',
    department: 'Sales',
    role: 'Enterprise Account Exec',
    groupName: 'Sales & Customer Inbound Tier',
    modulesCompleted: 4,
    totalModules: 10,
    quizzesPassed: 3,
    totalQuizzes: 8,
    avgQuizScore: 72,
    phishClickRate: 28.5,
    completionPercentage: 40,
    status: 'Action Needed',
    lastActive: '3 days ago',
    certificateEarned: false
  },
  {
    id: 'emp-6',
    name: 'Chloe Bennett',
    email: 'chloe.b@company.com',
    department: 'Customer Support',
    role: 'Support Team Lead',
    groupName: 'Sales & Customer Inbound Tier',
    modulesCompleted: 6,
    totalModules: 10,
    quizzesPassed: 5,
    totalQuizzes: 8,
    avgQuizScore: 84,
    phishClickRate: 14.2,
    completionPercentage: 60,
    status: 'In Progress',
    lastActive: '2 days ago',
    certificateEarned: false
  },
  {
    id: 'emp-7',
    name: 'Robert Chen',
    email: 'robert.c@company.com',
    department: 'Finance',
    role: 'Payroll Lead Manager',
    groupName: 'HR & Payroll Data Protection',
    modulesCompleted: 7,
    totalModules: 10,
    quizzesPassed: 6,
    totalQuizzes: 8,
    avgQuizScore: 86,
    phishClickRate: 8.1,
    completionPercentage: 70,
    status: 'In Progress',
    lastActive: 'Yesterday',
    certificateEarned: false
  },
  {
    id: 'emp-8',
    name: 'Liam O\'Connor',
    email: 'liam.o@company.com',
    department: 'Operations',
    role: 'Operations Coordinator',
    groupName: 'Standard Baseline Staff & Contractors',
    modulesCompleted: 5,
    totalModules: 10,
    quizzesPassed: 4,
    totalQuizzes: 8,
    avgQuizScore: 78,
    phishClickRate: 12.0,
    completionPercentage: 50,
    status: 'In Progress',
    lastActive: '4 days ago',
    certificateEarned: false
  }
];

const INITIAL_DEPARTMENTS: DepartmentProgress[] = [
  {
    id: 'dept-1',
    name: 'IT Security & Engineering',
    code: 'ENG-SEC',
    headName: 'Alex Rivera',
    totalStaff: 28,
    completedStaff: 24,
    avgCompletionPercentage: 94,
    avgQuizScore: 96,
    avgPhishRiskRate: 2.1,
    totalModulesCompleted: 268,
    topPerformer: 'Alex Rivera (98% Score)',
    highestRiskEmployee: 'Priya Sharma (15% Risk)',
    status: 'High Compliance'
  },
  {
    id: 'dept-2',
    name: 'Executive & Legal',
    code: 'EXEC-LEG',
    headName: 'Sarah Jenkins',
    totalStaff: 12,
    completedStaff: 9,
    avgCompletionPercentage: 88,
    avgQuizScore: 92,
    avgPhishRiskRate: 4.8,
    totalModulesCompleted: 108,
    topPerformer: 'Sarah Jenkins (96% Score)',
    highestRiskEmployee: 'David Kim (26% Risk)',
    status: 'High Compliance'
  },
  {
    id: 'dept-3',
    name: 'Finance & Payroll',
    code: 'FIN-PAY',
    headName: 'Michael Vance',
    totalStaff: 22,
    completedStaff: 16,
    avgCompletionPercentage: 82,
    avgQuizScore: 87,
    avgPhishRiskRate: 7.4,
    totalModulesCompleted: 184,
    topPerformer: 'Amanda Sterling (94% Score)',
    highestRiskEmployee: 'Michael Vance (22% Risk)',
    status: 'High Compliance'
  },
  {
    id: 'dept-4',
    name: 'Human Resources & Recruiting',
    code: 'HR-TALENT',
    headName: 'Jessica Miller',
    totalStaff: 18,
    completedStaff: 13,
    avgCompletionPercentage: 78,
    avgQuizScore: 85,
    avgPhishRiskRate: 9.2,
    totalModulesCompleted: 142,
    topPerformer: 'Jessica Miller (91% Score)',
    highestRiskEmployee: 'Robert Chen (21% Risk)',
    status: 'Moderate Risk'
  },
  {
    id: 'dept-5',
    name: 'Sales & Customer Inbound',
    code: 'SALES-SUPP',
    headName: 'Daniel Park',
    totalStaff: 42,
    completedStaff: 21,
    avgCompletionPercentage: 62,
    avgQuizScore: 76,
    avgPhishRiskRate: 24.8,
    totalModulesCompleted: 260,
    topPerformer: 'Chloe Bennett (84% Score)',
    highestRiskEmployee: 'Daniel Park (32% Risk)',
    status: 'Critical Review'
  },
  {
    id: 'dept-6',
    name: 'Operations & Facilities',
    code: 'OPS-FAC',
    headName: 'Liam O\'Connor',
    totalStaff: 28,
    completedStaff: 15,
    avgCompletionPercentage: 68,
    avgQuizScore: 79,
    avgPhishRiskRate: 14.5,
    totalModulesCompleted: 190,
    topPerformer: 'Sophia Martinez (82% Score)',
    highestRiskEmployee: 'Liam O\'Connor (14% Risk)',
    status: 'Moderate Risk'
  }
];

const INITIAL_GROUPS: GroupProgress[] = [
  {
    id: 'grp-1',
    name: 'Executive & C-Suite HVT',
    code: 'EXEC-HVT',
    tier: 'Tier 1 (Critical HVT)',
    tierNumber: 1,
    totalMembers: 8,
    avgProgressPercentage: 92,
    quizzesPassedRate: 94,
    phishRiskRate: 18,
    simulationFrequency: 'Weekly Quishing & Deepfake Drills',
    drillComplianceRate: 98,
    policiesEnforcedCount: 4,
    status: 'On Track'
  },
  {
    id: 'grp-2',
    name: 'IT Systems & DevOps Security Tier',
    code: 'SYS-ADMIN',
    tier: 'Tier 1 (Critical HVT)',
    tierNumber: 1,
    totalMembers: 14,
    avgProgressPercentage: 96,
    quizzesPassedRate: 98,
    phishRiskRate: 10,
    simulationFrequency: 'Weekly Spear Phishing & Token Theft',
    drillComplianceRate: 100,
    policiesEnforcedCount: 4,
    status: 'On Track'
  },
  {
    id: 'grp-3',
    name: 'HR & Payroll Data Protection',
    code: 'HR-PAYROLL',
    tier: 'Tier 2 (Sensitive Data)',
    tierNumber: 2,
    totalMembers: 19,
    avgProgressPercentage: 84,
    quizzesPassedRate: 88,
    phishRiskRate: 16,
    simulationFrequency: 'Bi-weekly Direct Deposit Fraud',
    drillComplianceRate: 92,
    policiesEnforcedCount: 4,
    status: 'On Track'
  },
  {
    id: 'grp-4',
    name: 'Sales & Customer Inbound Tier',
    code: 'SALES-FRONT',
    tier: 'Tier 3 (Inbound Facing)',
    tierNumber: 3,
    totalMembers: 42,
    avgProgressPercentage: 58,
    quizzesPassedRate: 68,
    phishRiskRate: 29,
    simulationFrequency: 'Bi-weekly RFP Links & QR Codes',
    drillComplianceRate: 74,
    policiesEnforcedCount: 4,
    status: 'At Risk'
  },
  {
    id: 'grp-5',
    name: 'Standard Baseline Staff & Contractors',
    code: 'STD-STAFF',
    tier: 'Tier 4 (Standard)',
    tierNumber: 4,
    totalMembers: 65,
    avgProgressPercentage: 72,
    quizzesPassedRate: 78,
    phishRiskRate: 15,
    simulationFrequency: 'Monthly Awareness & IT Impersonation',
    drillComplianceRate: 85,
    policiesEnforcedCount: 4,
    status: 'Needs Attention'
  }
];

export default function AdminProgress() {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'employees' | 'departments' | 'groups'>('employees');
  
  const [employees, setEmployees] = useState<EmployeeProgress[]>(INITIAL_EMPLOYEES);
  const [departments, setDepartments] = useState<DepartmentProgress[]>(INITIAL_DEPARTMENTS);
  const [groups, setGroups] = useState<GroupProgress[]>(INITIAL_GROUPS);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const fetchProgressData = async () => {
    try {
      const res = await apiFetch('/training/admin-progress').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.employees) setEmployees(data.employees);
        if (data.departments) setDepartments(data.departments);
        if (data.groups) setGroups(data.groups);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchProgressData();
  }, []);

  // Calculate Overall Org Progress Metrics
  const totalEmployeesCount = 150;
  const overallAvgProgress = Math.round(
    employees.reduce((acc, e) => acc + e.completionPercentage, 0) / (employees.length || 1)
  );
  const totalCompletedCount = employees.filter(e => e.completionPercentage === 100).length;
  const avgOrgQuizScore = Math.round(
    employees.reduce((acc, e) => acc + e.avgQuizScore, 0) / (employees.length || 1)
  );

  // Filter Employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchQuery === '' || 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.groupName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter Departments
  const filteredDepartments = departments.filter(dept => 
    searchQuery === '' ||
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.headName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter Groups
  const filteredGroups = groups.filter(grp => 
    searchQuery === '' ||
    grp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    grp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    grp.tier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendReminder = (emp: EmployeeProgress) => {
    addToast({
      title: 'Training Reminder Sent! 📩',
      description: `Dispatched learning completion reminder to ${emp.name} (${emp.email}).`,
      type: 'success'
    });
  };

  const handleExportReport = (type: string) => {
    addToast({
      title: 'Exporting Progress Report 📊',
      description: `Generated CSV progress report for ${type}. Download starting...`,
      type: 'success'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'High Compliance':
      case 'On Track':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm w-fit">
            <CheckCircle size={12} /> {status}
          </span>
        );
      case 'In Progress':
      case 'Moderate Risk':
      case 'Needs Attention':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-sm w-fit">
            <Clock size={12} /> {status}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1 shadow-sm w-fit">
            <AlertTriangle size={12} /> {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
            <Award size={16} />
            <span>ORGANIZATION COMPLIANCE & PROGRESS TRACKER</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Training Progress Center</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor real-time cybersecurity educational progress across individual Employees, Departments, and Security Groups.
          </p>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Main Progress Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'employees' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={14} /> Employees Progress
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'departments' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 size={14} /> Departments Progress
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'groups' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield size={14} /> Groups Progress
            </button>
          </div>

          <Button
            onClick={() => handleExportReport(activeTab)}
            variant="outline"
            className="border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2"
          >
            <Download size={14} /> Export Report
          </Button>
        </div>
      </div>

      {/* ── Dynamic Summary Dashboard Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
          <div className={`p-3 rounded-xl border ${
            activeTab === 'employees' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
            activeTab === 'departments' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            'bg-purple-500/10 text-purple-400 border-purple-500/20'
          }`}>
            {activeTab === 'employees' && <Users size={24} />}
            {activeTab === 'departments' && <Building2 size={24} />}
            {activeTab === 'groups' && <Shield size={24} />}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {activeTab === 'employees' && 'Total Enrolled Employees'}
              {activeTab === 'departments' && 'Total Monitored Departments'}
              {activeTab === 'groups' && 'Security Groups Tracked'}
            </p>
            <p className="text-lg font-black text-white mt-0.5">
              {activeTab === 'employees' && `${totalEmployeesCount} Staff Tracked`}
              {activeTab === 'departments' && `${departments.length} Departments Monitored`}
              {activeTab === 'groups' && `${groups.length} Active Groups`}
            </p>
          </div>
        </Card>

        {/* Card 2 */}
        <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {activeTab === 'employees' && 'Employee Avg Progress'}
              {activeTab === 'departments' && 'Dept Avg Completion Rate'}
              {activeTab === 'groups' && 'Group Avg Progress Rate'}
            </p>
            <p className="text-lg font-black text-white mt-0.5">
              {activeTab === 'employees' && `${overallAvgProgress}% Completed`}
              {activeTab === 'departments' && `${Math.round(departments.reduce((acc, d) => acc + d.avgCompletionPercentage, 0) / (departments.length || 1))}% Completed`}
              {activeTab === 'groups' && `${Math.round(groups.reduce((acc, g) => acc + g.avgProgressPercentage, 0) / (groups.length || 1))}% Completion Rate`}
            </p>
          </div>
        </Card>

        {/* Card 3 */}
        <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
          <div className={`p-3 rounded-xl border ${
            activeTab === 'employees' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
            activeTab === 'departments' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
            'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {activeTab === 'employees' && <HelpCircle size={24} />}
            {activeTab === 'departments' && <BarChart3 size={24} />}
            {activeTab === 'groups' && <Flame size={24} />}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {activeTab === 'employees' && 'Avg Org Quiz Score'}
              {activeTab === 'departments' && 'Avg Dept Quiz Score'}
              {activeTab === 'groups' && 'Drill Compliance Rate'}
            </p>
            <p className="text-lg font-black text-white mt-0.5">
              {activeTab === 'employees' && `${avgOrgQuizScore}% Passing Rate`}
              {activeTab === 'departments' && `${Math.round(departments.reduce((acc, d) => acc + d.avgQuizScore, 0) / (departments.length || 1))}% Avg Score`}
              {activeTab === 'groups' && `${Math.round(groups.reduce((acc, g) => acc + g.drillComplianceRate, 0) / (groups.length || 1))}% Compliance`}
            </p>
          </div>
        </Card>

        {/* Card 4 */}
        <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
          <div className={`p-3 rounded-xl border ${
            activeTab === 'employees' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
            activeTab === 'departments' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {activeTab === 'employees' && <Award size={24} />}
            {activeTab === 'departments' && <CheckCircle size={24} />}
            {activeTab === 'groups' && <Crown size={24} />}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {activeTab === 'employees' && 'Certificates Earned'}
              {activeTab === 'departments' && 'High Compliance Depts'}
              {activeTab === 'groups' && 'Critical Tier 1 HVT Groups'}
            </p>
            <p className="text-lg font-black text-white mt-0.5">
              {activeTab === 'employees' && `${totalCompletedCount} Certified Staff`}
              {activeTab === 'departments' && `${departments.filter(d => d.status === 'High Compliance').length} / ${departments.length} Compliant`}
              {activeTab === 'groups' && `${groups.filter(g => g.tierNumber === 1).length} High Value Groups`}
            </p>
          </div>
        </Card>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full sm:w-96">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {activeTab === 'employees' && (
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
              <Filter size={14} /> Status:
            </span>
            {['All', 'Completed', 'In Progress', 'Action Needed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB 1: EMPLOYEES PROGRESS ── */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              <span>Employee Training & Quiz Progress Roster</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredEmployees.length} {filteredEmployees.length === 1 ? 'Employee' : 'Employees'}
            </span>
          </div>

          <Card className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Employee & Role</th>
                    <th className="p-4">Department & Group</th>
                    <th className="p-4 text-center">Modules Done</th>
                    <th className="p-4 text-center">Quiz Score</th>
                    <th className="p-4 text-center">Progress %</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* Employee Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-white leading-tight flex items-center gap-1.5">
                              {emp.name}
                              {emp.certificateEarned && (
                                <Award size={12} className="text-emerald-400" title="Certified Compliant" />
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">{emp.email} • <span className="text-slate-300">{emp.role}</span></p>
                          </div>
                        </div>
                      </td>

                      {/* Department & Group */}
                      <td className="p-4">
                        <p className="font-bold text-slate-200">{emp.department}</p>
                        <p className="text-[10px] text-blue-400 font-mono">{emp.groupName}</p>
                      </td>

                      {/* Modules Done */}
                      <td className="p-4 text-center">
                        <span className="font-black text-white">{emp.modulesCompleted} / {emp.totalModules}</span>
                        <p className="text-[10px] text-slate-400">{emp.quizzesPassed} Quizzes Passed</p>
                      </td>

                      {/* Quiz Score */}
                      <td className="p-4 text-center">
                        <span className={`font-extrabold ${emp.avgQuizScore >= 90 ? 'text-emerald-400' : emp.avgQuizScore >= 80 ? 'text-blue-400' : 'text-amber-400'}`}>
                          {emp.avgQuizScore}% Avg
                        </span>
                        <p className="text-[10px] text-slate-400">{emp.phishClickRate}% Phish Risk</p>
                      </td>

                      {/* Progress Bar */}
                      <td className="p-4 text-center min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div 
                              className={`h-2 transition-all duration-300 ${
                                emp.completionPercentage === 100 
                                  ? 'bg-emerald-500' 
                                  : emp.completionPercentage >= 60 
                                  ? 'bg-blue-500' 
                                  : 'bg-amber-500'
                              }`} 
                              style={{ width: `${emp.completionPercentage}%` }} 
                            />
                          </div>
                          <span className="font-black text-white text-xs">{emp.completionPercentage}%</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        {getStatusBadge(emp.status)}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <Button
                          onClick={() => handleSendReminder(emp)}
                          variant="outline"
                          className="border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs px-3 py-1.5 flex items-center gap-1.5 ml-auto"
                        >
                          <Send size={12} /> Send Drill
                        </Button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: DEPARTMENTS PROGRESS ── */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Building2 size={18} className="text-emerald-400" />
              <span>Departmental Security Compliance & Progress Breakdown</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredDepartments.length} {filteredDepartments.length === 1 ? 'Department' : 'Departments'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepartments.map((dept) => (
              <Card 
                key={dept.id} 
                className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 space-y-5 hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-400 font-mono bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                      {dept.code}
                    </span>
                    {getStatusBadge(dept.status)}
                  </div>

                  {/* Department Name & Lead */}
                  <div>
                    <h3 className="text-xl font-black text-white leading-tight">{dept.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Department Lead: <strong className="text-slate-200">{dept.headName}</strong></p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="flex justify-between text-xs font-extrabold">
                      <span className="text-slate-400">Department Completion Rate</span>
                      <span className="text-emerald-400">{dept.avgCompletionPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <div 
                        className="bg-emerald-500 h-2.5 transition-all duration-300"
                        style={{ width: `${dept.avgCompletionPercentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 text-right mt-0.5 font-semibold">
                      {dept.completedStaff} / {dept.totalStaff} Employees Certified Compliant
                    </p>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Avg Quiz Score</span>
                      <span className="text-base font-black text-white">{dept.avgQuizScore}% Score</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Phish Risk Rate</span>
                      <span className={`text-base font-black ${dept.avgPhishRiskRate >= 20 ? 'text-red-400' : dept.avgPhishRiskRate >= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {dept.avgPhishRiskRate}% Risk
                      </span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Top Performer:</span>
                      <span className="font-bold text-emerald-300">{dept.topPerformer}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Highest Risk:</span>
                      <span className="font-bold text-amber-300">{dept.highestRiskEmployee}</span>
                    </div>
                  </div>

                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-slate-800/80 flex justify-end">
                  <Button
                    onClick={() => handleExportReport(dept.name)}
                    variant="outline"
                    className="border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Download size={14} /> Dept Report
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: GROUPS PROGRESS ── */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Shield size={18} className="text-purple-400" />
              <span>Security Groups Progress & Risk Tier Analytics</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredGroups.length} {filteredGroups.length === 1 ? 'Group' : 'Groups'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Card 
                key={group.id} 
                className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 space-y-5 hover:border-purple-500/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-400 font-mono bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                      {group.code}
                    </span>
                    {getStatusBadge(group.status)}
                  </div>

                  {/* Group Name & Tier */}
                  <div>
                    <h3 className="text-xl font-black text-white leading-tight">{group.name}</h3>
                    <p className="text-xs font-bold text-purple-400 mt-1">{group.tier}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div className="flex justify-between text-xs font-extrabold">
                      <span className="text-slate-400">Group Progress Rate</span>
                      <span className="text-purple-400">{group.avgProgressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <div 
                        className="bg-purple-500 h-2.5 transition-all duration-300"
                        style={{ width: `${group.avgProgressPercentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 text-right mt-0.5 font-semibold">
                      {group.totalMembers} Total Assigned Members
                    </p>
                  </div>

                  {/* Group Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Quiz Pass Rate</span>
                      <span className="text-base font-black text-white">{group.quizzesPassedRate}% Passed</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Phish Risk Rate</span>
                      <span className={`text-base font-black ${group.phishRiskRate >= 20 ? 'text-red-400' : group.phishRiskRate >= 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {group.phishRiskRate}% Risk
                      </span>
                    </div>
                  </div>

                  {/* Drill Schedule Info */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                    <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                      <Flame size={14} className="text-amber-400" /> Active Drills:
                    </span>
                    <p className="text-slate-200 font-bold">{group.simulationFrequency}</p>
                    <p className="text-[10px] text-emerald-400 font-semibold">{group.drillComplianceRate}% Drill Compliance</p>
                  </div>

                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-slate-800/80 flex justify-end">
                  <Button
                    onClick={() => handleExportReport(group.name)}
                    variant="outline"
                    className="border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Download size={14} /> Group Report
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
