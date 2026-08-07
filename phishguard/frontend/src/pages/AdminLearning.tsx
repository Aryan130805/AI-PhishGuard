import React, { useEffect, useState } from 'react';
import { 
  GraduationCap, BookOpen, CheckCircle, Users, Award, TrendingUp, Plus, 
  Search, Shield, Filter, Lock, Globe, AlertCircle, RefreshCw, Upload, Trash2 
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { useAuth } from '../AuthContext';

interface EmployeePerf {
  id: number;
  name: string;
  email: string;
  department: string;
  assigned_count: number;
  completed_count: number;
  completion_rate: number;
  status: string;
}

interface PublishedLesson {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  summary: string;
  is_public: boolean;
  published_date: string;
}

export default function AdminLearning() {
  const { addToast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    organization_name: 'Organization',
    total_employees: 0,
    total_completed: 0,
    completion_rate: 0,
    active_learners: 0
  });

  const [employees, setEmployees] = useState<EmployeePerf[]>([]);
  const [lessons, setLessons] = useState<PublishedLesson[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Module Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Phishing Attacks');
  const [newDifficulty, setNewDifficulty] = useState('Beginner');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const categories = [
    'Phishing Attacks',
    'Malware & Ransomware',
    'Password & Authentication Security',
    'Social Engineering',
    'Network Security',
    'Cloud Security',
    'AI & Modern Cyber Threats',
    'Mobile Security',
    'Workplace Security'
  ];

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch org name from the logged-in user's profile
      let orgName = 'Organization';
      let orgId: number | null = null;
      if (user) {
        const { data: userRow } = await supabase
          .from('users')
          .select('organization_id, organizations(name)')
          .eq('email', user.email)
          .maybeSingle();
        if (userRow) {
          orgId = userRow.organization_id ?? null;
          orgName = (userRow.organizations as any)?.name ?? orgName;
        }
      }

      // Fetch lessons visible to this org (public OR org-specific)
      let lessonQuery = supabase
        .from('lessons')
        .select('id, title, category, difficulty, summary, is_public, published_date, organization_id')
        .order('id', { ascending: false })
        .limit(50);
      if (orgId) {
        lessonQuery = lessonQuery.or(`is_public.eq.true,organization_id.eq.${orgId}`);
      } else {
        lessonQuery = lessonQuery.eq('is_public', true);
      }
      const { data: lessonRows } = await lessonQuery;

      // Fetch employees in this org
      let empRows: any[] = [];
      if (orgId) {
        const { data: empData } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, departments(name)')
          .eq('organization_id', orgId)
          .eq('is_admin', false)
          .limit(100);
        empRows = empData || [];
      }

      // Fetch lesson assignments for completion stats
      const { data: assignments } = await supabase
        .from('lesson_assignments')
        .select('user_id, completed_at');

      const totalEmployees = empRows.length;
      const completedSet = new Set((assignments || []).filter(a => a.completed_at).map(a => a.user_id));
      const totalCompleted = completedSet.size;

      setStats({
        organization_name: orgName,
        total_employees: totalEmployees,
        total_completed: totalCompleted,
        completion_rate: totalEmployees > 0 ? Math.round((totalCompleted / totalEmployees) * 100) : 0,
        active_learners: totalCompleted
      });

      // Map employees into perf objects
      const empPerf = empRows.map(e => {
        const myAssignments = (assignments || []).filter(a => a.user_id === e.id);
        const completed = myAssignments.filter(a => a.completed_at).length;
        const total = myAssignments.length;
        return {
          id: e.id,
          name: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.email?.split('@')[0] || 'Employee',
          email: e.email || '',
          department: (e.departments as any)?.name || 'General',
          assigned_count: total,
          completed_count: completed,
          completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
          status: completed === total && total > 0 ? 'Completed' : completed > 0 ? 'In Progress' : 'Not Started'
        };
      });
      setEmployees(empPerf);

      setLessons((lessonRows || []).map(l => {
        const title = (l.title || '').toLowerCase();
        const cat = l.category;
        let inferredCat = cat;
        if (!cat || cat === 'Phishing Attacks' || cat === 'General Security') {
          if (title.includes('ransomware') || title.includes('malware')) inferredCat = 'Malware & Ransomware';
          else if (title.includes('password') || title.includes('2fa') || title.includes('mfa') || title.includes('passkey')) inferredCat = 'Password & Authentication Security';
          else if (title.includes('social') || title.includes('pretext') || title.includes('impersonation')) inferredCat = 'Social Engineering';
          else if (title.includes('network') || title.includes('wi-fi') || title.includes('vpn')) inferredCat = 'Network Security';
          else if (title.includes('cloud') || title.includes('saas') || title.includes('iam')) inferredCat = 'Cloud Security';
          else if (title.includes('ai') || title.includes('deepfake') || title.includes('prompt')) inferredCat = 'AI & Modern Cyber Threats';
          else if (title.includes('mobile') || title.includes('smishing') || title.includes('apk')) inferredCat = 'Mobile Security';
          else if (title.includes('workplace') || title.includes('clean desk') || title.includes('usb')) inferredCat = 'Workplace Security';
          else if (title.includes('phish') || title.includes('quish')) inferredCat = 'Phishing Attacks';
        }
        return {
          id: l.id,
          title: l.title,
          category: inferredCat || 'General Security',
          difficulty: l.difficulty || 'Beginner',
          summary: l.summary || '',
          is_public: l.is_public ?? true,
          published_date: l.published_date || new Date().toISOString().split('T')[0]
        };
      }));
    } catch (err) {
      console.error('Failed to load learning stats from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const handleDeleteLesson = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to remove the learning module "${title}"?`)) return;

    try {
      // Delete from Supabase
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) console.error('Supabase lesson delete warning:', error);

      // Also call backend API delete
      try {
        await apiFetch(`/training/lessons/${id}`, { method: 'DELETE' });
      } catch {
        // Backend optional
      }

      addToast({
        title: 'Module Removed',
        description: `Successfully removed learning module "${title}".`,
        type: 'success'
      });
      fetchStats();
    } catch (err: any) {
      console.error('Delete lesson error:', err);
      addToast({
        title: 'Remove Error',
        description: err?.message || 'Could not remove learning module.',
        type: 'error'
      });
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) {
      addToast({ title: 'Missing Info', description: 'Please fill out lesson title and content.', type: 'error' });
      return;
    }

    try {
      // Resolve organization_id for the current user
      let orgId: number | null = null;
      if (user?.email) {
        const { data: userRow } = await supabase
          .from('users')
          .select('organization_id')
          .eq('email', user.email)
          .maybeSingle();
        orgId = userRow?.organization_id ?? null;
      }

      const insertPayload: any = {
        topic: newCategory.toLowerCase().replace(/ /g, '_'),
        title: newTitle,
        content: newContent,
        category: newCategory,
        difficulty: newDifficulty,
        summary: newSummary || '',
        is_public: isPublic,
        published_date: new Date().toISOString().split('T')[0],
        ai_generated: false,
      };
      if (!isPublic && orgId) {
        insertPayload.organization_id = orgId;
      }

      const { data: inserted, error } = await supabase
        .from('lessons')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error('Supabase lesson insert error:', error);

        // If schema hasn't been migrated yet, fall back to base columns only
        if (error.message?.includes('schema cache') || error.message?.includes('column')) {
          // Retry with only the original base columns
          const { data: fallbackInserted, error: fallbackError } = await supabase
            .from('lessons')
            .insert({
              topic: newCategory.toLowerCase().replace(/ /g, '_'),
              title: newTitle,
              content: newContent,
              ai_generated: false,
            })
            .select()
            .single();

          if (!fallbackError && fallbackInserted?.id) {
            // Also link a quiz with the minimal quizzes schema
            await supabase.from('quizzes').insert({
              lesson_id: fallbackInserted.id,
              questions: [
                {
                  id: 1,
                  question: `What is the primary key defense regarding ${newTitle}?`,
                  options: [
                    "Always verify via multi-factor authentication and report suspicious anomalies to IT Security.",
                    "Bypass security warnings and input credentials directly.",
                    "Share login passwords with unverified third parties.",
                    "Disable endpoint protection."
                  ],
                  correct_index: 0
                }
              ]
            });
            addToast({
              title: 'Module Published (Basic)',
              description: `Lesson "${newTitle}" saved. ⚠️ Run the DB migration SQL to enable full category/difficulty features.`,
              type: 'warning'
            });
            setShowCreateModal(false);
            setNewTitle(''); setNewSummary(''); setNewContent('');
            fetchStats();
            return;
          }
        }

        addToast({
          title: 'Publish Error',
          description: error.message?.includes('schema cache') || error.message?.includes('column')
            ? '⚠️ Database not migrated. Open Supabase SQL Editor and run supabase_lessons_quizzes_upgrade.sql from the backend folder.'
            : (error.message || 'Could not publish custom lesson.'),
          type: 'error'
        });
        return;
      }

      // Also insert a default quiz linked to this lesson
      if (inserted?.id) {
        await supabase.from('quizzes').insert({
          lesson_id: inserted.id,
          questions: [
            {
              id: 1,
              question: `What is the primary key defense regarding ${newTitle}?`,
              options: [
                "Always verify via multi-factor authentication and report suspicious anomalies to IT Security.",
                "Bypass security warnings and input credentials directly.",
                "Share login passwords with unverified third parties.",
                "Disable endpoint protection."
              ],
              correct_index: 0,
              explanation: "MFA and immediate reporting are critical security habits."
            }
          ]
        });
      }

      addToast({
        title: 'Module Published!',
        description: `Successfully published ${isPublic ? 'Public' : 'Organization Private'} lesson "${newTitle}" to Supabase.`,
        type: 'success'
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewSummary('');
      setNewContent('');
      fetchStats();
    } catch (err: any) {
      console.error('Lesson creation failed:', err);
      addToast({ title: 'Error', description: err?.message || 'Unexpected error publishing lesson.', type: 'error' });
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1">
            <GraduationCap size={16} />
            <span>ORGANIZATION LEARNING MANAGEMENT</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{stats.organization_name} Learning Portal</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track employee course completions, performance metrics, and publish public or organization-private security modules.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-600/20 shrink-0"
        >
          <Plus size={16} /> Add Learning Module
        </Button>
      </div>

      {/* ── KPI Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.total_employees}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Total Employees</div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.total_completed}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Courses Completed</div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.completion_rate}%</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Avg Completion Rate</div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Award size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.active_learners}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Active Learners</div>
          </div>
        </Card>
      </div>

      {/* ── SECTION 1: EMPLOYEE COURSE PERFORMANCE TABLE ── */}
      <Card className="border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white">Employee Course Completion & Performance</h2>
            <p className="text-xs text-slate-400 mt-1">Real-time training progress across organization employees.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search employee or dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4">Department</th>
                <th className="p-4 text-center">Assigned Courses</th>
                <th className="p-4 text-center">Completed Courses</th>
                <th className="p-4 text-center">Progress %</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">Loading organization employee progress...</td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">No employees found in this organization.</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-white">
                      <div>{emp.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{emp.email}</div>
                    </td>
                    <td className="p-4 text-slate-400 font-semibold">{emp.department}</td>
                    <td className="p-4 text-center font-bold text-white">{emp.assigned_count}</td>
                    <td className="p-4 text-center font-bold text-emerald-400">{emp.completed_count}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-500 h-1.5 transition-all duration-300" style={{ width: `${emp.completion_rate}%` }} />
                        </div>
                        <span className="font-bold text-white text-[11px]">{emp.completion_rate}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        emp.completed_count > 0 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── SECTION 2: PUBLISHED ORGANIZATION MODULES ── */}
      <Card className="border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white">Organization Learning Curriculum</h2>
            <p className="text-xs text-slate-400 mt-1">Available learning modules for your organization employees.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="border border-slate-800 bg-slate-950/60 p-5 space-y-3 relative group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                  {lesson.category}
                </span>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded border flex items-center gap-1 ${
                    lesson.is_public 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>
                    {lesson.is_public ? <Globe size={10} /> : <Lock size={10} />}
                    {lesson.is_public ? 'Public' : 'Private (Org)'}
                  </span>

                  <button
                    onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                    title="Remove Learning Module"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-extrabold text-white leading-snug">{lesson.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{lesson.summary}</p>
            </Card>
          ))}
        </div>
      </Card>

      {/* ── CREATE MODULE MODAL ── */}
      {showCreateModal && (
        <div data-active-modal="true" className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white">Create Custom Security Module</h2>
                <p className="text-xs text-slate-400 mt-1">Publish new learning content for employees.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="border-slate-800 text-slate-400 hover:text-white text-xs px-3 py-1.5"
              >
                Cancel
              </Button>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-blue-300 font-semibold">
                <Upload size={16} />
                <span>Import File (.xml, .md, .doc, .json, .html, .txt):</span>
              </div>
              <input
                type="file"
                accept=".xml,.md,.doc,.docx,.json,.html,.htm,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = (event.target?.result as string) || '';
                    const fileName = file.name;
                    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

                    if (ext === '.json') {
                      try {
                        const parsed = JSON.parse(text);
                        if (parsed.title) setNewTitle(parsed.title);
                        if (parsed.category) setNewCategory(parsed.category);
                        if (parsed.difficulty) setNewDifficulty(parsed.difficulty);
                        if (parsed.summary) setNewSummary(parsed.summary);
                        if (parsed.content) setNewContent(parsed.content);
                        if (typeof parsed.is_public === 'boolean') setIsPublic(parsed.is_public);
                        addToast({ title: 'JSON Module Imported', description: `Parsed "${fileName}" successfully!`, type: 'success' });
                      } catch {
                        addToast({ title: 'Import Error', description: 'Invalid JSON file structure.', type: 'error' });
                      }
                    } else if (ext === '.xml') {
                      try {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(text, 'text/xml');
                        const title = xmlDoc.getElementsByTagName('title')[0]?.textContent;
                        const category = xmlDoc.getElementsByTagName('category')[0]?.textContent;
                        const difficulty = xmlDoc.getElementsByTagName('difficulty')[0]?.textContent;
                        const summary = xmlDoc.getElementsByTagName('summary')[0]?.textContent;
                        const content = xmlDoc.getElementsByTagName('content')[0]?.textContent || xmlDoc.getElementsByTagName('text')[0]?.textContent;

                        if (title) setNewTitle(title);
                        if (category) setNewCategory(category);
                        if (difficulty) setNewDifficulty(difficulty);
                        if (summary) setNewSummary(summary);
                        if (content) setNewContent(content);
                        addToast({ title: 'XML Module Imported', description: `Parsed XML "${fileName}" successfully!`, type: 'success' });
                      } catch {
                        addToast({ title: 'Import Error', description: 'Invalid XML format.', type: 'error' });
                      }
                    } else if (ext === '.md') {
                      let htmlContent = text
                        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                        .replace(/^\* (.*$)/gim, '<li>$1</li>')
                        .replace(/^- (.*$)/gim, '<li>$1</li>')
                        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                        .replace(/\n/g, '<br />');

                      const titleMatch = text.match(/^#\s+(.*)/m);
                      if (titleMatch && titleMatch[1]) setNewTitle(titleMatch[1]);
                      setNewContent(htmlContent);
                      addToast({ title: 'Markdown Imported', description: `Parsed Markdown "${fileName}".`, type: 'success' });
                    } else if (ext === '.html' || ext === '.htm') {
                      const titleMatch = text.match(/<h[12]>(.*?)<\/h[12]>/i) || text.match(/<title>(.*?)<\/title>/i);
                      if (titleMatch && titleMatch[1]) setNewTitle(titleMatch[1].replace(/<[^>]+>/g, ''));
                      setNewContent(text);
                      addToast({ title: 'HTML Document Loaded', description: `Loaded HTML lesson from "${fileName}".`, type: 'success' });
                    } else {
                      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                      if (lines.length > 0) {
                        if (!newTitle) setNewTitle(lines[0].replace(/^[^a-zA-Z0-9]+/, ''));
                        if (lines.length > 1 && !newSummary) setNewSummary(lines[1]);
                      }
                      setNewContent(text.replace(/\n/g, '<br />'));
                      addToast({ title: 'Document Imported', description: `Loaded text content from "${fileName}".`, type: 'success' });
                    }
                  };
                  reader.readAsText(file);
                }}
                className="text-xs text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-extrabold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
            </div>

            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Lesson Title</label>
                <input
                  type="text"
                  placeholder="e.g. Quishing & Mobile QR Code Security"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-blue-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300">Difficulty Tier</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>

              {/* Visibility Scope */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Audience Visibility Scope</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    isPublic 
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="scope"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                      className="hidden"
                    />
                    <span>🌐 Public (Visible to ALL employees across all organizations)</span>
                  </label>

                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    !isPublic 
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' 
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="scope"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                      className="hidden"
                    />
                    <span>🔒 Private (Visible ONLY to your organization employees)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Summary</label>
                <input
                  type="text"
                  placeholder="Key takeaway summary..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">HTML Content</label>
                <textarea
                  rows={5}
                  placeholder="<h3>Module Overview</h3><p>Enter lesson text...</p>"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white mt-1 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-blue-600/20"
              >
                Publish Learning Module
              </Button>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
