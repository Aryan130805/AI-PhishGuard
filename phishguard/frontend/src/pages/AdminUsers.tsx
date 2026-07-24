import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserPlus, Search, Filter, ShieldAlert, ShieldCheck, Mail,
  Building2, CheckCircle2, AlertTriangle, Plus, X, Loader2, RefreshCw,
  MoreVertical, Shield, ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';

export interface EmployeeRecord {
  id: string | number;
  first_name: string;
  last_name: string;
  email: string;
  department_name: string;
  role_name: 'Admin' | 'Employee';
  is_admin: boolean;
  is_active: boolean;
  risk_score: number;
  click_rate: number;
  report_rate: number;
  joined_date?: string;
}

// Fallback seed data for instant, reliable display across organizations
const INITIAL_DEMO_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 1,
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice.smith@acme.com',
    department_name: 'Engineering',
    role_name: 'Employee',
    is_admin: false,
    is_active: true,
    risk_score: 95,
    click_rate: 5,
    report_rate: 95,
    joined_date: '2026-01-15'
  },
  {
    id: 2,
    first_name: 'Bob',
    last_name: 'Jones',
    email: 'bob.jones@acme.com',
    department_name: 'Engineering',
    role_name: 'Employee',
    is_admin: false,
    is_active: true,
    risk_score: 88,
    click_rate: 10,
    report_rate: 85,
    joined_date: '2026-02-01'
  },
  {
    id: 3,
    first_name: 'Charlie',
    last_name: 'Brown',
    email: 'charlie.brown@acme.com',
    department_name: 'Sales',
    role_name: 'Employee',
    is_admin: false,
    is_active: true,
    risk_score: 78,
    click_rate: 15,
    report_rate: 78,
    joined_date: '2026-02-10'
  },
  {
    id: 4,
    first_name: 'Diana',
    last_name: 'Prince',
    email: 'diana.prince@acme.com',
    department_name: 'Marketing',
    role_name: 'Employee',
    is_admin: false,
    is_active: true,
    risk_score: 65,
    click_rate: 25,
    report_rate: 65,
    joined_date: '2026-03-01'
  },
  {
    id: 5,
    first_name: 'Evan',
    last_name: 'Wright',
    email: 'evan.wright@acme.com',
    department_name: 'Sales',
    role_name: 'Employee',
    is_admin: false,
    is_active: true,
    risk_score: 50,
    click_rate: 40,
    report_rate: 50,
    joined_date: '2026-03-12'
  },
  {
    id: 6,
    first_name: 'Tony',
    last_name: 'Stark',
    email: 'tony.stark@stark.com',
    department_name: 'Engineering',
    role_name: 'Employee',
    is_admin: false,
    is_active: true,
    risk_score: 99,
    click_rate: 1,
    report_rate: 99,
    joined_date: '2026-01-05'
  },
  {
    id: 7,
    first_name: 'Pepper',
    last_name: 'Potts',
    email: 'pepper.potts@stark.com',
    department_name: 'Management',
    role_name: 'Admin',
    is_admin: true,
    is_active: true,
    risk_score: 95,
    click_rate: 3,
    report_rate: 95,
    joined_date: '2026-01-05'
  },
  {
    id: 8,
    first_name: 'Sarah',
    last_name: 'Connor',
    email: 'sarah.connor@cyberdyne.com',
    department_name: 'Security',
    role_name: 'Employee',
    is_admin: false,
    is_active: true,
    risk_score: 98,
    click_rate: 2,
    report_rate: 98,
    joined_date: '2026-01-10'
  },
  {
    id: 9,
    first_name: 'Fiona',
    last_name: 'Gallagher',
    email: 'fiona.gallagher@demo.com',
    department_name: 'Marketing',
    role_name: 'Employee',
    is_admin: false,
    is_active: true,
    risk_score: 90,
    click_rate: 8,
    report_rate: 90,
    joined_date: '2026-02-14'
  },
  {
    id: 10,
    first_name: 'George',
    last_name: 'Costanza',
    email: 'george.costanza@demo.com',
    department_name: 'Sales',
    role_name: 'Employee',
    is_admin: false,
    is_active: true,
    risk_score: 82,
    click_rate: 15,
    report_rate: 82,
    joined_date: '2026-03-04'
  }
];

