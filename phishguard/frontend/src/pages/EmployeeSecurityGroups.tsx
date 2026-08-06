import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Users, Shield, Zap, AlertTriangle, Plus, Search, Filter, CheckCircle, 
  UserCheck, Settings, Mail, Lock, Crown, ChevronRight, Trash2, UserPlus, 
  Edit3, Flame, Building2, Eye, ShieldAlert, Sparkles, RefreshCw, X, ArrowRight,
  LogOut, Clock, Check, AlertCircle, ShieldCheck, UserX, Inbox
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';
import { useAuth } from '../AuthContext';

export interface GroupMember {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  riskScore: number;
  avatarUrl?: string;
}

export interface SecurityGroup {
  id: string;
  name: string;
  code: string;
  tier: 'Tier 1 (Critical HVT)' | 'Tier 2 (Sensitive Data)' | 'Tier 3 (Inbound Facing)' | 'Tier 4 (Standard)';
  tierNumber: 1 | 2 | 3 | 4;
  description: string;
  simulationFrequency: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly';
  simulationType: string;
  riskScore: number;
  membersCount: number;
  departments: string[];
  policies: string[];
  members: GroupMember[];
}

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userDepartment: string;
  userRole: string;
  groupId: string;
  groupName: string;
  groupTier: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_GROUPS: SecurityGroup[] = [
  {
    id: 'grp-1',
    name: 'Executive & C-Suite HVT',
    code: 'EXEC-HVT',
    tier: 'Tier 1 (Critical HVT)',
    tierNumber: 1,
    description: 'High-Value Executive Targets with administrative wire transfer authority and board communications.',
    simulationFrequency: 'Weekly',
    simulationType: 'Quishing, Deepfake Voice & Executive Whaling',
    riskScore: 24,
    membersCount: 5,
    departments: ['Executive', 'Finance', 'Legal'],
    policies: [
      'Hardware FIDO2 / WebAuthn Only',
      'Mandatory Verbal Passphrase Check for Wires',
      'Weekly Quishing & Deepfake Drills',
      'Out-of-band Email Signature Verification'
    ],
    members: [
      { id: 'usr-1', name: 'Sarah Jenkins', email: 'sarah.j@company.com', department: 'Executive', role: 'Chief Executive Officer', riskScore: 28 },
      { id: 'usr-2', name: 'Michael Vance', email: 'michael.v@company.com', department: 'Finance', role: 'Chief Financial Officer', riskScore: 22 },
      { id: 'usr-3', name: 'Elena Rostova', email: 'elena.r@company.com', department: 'Legal', role: 'General Counsel', riskScore: 19 },
      { id: 'usr-4', name: 'David Kim', email: 'david.k@company.com', department: 'Executive', role: 'VP Corporate Development', riskScore: 26 },
      { id: 'usr-5', name: 'Amanda Sterling', email: 'amanda.s@company.com', department: 'Finance', role: 'Head of Treasury', riskScore: 25 }
    ]
  },
  {
    id: 'grp-2',
    name: 'IT Systems & DevOps Security Tier',
    code: 'SYS-ADMIN',
    tier: 'Tier 1 (Critical HVT)',
    tierNumber: 1,
    description: 'Privileged IT system administrators, Cloud Infrastructure Leads, and DevOps engineers with root production access.',
    simulationFrequency: 'Weekly',
    simulationType: 'Spear Phishing, Supply Chain Malware & Token Theft',
    riskScore: 14,
    membersCount: 3,
    departments: ['Engineering', 'IT Security', 'DevOps'],
    policies: [
      'YubiKey FIDO2 Enforcement',
      'Short-lived AWS IAM Session Tokens',
      'Zero-Trust IP Whitelisting',
      'Weekly Infostealer Malware Drills'
    ],
    members: [
      { id: 'usr-6', name: 'Alex Rivera', email: 'alex.r@company.com', department: 'IT Security', role: 'Lead SecOps Engineer', riskScore: 10 },
      { id: 'usr-7', name: 'Marcus Brody', email: 'marcus.b@company.com', department: 'DevOps', role: 'Principal Cloud Architect', riskScore: 12 },
      { id: 'usr-8', name: 'Priya Sharma', email: 'priya.s@company.com', department: 'Engineering', role: 'Staff Infrastructure Engineer', riskScore: 15 }
    ]
  },
  {
    id: 'grp-3',
    name: 'HR & Payroll Data Protection',
    code: 'HR-PAYROLL',
    tier: 'Tier 2 (Sensitive Data)',
    tierNumber: 2,
    description: 'Human Resources and Payroll specialists managing PII, employee bank routing, and tax documents.',
    simulationFrequency: 'Bi-weekly',
    simulationType: 'Direct Deposit Fraud & Resume Payload Scams',
    riskScore: 18,
    membersCount: 3,
    departments: ['Human Resources', 'Payroll', 'Recruiting'],
    policies: [
      'Number-Matching Push MFA',
      'Direct Deposit Out-of-band Phone Verify',
      'Attachment Sandbox Inspection',
      'Bi-weekly Spear Phishing Drills'
    ],
    members: [
      { id: 'usr-9', name: 'Jessica Miller', email: 'jessica.m@company.com', department: 'Human Resources', role: 'VP People Operations', riskScore: 16 },
      { id: 'usr-10', name: 'Robert Chen', email: 'robert.c@company.com', department: 'Payroll', role: 'Payroll Lead Manager', riskScore: 21 },
      { id: 'usr-11', name: 'Rachel Green', email: 'rachel.g@company.com', department: 'Recruiting', role: 'Senior Talent Partner', riskScore: 17 }
    ]
  },
  {
    id: 'grp-4',
    name: 'Sales & Customer Inbound Tier',
    code: 'SALES-FRONT',
    tier: 'Tier 3 (Inbound Facing)',
    tierNumber: 3,
    description: 'High-volume external email communications handling unverified prospective customer attachments and links.',
    simulationFrequency: 'Bi-weekly',
    simulationType: 'Deceptive RFP Links & Fake Invoice QR Codes',
    riskScore: 29,
    membersCount: 3,
    departments: ['Sales', 'Customer Support', 'Marketing'],
    policies: [
      'External Link Caution Banner',
      'Real-time URL Reputation Check',
      'Bi-weekly Phishing Scams',
      'One-click Report Phish Integration'
    ],
    members: [
      { id: 'usr-12', name: 'Daniel Park', email: 'daniel.p@company.com', department: 'Sales', role: 'Enterprise Account Exec', riskScore: 32 },
      { id: 'usr-13', name: 'Chloe Bennett', email: 'chloe.b@company.com', department: 'Customer Support', role: 'Support Lead', riskScore: 27 },
      { id: 'usr-14', name: 'Ethan Hunt', email: 'ethan.h@company.com', department: 'Sales', role: 'Business Dev Rep', riskScore: 28 }
    ]
  },
  {
    id: 'grp-5',
    name: 'Standard Baseline Staff & Contractors',
    code: 'STD-STAFF',
    tier: 'Tier 4 (Standard)',
    tierNumber: 4,
    description: 'General employees, temporary contractors, and office operations staff with standard corporate access.',
    simulationFrequency: 'Monthly',
    simulationType: 'General Phishing & IT Support Impersonation',
    riskScore: 15,
    membersCount: 2,
    departments: ['Operations', 'Facilities', 'Design', 'General'],
    policies: [
      'Standard Authenticator App MFA',
      'Monthly Awareness Refreshers',
      'Quarterly Compliance Checkups',
      'Standard Password Vault Usage'
    ],
    members: [
      { id: 'usr-15', name: 'Liam O\'Connor', email: 'liam.o@company.com', department: 'Operations', role: 'Operations Coordinator', riskScore: 14 },
      { id: 'usr-16', name: 'Sophia Martinez', email: 'sophia.m@company.com', department: 'Design', role: 'UX Designer', riskScore: 16 }
    ]
  }
];

