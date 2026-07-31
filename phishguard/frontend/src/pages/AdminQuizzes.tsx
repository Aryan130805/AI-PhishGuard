import React, { useEffect, useState } from 'react';
import { 
  HelpCircle, Shield, CheckCircle, Users, Award, TrendingUp, Plus, 
  Search, Filter, Lock, Globe, AlertTriangle, RefreshCw, Clock, Upload 
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

interface EmployeeQuizPerf {
  id: number;
  name: string;
  email: string;
  department: string;
  attempted_count: number;
  passed_count: number;
  avg_score: number;
  status: string;
}

interface PublishedQuiz {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  summary: string;
  time_estimate: string;
  pass_score: number;
  is_public: boolean;
}

export default function AdminQuizzes() {
  const { addToast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    organization_name: 'Organization',
    total_employees: 0,
    total_attempts: 0,
    avg_pass_rate: 0,
    avg_score: 0
  });

  const [employees, setEmployees] = useState<EmployeeQuizPerf[]>([]);
  const [quizzes, setQuizzes] = useState<PublishedQuiz[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Quiz Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizCategory, setQuizCategory] = useState('Phishing Attacks');
  const [quizDifficulty, setQuizDifficulty] = useState('Beginner');
  const [quizSummary, setQuizSummary] = useState('');
  const [quizTime, setQuizTime] = useState('5 mins');
  const [quizPassScore, setQuizPassScore] = useState(75);
  const [quizIsPublic, setQuizIsPublic] = useState(true);

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
      let orgId: number | null = null;
      let orgName = 'Organization';
      if (user?.email) {
        const { data: userRow } = await supabase
          .from('users')
          .select('organization_id, organizations(name)')
          .eq('email', user.email)
          .maybeSingle();
        orgId = userRow?.organization_id ?? null;
        orgName = (userRow?.organizations as any)?.name ?? orgName;
      }

      // Fetch quizzes visible to this org
      let quizQuery = supabase
        .from('quizzes')
        .select('id, title, category, difficulty, summary, time_estimate, pass_score, is_public, organization_id')
        .order('id', { ascending: false })
        .limit(50);
      if (orgId) {
        quizQuery = quizQuery.or(`is_public.eq.true,organization_id.eq.${orgId}`);
      } else {
        quizQuery = quizQuery.eq('is_public', true);
      }
      const { data: quizRows } = await quizQuery;

      // Fetch employees in org
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

      // Fetch quiz attempts
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('user_id, score, passed');

      const totalEmployees = empRows.length;
      const totalAttempts = (attempts || []).length;
      const passedAttempts = (attempts || []).filter(a => a.passed).length;
      const avgPassRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
      const avgScore = totalAttempts > 0
        ? Math.round((attempts || []).reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts)
        : 0;

      setStats({
        organization_name: orgName,
        total_employees: totalEmployees,
        total_attempts: totalAttempts,
        avg_pass_rate: avgPassRate,
        avg_score: avgScore
      });

      const empPerf = empRows.map(e => {
        const myAttempts = (attempts || []).filter(a => a.user_id === e.id);
        const passed = myAttempts.filter(a => a.passed).length;
        const myAvgScore = myAttempts.length > 0
          ? Math.round(myAttempts.reduce((s, a) => s + (a.score || 0), 0) / myAttempts.length)
          : 0;
        return {
          id: e.id,
          name: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.email?.split('@')[0] || 'Employee',
          email: e.email || '',
          department: (e.departments as any)?.name || 'General',
          attempted_count: myAttempts.length,
          passed_count: passed,
          avg_score: myAvgScore,
          status: passed > 0 ? 'Passed' : myAttempts.length > 0 ? 'Attempted' : 'Not Started'
        };
      });
      setEmployees(empPerf);

      setQuizzes((quizRows || []).map(q => ({
        id: q.id,
        title: q.title || 'Untitled Quiz',
        category: q.category || 'Phishing Attacks',
        difficulty: q.difficulty || 'Beginner',
        summary: q.summary || '',
        time_estimate: q.time_estimate || '5 mins',
        pass_score: q.pass_score || 75,
        is_public: q.is_public ?? true
      })));
    } catch (err) {
      console.error('Failed to load quiz stats from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle || !quizSummary) {
      addToast({ title: 'Missing Info', description: 'Please fill out quiz title and summary.', type: 'error' });
      return;
    }

    try {
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
        title: quizTitle,
        category: quizCategory,
        difficulty: quizDifficulty,
        summary: quizSummary,
        time_estimate: quizTime,
        pass_score: quizPassScore,
        is_public: quizIsPublic,
        questions: [
          {
            id: 1,
            question: `What is the primary key defense regarding ${quizTitle}?`,
            options: [
              "Always verify via multi-factor authentication and report suspicious anomalies to IT Security.",
              "Bypass security warnings and input credentials directly.",
              "Share login passwords with unverified third parties.",
              "Disable endpoint protection."
            ],
            correct_index: 0,
            explanation: "Multi-factor verification and prompt reporting prevent security breaches."
          },
          {
            id: 2,
            question: `Which indicator suggests a threat in ${quizCategory}?`,
            options: [
              "Urgent pressure tactics demanding immediate credential validation",
              "Verified company domain SSL certificate",
              "Official IT department signature",
              "Standard secondary channel verification"
            ],
            correct_index: 0,
            explanation: "Urgency and pressure tactics are common indicators of social engineering."
          }
        ]
      };
      if (!quizIsPublic && orgId) {
        insertPayload.organization_id = orgId;
      }

      const { error } = await supabase
        .from('quizzes')
        .insert(insertPayload);

      if (error) {
        console.error('Supabase quiz insert error:', error);

        // If schema hasn't been migrated yet, fall back to base columns only
        if (error.message?.includes('schema cache') || error.message?.includes('column')) {
          // Need a lesson_id — create a stub lesson first (original schema only has topic/title/content)
          const { data: stubLesson } = await supabase
            .from('lessons')
            .insert({ topic: quizCategory.toLowerCase().replace(/ /g, '_'), title: quizTitle, content: quizSummary || quizTitle, ai_generated: false })
            .select('id')
            .single();

          const { error: fallbackError } = await supabase
            .from('quizzes')
            .insert({
              lesson_id: stubLesson?.id ?? 1,
              questions: insertPayload.questions,
            });

          if (!fallbackError) {
            addToast({
              title: 'Quiz Published (Basic)',
              description: `Quiz "${quizTitle}" saved. ⚠️ Run the DB migration SQL (supabase_lessons_quizzes_upgrade.sql) to enable full features.`,
              type: 'warning'
            });
            setShowCreateModal(false);
            setQuizTitle(''); setQuizSummary('');
            fetchStats();
            return;
          }
        }

        addToast({
          title: 'Publish Error',
          description: error.message?.includes('schema cache') || error.message?.includes('column')
            ? '⚠️ Database not migrated. Open Supabase SQL Editor and run supabase_lessons_quizzes_upgrade.sql from the backend folder.'
            : (error.message || 'Could not create quiz module.'),
          type: 'error'
        });
        return;
      }

      addToast({
        title: 'Quiz Published!',
        description: `Successfully published ${quizIsPublic ? 'Public' : 'Organization Private'} Quiz "${quizTitle}" to Supabase.`,
        type: 'success'
      });
      setShowCreateModal(false);
      setQuizTitle('');
      setQuizSummary('');
      fetchStats();
    } catch (err: any) {
      console.error('Quiz creation failed:', err);
      addToast({ title: 'Error', description: err?.message || 'Unexpected error creating quiz.', type: 'error' });
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
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
            <HelpCircle size={16} />
            <span>ORGANIZATION QUIZ & ASSESSMENT CENTER</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{stats.organization_name} Quiz Management</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor employee quiz compliance, pass rates, and publish public or organization-private assessment modules.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 shrink-0"
        >
          <Plus size={16} /> Add Quiz Module
        </Button>
      </div>

      {/* ── KPI Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.total_employees}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Total Employees</div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
            <HelpCircle size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.total_attempts}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Quizzes Attempted</div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.avg_pass_rate}%</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Organization Pass Rate</div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-800 bg-slate-900/60 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Award size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{stats.avg_score}%</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Average Score</div>
          </div>
        </Card>
      </div>

      {/* ── SECTION 1: EMPLOYEE QUIZ PERFORMANCE TABLE ── */}
      <Card className="border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white">Employee Quiz Performance & Compliance</h2>
            <p className="text-xs text-slate-400 mt-1">Detailed scores and compliance breakdown by employee.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search employee or dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4">Department</th>
                <th className="p-4 text-center">Attempted</th>
                <th className="p-4 text-center">Passed</th>
                <th className="p-4 text-center">Avg Score %</th>
                <th className="p-4 text-center">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">Loading organization quiz performance...</td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">No employee records found.</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-white">
                      <div>{emp.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{emp.email}</div>
                    </td>
                    <td className="p-4 text-slate-400 font-semibold">{emp.department}</td>
                    <td className="p-4 text-center font-bold text-white">{emp.attempted_count}</td>
                    <td className="p-4 text-center font-bold text-emerald-400">{emp.passed_count}</td>
                    <td className="p-4 text-center font-bold text-white">{emp.avg_score}%</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        emp.status === 'Compliant'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : emp.status === 'In Progress'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
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

      {/* ── SECTION 2: PUBLISHED QUIZ MODULES ── */}
      <Card className="border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white">Organization Quiz Curriculum</h2>
            <p className="text-xs text-slate-400 mt-1">Available assessment quiz modules for your organization employees.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="border border-slate-800 bg-slate-950/60 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  {quiz.category}
                </span>

                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded border flex items-center gap-1 ${
                  quiz.is_public 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                }`}>
                  {quiz.is_public ? <Globe size={10} /> : <Lock size={10} />}
                  {quiz.is_public ? 'Public' : 'Private (Org)'}
                </span>
              </div>

              <h3 className="text-sm font-extrabold text-white leading-snug">{quiz.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{quiz.summary}</p>
            </Card>
          ))}
        </div>
      </Card>

      {/* ── CREATE QUIZ MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white">Create Custom Quiz Module</h2>
                <p className="text-xs text-slate-400 mt-1">Publish assessment quizzes for employees.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="border-slate-800 text-slate-400 hover:text-white text-xs px-3 py-1.5"
              >
                Cancel
              </Button>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                <Upload size={16} />
                <span>Import Quiz File (.xml, .md, .doc, .json, .html, .txt):</span>
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
                        if (parsed.title) setQuizTitle(parsed.title);
                        if (parsed.category) setQuizCategory(parsed.category);
                        if (parsed.difficulty) setQuizDifficulty(parsed.difficulty);
                        if (parsed.summary) setQuizSummary(parsed.summary);
                        if (parsed.time_estimate) setQuizTime(parsed.time_estimate);
                        if (typeof parsed.pass_score === 'number') setQuizPassScore(parsed.pass_score);
                        if (typeof parsed.is_public === 'boolean') setQuizIsPublic(parsed.is_public);
                        addToast({ title: 'Quiz Imported', description: `Parsed "${fileName}" successfully!`, type: 'success' });
                      } catch {
                        addToast({ title: 'Import Error', description: 'Invalid JSON file format.', type: 'error' });
                      }
                    } else if (ext === '.xml') {
                      try {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(text, 'text/xml');
                        const title = xmlDoc.getElementsByTagName('title')[0]?.textContent;
                        const category = xmlDoc.getElementsByTagName('category')[0]?.textContent;
                        const difficulty = xmlDoc.getElementsByTagName('difficulty')[0]?.textContent;
                        const summary = xmlDoc.getElementsByTagName('summary')[0]?.textContent;
                        const timeEst = xmlDoc.getElementsByTagName('time_estimate')[0]?.textContent;

                        if (title) setQuizTitle(title);
                        if (category) setQuizCategory(category);
                        if (difficulty) setQuizDifficulty(difficulty);
                        if (summary) setQuizSummary(summary);
                        if (timeEst) setQuizTime(timeEst);
                        addToast({ title: 'XML Quiz Imported', description: `Parsed XML "${fileName}" successfully!`, type: 'success' });
                      } catch {
                        addToast({ title: 'Import Error', description: 'Invalid XML format.', type: 'error' });
                      }
                    } else if (ext === '.md') {
                      const titleMatch = text.match(/^#\s+(.*)/m);
                      if (titleMatch && titleMatch[1]) setQuizTitle(titleMatch[1]);
                      setQuizSummary(text);
                      addToast({ title: 'Markdown Quiz Imported', description: `Parsed Markdown "${fileName}".`, type: 'success' });
                    } else if (ext === '.html' || ext === '.htm') {
                      const titleMatch = text.match(/<h[12]>(.*?)<\/h[12]>/i) || text.match(/<title>(.*?)<\/title>/i);
                      if (titleMatch && titleMatch[1]) setQuizTitle(titleMatch[1].replace(/<[^>]+>/g, ''));
                      setQuizSummary(text.replace(/<[^>]+>/g, ' '));
                      addToast({ title: 'HTML Document Loaded', description: `Parsed HTML quiz info from "${fileName}".`, type: 'success' });
                    } else {
                      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                      if (lines.length > 0 && !quizTitle) {
                        setQuizTitle(lines[0].replace(/^[^a-zA-Z0-9]+/, ''));
                      }
                      setQuizSummary(text);
                      addToast({ title: 'Document Loaded', description: `Loaded text content from "${fileName}".`, type: 'success' });
                    }
                  };
                  reader.readAsText(file);
                }}
                className="text-xs text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-extrabold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
              />
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Quiz Title</label>
                <input
                  type="text"
                  placeholder="e.g. Quishing & QR Code Security Verification"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300">Category</label>
                  <select
                    value={quizCategory}
                    onChange={(e) => setQuizCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300">Difficulty Tier</label>
                  <select
                    value={quizDifficulty}
                    onChange={(e) => setQuizDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
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
                    quizIsPublic 
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="quizScope"
                      checked={quizIsPublic}
                      onChange={() => setQuizIsPublic(true)}
                      className="hidden"
                    />
                    <span>🌐 Public (Visible to ALL employees across all organizations)</span>
                  </label>

                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    !quizIsPublic 
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' 
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="quizScope"
                      checked={!quizIsPublic}
                      onChange={() => setQuizIsPublic(false)}
                      className="hidden"
                    />
                    <span>🔒 Private (Visible ONLY to your organization employees)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Summary & Objectives</label>
                <textarea
                  rows={3}
                  placeholder="Summary of assessment topics covered..."
                  value={quizSummary}
                  onChange={(e) => setQuizSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-emerald-600/20"
              >
                Publish Quiz Module
              </Button>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
