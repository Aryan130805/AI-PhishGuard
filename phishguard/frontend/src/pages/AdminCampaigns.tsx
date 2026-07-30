import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';
import { 
  Mail, Plus, Play, Pause, Copy, Trash2, Calendar, 
  Clock, CheckCircle, AlertTriangle, Users, Info, Settings, ArrowRight, ShieldCheck
} from 'lucide-react';

interface Template {
  id: number;
  subject: string;
  sender_name: string;
  sender_email: string;
  approved: boolean;
}

interface Department {
  id: number;
  name: string;
}

interface Campaign {
  id: number;
  name: string;
  theme: string;
  difficulty: string;
  language: string;
  department_id: number | null;
  status: string;
  scheduled_at: string | null;
  target_count: number;
  templates: Template[];
}

export default function AdminCampaigns() {
  const { success, error, info } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Form states
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [formName, setFormName] = useState('');
  const [formTheme, setFormTheme] = useState('IT Support');
  const [formDifficulty, setFormDifficulty] = useState('medium');
  const [formLanguage, setFormLanguage] = useState('en');
  const [formDeptId, setFormDeptId] = useState<string>('');
  const [formTemplateIds, setFormTemplateIds] = useState<number[]>([]);
  const [formScheduledAt, setFormScheduledAt] = useState('');

  // Authentication and API Fetch Wrapper
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    return apiFetch(url, options);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch campaigns
      const campRes = await fetchWithAuth('/campaigns');
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData);
      }

      // 2. Fetch approved templates
      const tempRes = await fetchWithAuth('/email-templates?approved=true');
      if (tempRes.ok) {
        const tempData = await tempRes.json();
        setTemplates(tempData);
      }

      // 3. Fetch departments
      const deptRes = await fetchWithAuth('/campaigns/departments/list');
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData);
      }
    } catch (err) {
      console.error(err);
      error("Failed to sync data with the training simulation server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formTemplateIds.length === 0) {
      error("A campaign must reference at least one email template.");
      return;
    }

    try {
      const res = await fetchWithAuth('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: formName,
          theme: formTheme,
          difficulty: formDifficulty,
          language: formLanguage,
          department_id: formDeptId ? parseInt(formDeptId) : null,
          template_ids: formTemplateIds
        })
      });

      if (res.ok) {
        success("Campaign created as draft.");
        setIsCreateOpen(false);
        resetForm();
        loadData();
      } else {
        const errData = await res.json();
        error(errData.detail || "Failed to create campaign.");
      }
    } catch (err) {
      error("Network error creating campaign.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    if (formTemplateIds.length === 0) {
      error("A campaign must reference at least one email template.");
      return;
    }

    try {
      const res = await fetchWithAuth(`/campaigns/${selectedCampaign.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formName,
          theme: formTheme,
          difficulty: formDifficulty,
          language: formLanguage,
          department_id: formDeptId ? parseInt(formDeptId) : null,
          template_ids: formTemplateIds
        })
      });

      if (res.ok) {
        success("Campaign updated successfully.");
        setIsEditOpen(false);
        resetForm();
        loadData();
      } else {
        const errData = await res.json();
        error(errData.detail || "Failed to update campaign.");
      }
    } catch (err) {
      error("Network error updating campaign.");
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !formScheduledAt) return;

    try {
      const res = await fetchWithAuth(`/campaigns/${selectedCampaign.id}/schedule`, {
        method: 'POST',
        body: JSON.stringify({
          scheduled_at: new Date(formScheduledAt).toISOString()
        })
      });

      if (res.ok) {
        const data = await res.json();
        success(`Campaign scheduled with ${data.target_count} targets.`);
        setIsScheduleOpen(false);
        resetForm();
        loadData();
      } else {
        const errData = await res.json();
        error(errData.detail || "Failed to schedule campaign.");
      }
    } catch (err) {
      error("Network error scheduling campaign.");
    }
  };

  const handleAction = async (action: 'pause' | 'resume' | 'clone' | 'delete', id: number) => {
    const verb = action === 'delete' ? 'DELETE' : 'POST';
    const endpoint = action === 'delete' ? `/campaigns/${id}` : `/campaigns/${id}/${action}`;
    
    try {
      const res = await fetchWithAuth(endpoint, { method: verb });
      if (res.ok) {
        success(`Campaign successfully ${action}d.`);
        loadData();
      } else {
        const errData = await res.json();
        error(errData.detail || `Action failed.`);
      }
    } catch (err) {
      error(`Network error performing ${action}.`);
    }
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormName(campaign.name);
    setFormTheme(campaign.theme);
    setFormDifficulty(campaign.difficulty);
    setFormLanguage(campaign.language);
    setFormDeptId(campaign.department_id ? campaign.department_id.toString() : '');
    setFormTemplateIds(campaign.templates.map(t => t.id));
    setIsEditOpen(true);
  };

  const openSchedule = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormScheduledAt('');
    setIsScheduleOpen(true);
  };

  const resetForm = () => {
    setSelectedCampaign(null);
    setFormName('');
    setFormTheme('IT Support');
    setFormDifficulty('medium');
    setFormLanguage('en');
    setFormDeptId('');
    setFormTemplateIds([]);
    setFormScheduledAt('');
  };

  const toggleTemplateSelection = (id: number) => {
    setFormTemplateIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  // State Machine Badges
  const getStatusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    const styleMap: Record<string, string> = {
      draft: 'bg-slate-800 text-slate-300 border-slate-700',
      scheduled: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      running: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse',
      paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styleMap[normalized] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Weekly Calendar Computations
  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getScheduledCampaignsByDay = () => {
    const calendar: Record<string, Campaign[]> = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    };

    campaigns.forEach(c => {
      if (c.scheduled_at) {
        try {
          const date = new Date(c.scheduled_at);
          const dayIndex = date.getDay();
          const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = dayMap[dayIndex];
          if (calendar[dayName]) {
            calendar[dayName].push(c);
          }
        } catch (e) {
          // Ignore invalid dates
        }
      }
    });
    return calendar;
  };

  const campaignsByDay = getScheduledCampaignsByDay();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Mail className="text-blue-500" />
            Campaign Management
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Launch, schedule, and orchestrate simulated phishing drills in your controlled sandbox.
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={openCreate} 
          className="flex items-center gap-2 self-start md:self-center bg-blue-600 hover:bg-blue-500 font-bold transition-all duration-300 shadow-lg shadow-blue-500/25"
        >
          <Plus size={16} />
          New Campaign
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/40 border border-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Drafts</p>
            <p className="text-2xl font-bold text-white mt-1">
              {campaigns.filter(c => c.status.toLowerCase() === 'draft').length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800 text-slate-400">
            <Settings size={18} />
          </div>
        </Card>
        <Card className="bg-slate-900/40 border border-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Scheduled</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">
              {campaigns.filter(c => c.status.toLowerCase() === 'scheduled').length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Clock size={18} />
          </div>
        </Card>
        <Card className="bg-slate-900/40 border border-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Running</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {campaigns.filter(c => c.status.toLowerCase() === 'running').length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Play size={18} />
          </div>
        </Card>
        <Card className="bg-slate-900/40 border border-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">
              {campaigns.filter(c => c.status.toLowerCase() === 'completed').length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <CheckCircle size={18} />
          </div>
        </Card>
      </div>

      {/* Main Campaign Table Card */}
      <Card className="border border-slate-800 bg-slate-900/40 shadow-xl backdrop-blur-sm">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" />
            Active & Draft Drills
          </CardTitle>
          <CardDescription>Review all phishing campaign statuses, targeting matrices, and action items.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <span className="animate-spin inline-block h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full mr-2" />
              Syncing with database telemetry...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center text-slate-500 max-w-sm mx-auto">
              <Info size={36} className="mx-auto text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300">No campaigns deployed</p>
              <p className="text-xs text-slate-500 mt-1">Create a new campaign drill to seed your training metrics database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-500 font-semibold">
                    <th className="px-6 py-4 font-medium">Campaign Name</th>
                    <th className="px-6 py-4 font-medium">Theme</th>
                    <th className="px-6 py-4 font-medium">Target Department</th>
                    <th className="px-6 py-4 font-medium text-center">Targets</th>
                    <th className="px-6 py-4 font-medium text-center">Templates</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {campaigns.map((camp) => {
                    const deptName = departments.find(d => d.id === camp.department_id)?.name || 'Global (Organization)';
                    return (
                      <tr key={camp.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">
                          <div>
                            {camp.name}
                            {camp.scheduled_at && camp.status.toLowerCase() === 'scheduled' && (
                              <p className="text-[10px] font-normal text-slate-500 flex items-center gap-1 mt-0.5">
                                <Calendar size={10} />
                                {new Date(camp.scheduled_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700/60 text-slate-300">
                            {camp.theme}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-300">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Users size={12} className="text-blue-500/70" />
                            {deptName}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-200">
                          {camp.target_count}
                        </td>
                        <td className="px-6 py-4 text-center text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-blue-950/30 border border-blue-900/30 text-blue-400 font-semibold">
                            {camp.templates.length} Active
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(camp.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Draft Operations */}
                            {camp.status.toLowerCase() === 'draft' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => openSchedule(camp)} 
                                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 p-1.5"
                                  title="Schedule Campaign"
                                >
                                  <Calendar size={14} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => openEdit(camp)} 
                                  className="text-slate-300 hover:text-white hover:bg-slate-800 p-1.5"
                                  title="Edit Campaign"
                                >
                                  <Settings size={14} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleAction('delete', camp.id)} 
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </>
                            )}

                            {/* Running Operations */}
                            {camp.status.toLowerCase() === 'running' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleAction('pause', camp.id)} 
                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 p-1.5"
                                title="Pause Campaign"
                              >
                                <Pause size={14} />
                              </Button>
                            )}

                            {/* Paused Operations */}
                            {camp.status.toLowerCase() === 'paused' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleAction('resume', camp.id)} 
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 p-1.5"
                                title="Resume Campaign"
                              >
                                <Play size={14} />
                              </Button>
                            )}

                            {/* Clone is allowed for any status */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleAction('clone', camp.id)} 
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-1.5"
                              title="Clone Campaign"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Calendar Grid View */}
      <Card className="border border-slate-800 bg-slate-900/40 shadow-xl">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar size={18} className="text-cyan-400" />
            Weekly Deployment Schedule
          </CardTitle>
          <CardDescription>Monitor scheduled simulations mapped by day of the week.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {DAYS_OF_WEEK.map(day => {
              const dayCampaigns = campaignsByDay[day] || [];
              return (
                <div key={day} className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 min-h-[160px] flex flex-col">
                  <p className="text-xs font-bold text-slate-400 border-b border-slate-800 pb-2 mb-2 uppercase tracking-wider text-center">
                    {day.substring(0, 3)}
                  </p>
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {dayCampaigns.length === 0 ? (
                      <p className="text-[10px] text-slate-600 text-center py-6">Empty</p>
                    ) : (
                      dayCampaigns.map(camp => (
                        <div 
                          key={camp.id} 
                          className="p-2 rounded border border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-white space-y-1 hover:border-slate-700 transition-all cursor-pointer"
                          title={`${camp.name} (${camp.status})`}
                          onClick={() => openEdit(camp)}
                        >
                          <p className="truncate">{camp.name}</p>
                          <div className="flex justify-between items-center text-[9px] text-slate-400">
                            <span className="truncate">{camp.theme}</span>
                            <span className="text-[8px] font-bold text-cyan-400">
                              {camp.scheduled_at ? new Date(camp.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* NEW CAMPAIGN MODAL */}
      <Modal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        title="Deploy New Campaign Drill"
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="create-campaign-form" className="bg-blue-600 hover:bg-blue-500 font-semibold">
              Create Draft
            </Button>
          </div>
        }
      >
        <form id="create-campaign-form" onSubmit={handleCreateSubmit} className="space-y-4">
          <Input 
            label="Campaign Name" 
            placeholder="e.g. Q3 Urgent IT Ticket Harvest"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Threat Theme" 
              placeholder="e.g. IT Support, HR, Finance"
              value={formTheme}
              onChange={e => setFormTheme(e.target.value)}
              required
            />
            <Select 
              label="Simulation Difficulty"
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
                { value: 'expert', label: 'Expert' }
              ]}
              value={formDifficulty}
              onChange={e => setFormDifficulty(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Language" 
              placeholder="e.g. en, es, fr"
              value={formLanguage}
              onChange={e => setFormLanguage(e.target.value)}
              required
            />
            <Select 
              label="Target Department"
              options={[
                { value: '', label: 'Global (All Users)' },
                ...departments.map(d => ({ value: d.id.toString(), label: d.name }))
              ]}
              value={formDeptId}
              onChange={e => setFormDeptId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Approved Email Templates *
            </label>
            {templates.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                No approved templates found in sandbox. Go to AI generator, approve templates, then launch campaign.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {templates.map(t => {
                  const isChecked = formTemplateIds.includes(t.id);
                  return (
                    <label 
                      key={t.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-blue-500/50 bg-blue-500/5 text-white' 
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700/60'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleTemplateSelection(t.id)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500/20"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-200 truncate">{t.subject}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          Sender: {t.sender_name} ({t.sender_email})
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* EDIT CAMPAIGN MODAL */}
      <Modal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        title="Edit Draft Campaign Settings"
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="edit-campaign-form" className="bg-blue-600 hover:bg-blue-500 font-semibold">
              Save Changes
            </Button>
          </div>
        }
      >
        <form id="edit-campaign-form" onSubmit={handleEditSubmit} className="space-y-4">
          <Input 
            label="Campaign Name" 
            value={formName}
            onChange={e => setFormName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Threat Theme" 
              value={formTheme}
              onChange={e => setFormTheme(e.target.value)}
              required
            />
            <Select 
              label="Simulation Difficulty"
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
                { value: 'expert', label: 'Expert' }
              ]}
              value={formDifficulty}
              onChange={e => setFormDifficulty(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Language" 
              value={formLanguage}
              onChange={e => setFormLanguage(e.target.value)}
              required
            />
            <Select 
              label="Target Department"
              options={[
                { value: '', label: 'Global (All Users)' },
                ...departments.map(d => ({ value: d.id.toString(), label: d.name }))
              ]}
              value={formDeptId}
              onChange={e => setFormDeptId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Approved Email Templates *
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {templates.map(t => {
                const isChecked = formTemplateIds.includes(t.id);
                return (
                  <label 
                    key={t.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      isChecked 
                        ? 'border-blue-500/50 bg-blue-500/5 text-white' 
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700/60'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleTemplateSelection(t.id)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500/20"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-200 truncate">{t.subject}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        Sender: {t.sender_name} ({t.sender_email})
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* SCHEDULE CAMPAIGN MODAL */}
      <Modal 
        isOpen={isScheduleOpen} 
        onClose={() => setIsScheduleOpen(false)} 
        title="Schedule Simulation Campaign Deployment"
        size="md"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="schedule-campaign-form" className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">
              Confirm Schedule
            </Button>
          </div>
        }
      >
        <form id="schedule-campaign-form" onSubmit={handleScheduleSubmit} className="space-y-4">
          <div className="p-3 bg-cyan-950/30 border border-cyan-800/30 rounded-lg text-xs text-cyan-300 flex items-start gap-3">
            <Clock className="shrink-0 text-cyan-400 mt-0.5" size={16} />
            <p>
              Scheduling moves the campaign from <strong>DRAFT</strong> to <strong>SCHEDULED</strong>. 
              The automated daemon will deploy the simulator to all targets in the target department at the scheduled time.
            </p>
          </div>
          <Input 
            label="Schedule Start Date & Time" 
            type="datetime-local"
            value={formScheduledAt}
            onChange={e => setFormScheduledAt(e.target.value)}
            required
          />
        </form>
      </Modal>
    </div>
  );
}