const INITIAL_JOIN_REQUESTS: JoinRequest[] = [];

export default function EmployeeSecurityGroups() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin' || location.pathname.startsWith('/admin');

  const userEmail = user?.email || 'employee@company.com';
  const userName = userEmail.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());

  const [groups, setGroups] = useState<SecurityGroup[]>(INITIAL_GROUPS);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'groups' | 'requests'>('groups');

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);
  const [showPolicyModal, setShowPolicyModal] = useState<boolean>(false);

  // Form State for Group Creation
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupCode, setNewGroupCode] = useState<string>('');
  const [newGroupTier, setNewGroupTier] = useState<SecurityGroup['tier']>('Tier 2 (Sensitive Data)');
  const [newGroupDesc, setNewGroupDesc] = useState<string>('');
  const [newGroupFreq, setNewGroupFreq] = useState<SecurityGroup['simulationFrequency']>('Bi-weekly');
  const [newGroupType, setNewGroupType] = useState<string>('Spear Phishing & Link Verification');

  // Member Management Modal State
  const [activeManagingGroup, setActiveManagingGroup] = useState<SecurityGroup | null>(null);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberDept, setNewMemberDept] = useState<string>('Engineering');
  const [newMemberRole, setNewMemberRole] = useState<string>('Security Specialist');

  // Policy Modal State
  const [activePolicyGroup, setActivePolicyGroup] = useState<SecurityGroup | null>(null);
  const [policyInputs, setPolicyInputs] = useState<string[]>([]);
  const [newPolicyText, setNewPolicyText] = useState<string>('');

  const fetchGroups = async () => {
    try {
      const res = await apiFetch('/groups').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setGroups(data);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await apiFetch('/groups/requests').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setJoinRequests(data);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchRequests();
  }, []);

  // Determine current employee membership & pending requests
  const userJoinedGroup = groups.find(g => 
    g.members.some(m => m.email.toLowerCase() === userEmail.toLowerCase())
  );

  const userPendingRequest = joinRequests.find(r => 
    r.userEmail.toLowerCase() === userEmail.toLowerCase() && r.status === 'pending'
  );

  const userRejectedRequest = joinRequests.find(r => 
    r.userEmail.toLowerCase() === userEmail.toLowerCase() && r.status === 'rejected'
  );

  const pendingRequestsCount = joinRequests.filter(r => r.status === 'pending').length;

  const totalMembers = groups.reduce((acc, g) => acc + g.membersCount, 0);
  const tier1Count = groups.filter(g => g.tierNumber === 1).length;
  const avgRiskScore = Math.round(groups.reduce((acc, g) => acc + g.riskScore, 0) / (groups.length || 1));

  const filteredGroups = groups.filter(g => {
    const matchesTier = selectedTierFilter === 'All' || g.tier.includes(selectedTierFilter);
    const matchesSearch = searchQuery === '' || 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.departments.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTier && matchesSearch;
  });

  const getTierBadge = (tierNumber: number, tierName: string) => {
    switch (tierNumber) {
      case 1:
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5 shadow-sm">
            <Crown size={12} className="text-red-400" /> {tierName}
          </span>
        );
      case 2:
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
            <ShieldAlert size={12} className="text-amber-400" /> {tierName}
          </span>
        );
      case 3:
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 shadow-sm">
            <Mail size={12} className="text-blue-400" /> {tierName}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 shadow-sm">
            <UserCheck size={12} className="text-slate-400" /> {tierName}
          </span>
        );
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 25) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (score >= 18) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };

  // ── Employee Actions ────────────────────────────────────────────────────────

  const handleRequestToJoin = async (group: SecurityGroup) => {
    if (userJoinedGroup) {
      addToast({
        title: 'Already Enrolled',
        description: `You are currently enrolled in "${userJoinedGroup.name}". You must leave your current group before joining another.`,
        type: 'warning'
      });
      return;
    }

    if (userPendingRequest) {
      addToast({
        title: 'Request Pending',
        description: `You already have a pending request for "${userPendingRequest.groupName}".`,
        type: 'warning'
      });
      return;
    }

    try {
      const res = await apiFetch(`/groups/${group.id}/join-request`, {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        addToast({
          title: 'Join Request Submitted! 📩',
          description: `Requested to join "${group.name}". Awaiting security administrator approval.`,
          type: 'success'
        });
        await fetchRequests();
        await fetchGroups();
      } else {
        addToast({
          title: 'Request Failed',
          description: data.detail || 'Could not submit join request.',
          type: 'error'
        });
      }
    } catch {
      addToast({
        title: 'Error',
        description: 'Failed to communicate with server.',
        type: 'error'
      });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    const targetGroup = groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    try {
      const res = await apiFetch(`/groups/${groupId}/leave`, {
        method: 'POST'
      });
      if (res.ok) {
        addToast({
          title: 'Left Security Group',
          description: `You have left "${targetGroup.name}". You can now request to join another security group below.`,
          type: 'info'
        });
        await fetchGroups();
        await fetchRequests();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({
          title: 'Error',
          description: data.detail || 'Could not leave group.',
          type: 'error'
        });
      }
    } catch {
      addToast({
        title: 'Error',
        description: 'Failed to communicate with server.',
        type: 'error'
      });
    }
  };

  const handleCancelRequest = (reqId: string) => {
    setJoinRequests(prev => prev.filter(r => r.id !== reqId));
    addToast({
      title: 'Request Cancelled',
      description: 'Your join request was cancelled.',
      type: 'info'
    });
  };

  const handleDismissRejectedRequest = (reqId: string) => {
    setJoinRequests(prev => prev.filter(r => r.id !== reqId));
  };

  // ── Admin Actions ───────────────────────────────────────────────────────────

  const handleApproveRequest = async (request: JoinRequest) => {
    try {
      const res = await apiFetch(`/groups/requests/${request.id}/approve`, {
        method: 'POST'
      });
      if (res.ok) {
        addToast({
          title: 'Join Request Approved! ✅',
          description: `Approved ${request.userName} into security group "${request.groupName}".`,
          type: 'success'
        });
        await fetchRequests();
        await fetchGroups();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({
          title: 'Approval Failed',
          description: data.detail || 'Could not approve request.',
          type: 'error'
        });
      }
    } catch {
      addToast({
        title: 'Error',
        description: 'Failed to communicate with server.',
        type: 'error'
      });
    }
  };

  const handleRejectRequest = async (request: JoinRequest) => {
    try {
      const res = await apiFetch(`/groups/requests/${request.id}/reject`, {
        method: 'POST'
      });
      if (res.ok) {
        addToast({
          title: 'Join Request Rejected ❌',
          description: `Rejected join request from ${request.userName} for "${request.groupName}". Request removed from database.`,
          type: 'error'
        });
        await fetchRequests();
        await fetchGroups();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({
          title: 'Rejection Failed',
          description: data.detail || 'Could not reject request.',
          type: 'error'
        });
      }
    } catch {
      addToast({
        title: 'Error',
        description: 'Failed to communicate with server.',
        type: 'error'
      });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName || !newGroupDesc) {
      addToast({ title: 'Missing Details', description: 'Please fill in group name and description.', type: 'error' });
      return;
    }

    try {
      const res = await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: newGroupName,
          code: newGroupCode,
          tier: newGroupTier,
          description: newGroupDesc,
          simulationFrequency: newGroupFreq,
          simulationType: newGroupType
        })
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupCode('');
        setNewGroupDesc('');
        addToast({
          title: 'Security Group Created! 🛡️',
          description: `Successfully configured group "${newGroupName}".`,
          type: 'success'
        });
        await fetchGroups();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Error', description: data.detail || 'Failed to create group.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to communicate with server.', type: 'error' });
    }
  };

  const handleOpenMembersModal = (group: SecurityGroup) => {
    setActiveManagingGroup(group);
    setShowMembersModal(true);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeManagingGroup || !newMemberName || !newMemberEmail) {
      addToast({ title: 'Invalid Member Info', description: 'Provide valid member name and email.', type: 'error' });
      return;
    }

    try {
      const res = await apiFetch(`/groups/${activeManagingGroup.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          name: newMemberName,
          email: newMemberEmail,
          department: newMemberDept,
          role: newMemberRole
        })
      });

      if (res.ok) {
        setNewMemberName('');
        setNewMemberEmail('');
        addToast({
          title: 'Member Added! 👤',
          description: `Added ${newMemberName} to security group ${activeManagingGroup.name}.`,
          type: 'success'
        });
        await fetchGroups();
        // Update active modal group
        const updatedRes = await apiFetch('/groups');
        if (updatedRes.ok) {
          const freshGroups: SecurityGroup[] = await updatedRes.json();
          const target = freshGroups.find(g => String(g.id) === String(activeManagingGroup.id));
          if (target) setActiveManagingGroup(target);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Error', description: data.detail || 'Failed to add member.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to communicate with server.', type: 'error' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeManagingGroup) return;

    try {
      const res = await apiFetch(`/groups/${activeManagingGroup.id}/members/${memberId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        addToast({
          title: 'Member Removed',
          description: 'Removed member from security group.',
          type: 'info'
        });
        await fetchGroups();
        setActiveManagingGroup(prev => prev ? {
          ...prev,
          membersCount: Math.max(0, prev.membersCount - 1),
          members: prev.members.filter(m => m.id !== memberId)
        } : null);
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({
          title: 'Error',
          description: data.detail || 'Could not remove member.',
          type: 'error'
        });
      }
    } catch {
      addToast({
        title: 'Error',
        description: 'Failed to communicate with server.',
        type: 'error'
      });
    }
  };

  const handleOpenPolicyModal = (group: SecurityGroup) => {
    setActivePolicyGroup(group);
    setPolicyInputs([...group.policies]);
    setShowPolicyModal(true);
  };

  const handleAddPolicy = () => {
    if (!newPolicyText.trim()) return;
    setPolicyInputs(prev => [...prev, newPolicyText.trim()]);
    setNewPolicyText('');
  };

  const handleRemovePolicy = (index: number) => {
    setPolicyInputs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePolicies = async () => {
    if (!activePolicyGroup) return;

    try {
      const res = await apiFetch(`/groups/${activePolicyGroup.id}/policies`, {
        method: 'PUT',
        body: JSON.stringify({ policies: policyInputs })
      });

      if (res.ok) {
        setShowPolicyModal(false);
        addToast({
          title: 'Policies Updated 🛡️',
          description: `Updated defense policies for group "${activePolicyGroup.name}".`,
          type: 'success'
        });
        await fetchGroups();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Error', description: data.detail || 'Failed to update policies.', type: 'error' });
      }
    } catch {
      addToast({ title: 'Error', description: 'Failed to communicate with server.', type: 'error' });
    }
  };

  const handleLaunchDrill = (group: SecurityGroup) => {
    addToast({
      title: 'Phishing Drill Initiated! 🚀',
      description: `Dispatched automated ${group.simulationType} test campaign to all ${group.membersCount} members in ${group.name}.`,
      type: 'success'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1">
            <Users size={16} />
            <span>ENTERPRISE TARGET SEGMENTATION & ACCESS TIERS</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Employee Security Groups</h1>
          <p className="mt-1 text-sm text-slate-400">
            {isAdmin 
              ? "Manage security groups, approve employee join requests, enforce role-tier policies, and launch targeted drills."
              : "Join a security group tailored to your role, view your group's security policies, or request transfer to another group."
            }
          </p>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {isAdmin && (
            <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('groups')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'groups' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield size={14} /> Security Groups
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'requests' ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Inbox size={14} /> Join Requests
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {isAdmin && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Plus size={16} /> Create Group
            </Button>
          )}
        </div>
      </div>

      {/* ── Overview Stats Dashboard Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Security Groups</p>
            <p className="text-lg font-black text-white mt-0.5">{groups.length} Segments</p>
          </div>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">My Group Status</p>
            <p className="text-lg font-black text-white mt-0.5">
              {userJoinedGroup ? userJoinedGroup.code : userPendingRequest ? 'Request Pending' : 'Not Enrolled'}
            </p>
          </div>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Inbox size={24} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Requests</p>
            <p className="text-lg font-black text-white mt-0.5">{pendingRequestsCount} Awaiting Review</p>
          </div>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Vulnerability Score</p>
            <p className="text-lg font-black text-white mt-0.5">{avgRiskScore}% Phish Risk Rate</p>
          </div>
        </Card>
      </div>

      {/* ── EMPLOYEE SPECIFIC VIEW: MY ENROLLED GROUP & STATUS BANNERS ── */}
      {!isAdmin && (
        <div className="space-y-6">
          
          {/* 1. EMPLOYEE HAS JOINED A GROUP */}
          {userJoinedGroup && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/40 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-blue-500/10 pointer-events-none">
                <ShieldCheck size={160} />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/30">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                        {userJoinedGroup.code}
                      </span>
                      {getTierBadge(userJoinedGroup.tierNumber, userJoinedGroup.tier)}
                    </div>
                    <h2 className="text-2xl font-black text-white mt-1">My Security Group: {userJoinedGroup.name}</h2>
                  </div>
                </div>

                <Button
                  onClick={() => handleLeaveGroup(userJoinedGroup.id)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 self-start sm:self-auto transition-all"
                >
                  <LogOut size={14} /> Leave Security Group
                </Button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {userJoinedGroup.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Flame size={14} className="text-amber-400" /> Drill Frequency
                  </span>
                  <p className="text-base font-black text-white">{userJoinedGroup.simulationFrequency} Drills</p>
                  <p className="text-[11px] text-slate-400">{userJoinedGroup.simulationType}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Users size={14} className="text-blue-400" /> Peer Enrolled Roster
                  </span>
                  <p className="text-base font-black text-white">{userJoinedGroup.membersCount} Staff Members</p>
                  <p className="text-[11px] text-slate-400">Departments: {userJoinedGroup.departments.join(', ')}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-emerald-400" /> Phishing Risk Rate
                  </span>
                  <p className="text-base font-black text-emerald-400">{userJoinedGroup.riskScore}% Vulnerability</p>
                  <p className="text-[11px] text-slate-400">Compliant with company baseline</p>
                </div>
              </div>

              {/* Security Policies */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={14} className="text-blue-400" /> Enforced Security Rules & Authentication Policies
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {userJoinedGroup.policies.map((pol, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                      <span>{pol}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* 2. EMPLOYEE HAS A PENDING JOIN REQUEST */}
          {!userJoinedGroup && userPendingRequest && (
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-lg shadow-amber-500/30 font-black">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Join Request Pending Admin Approval
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Pending
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Your request to join <strong className="text-amber-300">{userPendingRequest.groupName}</strong> ({userPendingRequest.groupTier}) is under review by your organization security administrator.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => handleCancelRequest(userPendingRequest.id)}
                variant="outline"
                className="border-amber-500/40 text-amber-300 hover:text-white hover:bg-amber-500/20 text-xs px-4 py-2 rounded-xl whitespace-nowrap"
              >
                Cancel Request
              </Button>
            </div>
          )}

          {/* 3. EMPLOYEE HAD A REQUEST REJECTED BY ADMIN */}
          {!userJoinedGroup && userRejectedRequest && (
            <div className="p-5 rounded-2xl bg-red-950/30 border border-red-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/30 font-black shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Join Request Rejected by Admin
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                      Rejected
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Your request to join <strong className="text-red-300">{userRejectedRequest.groupName}</strong> was rejected by your organization security administrator. You may request to join another security group below.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => handleDismissRejectedRequest(userRejectedRequest.id)}
                variant="outline"
                className="border-red-500/40 text-red-300 hover:text-white hover:bg-red-500/20 text-xs px-4 py-2 rounded-xl whitespace-nowrap shrink-0"
              >
                Dismiss Notification
              </Button>
            </div>
          )}

          {/* 3. EMPLOYEE IS NOT IN ANY GROUP AND HAS NO PENDING REQUEST */}
          {!userJoinedGroup && !userPendingRequest && (
            <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-center gap-4 shadow-lg">
              <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/30 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Not Currently Enrolled in a Security Group</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  You are not assigned to any security group. Browse the available organization security groups below and click <strong>"Request to Join Group"</strong> on the segment that matches your role.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── ADMIN SPECIFIC VIEW: PENDING JOIN REQUESTS TAB / SECTION ── */}
      {isAdmin && activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Inbox size={18} className="text-amber-400" />
              <span>Pending Employee Join Requests</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {joinRequests.filter(r => r.status === 'pending').length} Pending
              </span>
            </h2>
          </div>

          {joinRequests.filter(r => r.status === 'pending').length === 0 ? (
            <div className="p-12 border border-slate-800 border-dashed rounded-3xl text-center bg-slate-900/20 space-y-3">
              <CheckCircle size={36} className="text-emerald-400 mx-auto" />
              <p className="text-base font-bold text-slate-300">All Join Requests Processed</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">There are no pending employee group join requests awaiting review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {joinRequests.filter(r => r.status === 'pending').map((request) => (
                <Card 
                  key={request.id}
                  className="border border-amber-500/30 bg-slate-900/80 backdrop-blur-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-amber-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                      {request.userName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{request.userName}</h3>
                        <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                          {request.userDepartment}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {request.userEmail} • <span className="text-slate-400">{request.userRole}</span>
                      </p>
                      <p className="text-[11px] text-amber-300 mt-1 flex items-center gap-1 font-semibold">
                        <Clock size={12} /> Requested to join <strong className="text-white">{request.groupName}</strong> ({request.groupTier}) • {request.requestedAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                    <Button
                      onClick={() => handleRejectRequest(request)}
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
                    >
                      <X size={14} /> Reject
                    </Button>
                    <Button
                      onClick={() => handleApproveRequest(request)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <Check size={14} /> Approve Request
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SECURITY ROLE TIERS REFERENCE BAR ── */}
      {(isAdmin ? activeTab === 'groups' : true) && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Shield size={16} className="text-blue-400" />
            <span>SECURITY ROLE TIERS & SIMULATION GUIDELINES</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-red-400 flex items-center gap-1"><Crown size={13} /> Tier 1 (Critical HVT)</span>
                <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-bold">Weekly</span>
              </div>
              <p className="text-slate-400 text-[11px]">Executives, C-Suite, SysAdmins with wire authority and root access. Enforce FIDO2 Passkeys & Quishing Drills.</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-400 flex items-center gap-1"><ShieldAlert size={13} /> Tier 2 (Sensitive Data)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">Bi-weekly</span>
              </div>
              <p className="text-slate-400 text-[11px]">HR Payroll, Finance Managers, Legal. Bi-weekly Spear Phishing & Direct Deposit Fraud verification.</p>
            </div>

            <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-400 flex items-center gap-1"><Mail size={13} /> Tier 3 (Inbound Facing)</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">Bi-weekly</span>
              </div>
              <p className="text-slate-400 text-[11px]">Sales, Support, Marketing receiving high external email volumes. External link warning banners & Sandbox.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-300 flex items-center gap-1"><UserCheck size={13} /> Tier 4 (Standard Access)</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">Monthly</span>
              </div>
              <p className="text-slate-400 text-[11px]">General staff, contractors & operations. Standard authenticator app MFA & monthly phishing awareness drills.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH & TIER FILTERS ── */}
      {(isAdmin ? activeTab === 'groups' : true) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 p-4 rounded-2xl">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search groups, departments, or codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Tier Filter Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
              <Filter size={14} /> Filter Tier:
            </span>
            {['All', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTierFilter(tier)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedTierFilter === tier
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SECURITY GROUPS LIST / GRID ── */}
      {(isAdmin ? activeTab === 'groups' : true) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              <span>Available Organization Security Groups</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredGroups.length} {filteredGroups.length === 1 ? 'Group' : 'Groups'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGroups.map((group) => {
              const isUserMember = group.members.some(m => m.email.toLowerCase() === userEmail.toLowerCase());
              const isUserPending = userPendingRequest && userPendingRequest.groupId === group.id;

              return (
                <Card 
                  key={group.id} 
                  className={`border bg-slate-900/60 backdrop-blur-xl p-6 space-y-5 transition-all duration-200 flex flex-col justify-between ${
                    isUserMember ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'border-slate-800 hover:border-blue-500/40'
                  }`}
                >
                  <div className="space-y-4">
                    
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {group.code}
                        </span>
                        {getTierBadge(group.tierNumber, group.tier)}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isUserMember && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle size={10} /> Joined Member
                          </span>
                        )}
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getRiskColor(group.riskScore)}`}>
                          {group.riskScore}% Phish Risk Rate
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-lg font-black text-white leading-tight">{group.name}</h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{group.description}</p>
                    </div>

                    {/* Simulation Frequency & Target Types */}
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium flex items-center gap-1.5">
                          <Flame size={14} className="text-amber-400" /> Drill Frequency:
                        </span>
                        <span className="font-extrabold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {group.simulationFrequency}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        <strong className="text-slate-400">Simulation Focus:</strong> {group.simulationType}
                      </div>
                    </div>

                    {/* Group Security Policies */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Enforced Security Rules</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.policies.map((pol, idx) => (
                          <span key={idx} className="text-[10px] font-bold px-2 py-1 bg-slate-950 text-slate-300 border border-slate-800 rounded-md flex items-center gap-1">
                            <Lock size={10} className="text-blue-400" /> {pol}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Assigned Members Preview */}
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2 overflow-hidden">
                          {group.members.slice(0, 4).map((m, idx) => (
                            <div 
                              key={idx} 
                              className="inline-block h-7 w-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-[10px] flex items-center justify-center ring-2 ring-slate-900"
                              title={`${m.name} (${m.role})`}
                            >
                              {m.name.substring(0, 2).toUpperCase()}
                            </div>
                          ))}
                        </div>
                        <span className="font-bold text-slate-300 text-xs">
                          {group.membersCount} Enrolled Staff
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-500 font-medium">
                        {group.departments.join(', ')}
                      </span>
                    </div>

                  </div>

                  {/* Action Footer */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    {/* Admin Actions */}
                    {isAdmin ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleOpenMembersModal(group)}
                          className="border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs px-3 py-1.5 flex items-center gap-1.5"
                        >
                          <Users size={14} /> Manage Staff ({group.membersCount})
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleOpenPolicyModal(group)}
                            className="border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs px-3 py-1.5 flex items-center gap-1.5"
                          >
                            <Settings size={14} /> Policies
                          </Button>

                          <Button
                            onClick={() => handleLaunchDrill(group)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                          >
                            <Flame size={14} /> Launch Drill
                          </Button>
                        </div>
                      </>
                    ) : (
                      /* Employee Join / Leave Actions */
                      <div className="w-full flex items-center justify-between gap-2">
                        {isUserMember ? (
                          <div className="w-full flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle size={14} /> Currently Enrolled
                            </span>
                            <Button
                              onClick={() => handleLeaveGroup(group.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                            >
                              <LogOut size={14} /> Leave Group
                            </Button>
                          </div>
                        ) : isUserPending ? (
                          <div className="w-full flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                              <Clock size={14} /> Request Pending Admin Review
                            </span>
                            <Button
                              onClick={() => handleCancelRequest(userPendingRequest.id)}
                              variant="outline"
                              className="border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-xl"
                            >
                              Cancel Request
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-400">Available to Join</span>
                            <Button
                              onClick={() => handleRequestToJoin(group)}
                              disabled={Boolean(userJoinedGroup)}
                              className={`text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md ${
                                userJoinedGroup
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                              }`}
                            >
                              <UserPlus size={14} /> Request to Join Group
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CREATE SECURITY GROUP MODAL (ADMIN ONLY) ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Shield size={20} className="text-blue-400" /> Create Security Group
                </h2>
                <p className="text-xs text-slate-400 mt-1">Configure target employee segment and security role tier.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="border-slate-800 text-slate-400 hover:text-white text-xs px-3 py-1.5"
              >
                <X size={14} />
              </Button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-300">Group Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Finance & Accounting Lead Group"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300">Group Code Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. FIN-LEAD"
                    value={newGroupCode}
                    onChange={(e) => setNewGroupCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300">Security Role Tier</label>
                <select
                  value={newGroupTier}
                  onChange={(e: any) => setNewGroupTier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-blue-500"
                >
                  <option value="Tier 1 (Critical HVT)">Tier 1 (Critical HVT) - Executive, Wire Authority & Root Access</option>
                  <option value="Tier 2 (Sensitive Data)">Tier 2 (Sensitive Data) - HR Payroll, Legal & Sensitive Records</option>
                  <option value="Tier 3 (Inbound Facing)">Tier 3 (Inbound Facing) - Sales, Support & Procurement</option>
                  <option value="Tier 4 (Standard)">Tier 4 (Standard) - General Staff & Office Operations</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300">Target Simulation Frequency</label>
                <select
                  value={newGroupFreq}
                  onChange={(e: any) => setNewGroupFreq(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-blue-500"
                >
                  <option value="Weekly">Weekly Phishing & Quishing Tests</option>
                  <option value="Bi-weekly">Bi-weekly Targeted Simulations</option>
                  <option value="Monthly">Monthly Awareness Drills</option>
                  <option value="Quarterly">Quarterly Checkups</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300">Primary Simulation Focus</label>
                <input
                  type="text"
                  placeholder="e.g. Direct Deposit Scams & Deceptive Attachments"
                  value={newGroupType}
                  onChange={(e) => setNewGroupType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">Description & Target Criteria</label>
                <textarea
                  rows={3}
                  placeholder="Explain group purpose, risk parameters, and target members..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white mt-1 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="border-slate-800 text-slate-400 hover:text-white px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-2 text-xs rounded-xl shadow-lg shadow-blue-500/20"
                >
                  Create Security Group
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── MANAGE MEMBERS MODAL (ADMIN ONLY) ── */}
      {showMembersModal && activeManagingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden p-6 space-y-6 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white">Manage Group Members</h2>
                  {getTierBadge(activeManagingGroup.tierNumber, activeManagingGroup.tier)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Enrolled employees in <strong className="text-blue-300">{activeManagingGroup.name}</strong> ({activeManagingGroup.membersCount} Total Staff)
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowMembersModal(false)}
                className="border-slate-800 text-slate-400 hover:text-white text-xs px-3 py-1.5"
              >
                Close
              </Button>
            </div>

            {/* Add Member Quick Form */}
            <form onSubmit={handleAddMember} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shrink-0">
              <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <UserPlus size={14} /> Add Employee Directly To Group
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Full Name..."
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address..."
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Department..."
                  value={newMemberDept}
                  onChange={(e) => setNewMemberDept(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl">
                  Add Member
                </Button>
              </div>
            </form>

            {/* Members List */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Group Roster</p>
              {activeManagingGroup.members.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500">
                  No members currently assigned to this security group.
                </div>
              ) : (
                activeManagingGroup.members.map((member) => (
                  <div 
                    key={member.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4 text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-white">{member.name}</p>
                        <p className="text-[11px] text-slate-400">{member.email} • <span className="text-slate-300">{member.role}</span> ({member.department})</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getRiskColor(member.riskScore)}`}>
                        {member.riskScore}% Risk
                      </span>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Remove member from group"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </Card>
        </div>
      )}

      {/* ── CONFIGURE POLICIES MODAL (ADMIN ONLY) ── */}
      {showPolicyModal && activePolicyGroup && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Lock size={20} className="text-blue-400" /> Group Security Policies
                </h2>
                <p className="text-xs text-slate-400 mt-1">Configure authentication & inspection rules for {activePolicyGroup.name}.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowPolicyModal(false)}
                className="border-slate-800 text-slate-400 hover:text-white text-xs px-3 py-1.5"
              >
                <X size={14} />
              </Button>
            </div>

            {/* Policy Inputs */}
            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Enforce Hardware FIDO2 Passkey..."
                  value={newPolicyText}
                  onChange={(e) => setNewPolicyText(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <Button onClick={handleAddPolicy} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl">
                  Add Rule
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <p className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Active Group Security Rules</p>
                {policyInputs.map((pol, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-2">
                      <Lock size={14} className="text-blue-400" /> {pol}
                    </span>
                    <button
                      onClick={() => handleRemovePolicy(idx)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPolicyModal(false)}
                className="border-slate-800 text-slate-400 hover:text-white text-xs px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePolicies}
                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-2 text-xs rounded-xl shadow-lg shadow-blue-500/20"
              >
                Save Policies
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