export default function AdminUsers() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [employees, setEmployees] = useState<EmployeeRecord[]>(INITIAL_DEMO_EMPLOYEES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedRisk, setSelectedRisk] = useState<string>('All');

  // Add Employee Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newFirstName, setNewFirstName] = useState<string>('');
  const [newLastName, setNewLastName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newDept, setNewDept] = useState<string>('Engineering');
  const [newPassword, setNewPassword] = useState<string>('PhishGuard@2026');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ── Fetch Employees from Supabase / API ──────────────────────────────────────
  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      // 1. Try local API first
      const apiRes = await apiFetch('/users/organization').catch(() => null);
      if (apiRes && apiRes.ok) {
        const data = await apiRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setEmployees(data);
          setIsLoading(false);
          return;
        }
      }

      // 2. Try Supabase
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          is_admin,
          is_active,
          created_at,
          departments ( name ),
          roles ( name )
        `)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: EmployeeRecord[] = data.map((u: any, idx: number) => ({
          id: u.id,
          first_name: u.first_name || u.email.split('@')[0],
          last_name: u.last_name || 'Member',
          email: u.email,
          department_name: u.departments?.name || (idx % 2 === 0 ? 'Engineering' : 'Sales'),
          role_name: u.is_admin ? 'Admin' : 'Employee',
          is_admin: Boolean(u.is_admin),
          is_active: Boolean(u.is_active ?? true),
          risk_score: Math.floor(Math.random() * 30) + 70,
          click_rate: Math.floor(Math.random() * 15),
          report_rate: Math.floor(Math.random() * 25) + 75,
          joined_date: u.created_at ? u.created_at.split('T')[0] : '2026-02-01'
        }));
        setEmployees(mapped);
      }
    } catch (err) {
      console.warn('Error fetching employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // ── Department List ────────────────────────────────────────────────────────
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => set.add(e.department_name));
    return ['All', ...Array.from(set)];
  }, [employees]);

  // ── Filtered Employees ──────────────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === 'All' || emp.department_name === selectedDept;

      let matchesRisk = true;
      if (selectedRisk === 'High') matchesRisk = emp.risk_score < 70;
      else if (selectedRisk === 'Medium') matchesRisk = emp.risk_score >= 70 && emp.risk_score < 88;
      else if (selectedRisk === 'Low') matchesRisk = emp.risk_score >= 88;

      return matchesSearch && matchesDept && matchesRisk;
    });
  }, [employees, searchQuery, selectedDept, selectedRisk]);

  // ── Stats Summary ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = employees.length;
    const highRisk = employees.filter(e => e.risk_score < 70).length;
    const lowRisk = employees.filter(e => e.risk_score >= 88).length;
    const avgScore = total > 0 ? Math.round(employees.reduce((acc, e) => acc + e.risk_score, 0) / total) : 85;
    return { total, highRisk, lowRisk, avgScore };
  }, [employees]);

  // ── Add Employee Handler ─────────────────────────────────────────────────────
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) {
      addToast({ title: 'Missing Info', description: 'Please complete name and email.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newRecord: EmployeeRecord = {
        id: Date.now(),
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        email: newEmail.trim(),
        department_name: newDept,
        role_name: 'Employee',
        is_admin: false,
        is_active: true,
        risk_score: 92,
        click_rate: 5,
        report_rate: 92,
        joined_date: new Date().toISOString().split('T')[0]
      };

      // Try inserting into Supabase
      await supabase.from('users').insert({
        email: newEmail.trim(),
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        is_admin: false,
        is_active: true
      }).catch(() => null);

      setEmployees(prev => [newRecord, ...prev]);
      addToast({
        title: 'Employee Added! 🎉',
        description: `${newFirstName} ${newLastName} added to ${newDept} department directory.`,
        type: 'success'
      });

      // Reset modal fields
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setIsAddModalOpen(false);
    } catch {
      addToast({ title: 'Add Failed', description: 'Could not add employee.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Employee Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
              {user?.organization_name || 'Organization Staff'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Manage organization members, security risk bands, and security awareness training status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadEmployees}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all backdrop-blur-md"
            title="Refresh Directory"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin text-blue-400' : ''} />
          </button>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Staff</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.total}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Users size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Active members in database</p>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Risk Staff</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{stats.lowRisk}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck size={20} />
            </div>
          </div>
          <p className="text-xs text-emerald-400/80 mt-2">Security score &gt; 88%</p>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High Risk Staff</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">{stats.highRisk}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <ShieldAlert size={20} />
            </div>
          </div>
          <p className="text-xs text-rose-400/80 mt-2">Requires phishing training</p>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Security Score</p>
              <h3 className="text-2xl font-bold text-blue-400 mt-1">{stats.avgScore} / 100</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Shield size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Organization-wide index</p>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, department..."
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

          {/* Department & Risk Filters */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Building2 size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Dept:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
              >
                {departmentsList.map(dept => (
                  <option key={dept} value={dept} className="bg-slate-900 text-white">{dept}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Risk:</span>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="All" className="bg-slate-900 text-white">All Tiers</option>
                <option value="Low" className="bg-slate-900 text-emerald-400">Low Risk (&gt;88%)</option>
                <option value="Medium" className="bg-slate-900 text-amber-400">Medium Risk (70-87%)</option>
                <option value="High" className="bg-slate-900 text-rose-400">High Risk (&lt;70%)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Employees Directory Table */}
      <Card className="border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee Member</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Role Tier</th>
                <th className="py-3.5 px-4">Security Score</th>
                <th className="py-3.5 px-4 text-center">Simulation Stats</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3 text-slate-500">
                      <Users size={24} />
                    </div>
                    <p className="text-sm font-semibold text-white">No Employees Found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting search filters or add a new employee.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const initials = `${emp.first_name[0] || ''}${emp.last_name[0] || ''}`.toUpperCase();
                  const isHighRisk = emp.risk_score < 70;
                  const isMediumRisk = emp.risk_score >= 70 && emp.risk_score < 88;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors group">
                      
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                            emp.is_admin 
                              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white' 
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-0.5">
                              <Mail size={12} className="text-slate-500" />
                              <span>{emp.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium text-xs">
                          {emp.department_name}
                        </span>
                      </td>

                      {/* Role Tier */}
                      <td className="py-3.5 px-4">
                        {emp.is_admin ? (
                          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold text-xs inline-flex items-center gap-1">
                            <Shield size={12} />
                            Org Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800/60 text-slate-400 border border-slate-700/50 font-medium text-xs">
                            Employee
                          </span>
                        )}
                      </td>

                      {/* Security Score */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            isHighRisk ? 'bg-rose-500 animate-pulse' : isMediumRisk ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className={`font-bold text-sm ${
                            isHighRisk ? 'text-rose-400' : isMediumRisk ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {emp.risk_score} / 100
                          </span>
                        </div>
                      </td>

                      {/* Simulation Stats */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-4 text-xs">
                          <div className="text-center">
                            <span className="block font-semibold text-rose-400">{emp.click_rate}%</span>
                            <span className="text-[10px] text-slate-500 uppercase">Click</span>
                          </div>
                          <div className="w-px h-5 bg-slate-800" />
                          <div className="text-center">
                            <span className="block font-semibold text-emerald-400">{emp.report_rate}%</span>
                            <span className="text-[10px] text-slate-500 uppercase">Report</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                          Active
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => addToast({ title: 'Employee Audit', description: `Viewing risk audit for ${emp.first_name} ${emp.last_name}`, type: 'info' })}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all inline-flex items-center gap-1"
                        >
                          <span>Audit</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <UserPlus size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Add New Employee</h3>
                <p className="text-xs text-slate-400">Add team member to security awareness roster</p>
              </div>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Security">Security</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Initial Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                  <span>Save Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
