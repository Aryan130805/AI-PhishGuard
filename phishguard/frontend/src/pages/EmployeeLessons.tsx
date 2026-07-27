import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  BookOpen, CheckCircle, ArrowRight, BookOpenCheck, HelpCircle, Shield, 
  Sparkles, Flame, Award, AlertTriangle, Search, Plus, Edit3, Trash2, 
  Zap, Lock, Smartphone, Wifi, Cloud, Bot, Eye, KeyRound, AlertCircle, Play, UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';
import { useAuth } from '../AuthContext';

interface LessonItem {
  id: number;
  topic: string;
  title: string;
  category: string;
  difficulty: string;
  summary: string;
  is_emerging_threat: boolean;
  cve_id: string | null;
  assigned_at: string;
  completed_at: string | null;
  completed: boolean;
}

interface LessonDetail {
  id: number;
  topic: string;
  title: string;
  category: string;
  difficulty: string;
  summary: string;
  content: string;
  completed: boolean;
  quiz: {
    id: number | null;
    questions: any[];
  };
}

interface AdaptiveProfile {
  knowledge_level: string;
  completion_percentage: number;
  completed_count: number;
  total_assigned: number;
  streak_days: number;
  category_stats: Record<string, { total: number; completed: number }>;
  recommended_lessons: {
    id: number;
    title: string;
    category: string;
    difficulty: string;
    summary: string;
  }[];
}

interface EmergingThreat {
  id: number;
  cve_id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  category: string;
  published_date: string;
  summary: string;
  lesson_id: number | null;
  mitigation: string;
}

export default function EmployeeLessons() {
  const { addToast } = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'modules' | 'threats' | 'admin'>('modules');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonDetail | null>(null);
  const [adaptiveProfile, setAdaptiveProfile] = useState<AdaptiveProfile | null>(null);
  const [emergingThreats, setEmergingThreats] = useState<EmergingThreat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Interactive Email Inspector State
  const [emailInspected, setEmailInspected] = useState(false);
  const [emailFlagged, setEmailFlagged] = useState<string | null>(null);

  // Interactive Password Tester State
  const [testPassword, setTestPassword] = useState('');
  
  // Admin Create Module State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Phishing Attacks');
  const [newDifficulty, setNewDifficulty] = useState('Beginner');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');

  const isAdmin = user?.role === 'admin';

  const categories = [
    'All',
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

  useEffect(() => {
    fetchLessons();
    fetchAdaptiveProfile();
    fetchEmergingThreats();
  }, [selectedCategory, selectedDifficulty]);

  const fetchLessons = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedDifficulty && selectedDifficulty !== 'All') params.append('difficulty', selectedDifficulty);

      const queryString = params.toString();
      const url = `/training/lessons${queryString ? `?${queryString}` : ''}`;

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setLessons(data);
        if (data.length > 0 && (!selectedLesson || !data.some((d: any) => d.id === selectedLesson.id))) {
          handleSelectLesson(data[0].id);
        }
      }
    } catch (e) {
      addToast({ title: 'Network Error', description: 'Could not fetch training list.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdaptiveProfile = async () => {
    try {
      const res = await apiFetch('/training/adaptive-profile');
      if (res.ok) {
        const data = await res.json();
        setAdaptiveProfile(data);
      }
    } catch (e) {
      console.error("Failed to fetch adaptive profile", e);
    }
  };

  const fetchEmergingThreats = async () => {
    try {
      const res = await apiFetch('/training/emerging-threats');
      if (res.ok) {
        const data = await res.json();
        setEmergingThreats(data);
      }
    } catch (e) {
      console.error("Failed to fetch emerging threats", e);
    }
  };

  const handleSelectLesson = async (lessonId: number) => {
    try {
      const res = await apiFetch(`/training/lessons/${lessonId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLesson(data);
      }
    } catch (e) {
      addToast({ title: 'Network Error', description: 'Could not load lesson content.', type: 'error' });
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) {
      addToast({ title: 'Missing Information', description: 'Please provide lesson title and content.', type: 'error' });
      return;
    }

    try {
      const res = await apiFetch('/training/lessons', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          topic: newCategory.toLowerCase().replace(/ /g, '_'),
          category: newCategory,
          difficulty: newDifficulty,
          summary: newSummary,
          content: newContent,
          quiz: [
            {
              question: `What is the primary key defense regarding ${newTitle}?`,
              options: [
                "Always verify via secondary channel and report anomalies to IT Security",
                "Ignore warnings and click links directly",
                "Share credentials with unverified external contacts",
                "Disable all antivirus software"
              ],
              correct_index: 0
            }
          ]
        })
      });

      if (res.ok) {
        addToast({ title: 'Module Published!', description: `Successfully created security lesson "${newTitle}".`, type: 'success' });
        setNewTitle('');
        setNewSummary('');
        setNewContent('');
        fetchLessons();
        fetchAdaptiveProfile();
      }
    } catch (e) {
      addToast({ title: 'Failed', description: 'Could not create security lesson.', type: 'error' });
    }
  };

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Phishing Attacks': return <Shield size={16} className="text-blue-400" />;
      case 'Malware & Ransomware': return <AlertTriangle size={16} className="text-red-400" />;
      case 'Password & Authentication Security': return <KeyRound size={16} className="text-emerald-400" />;
      case 'Social Engineering': return <UserCheck size={16} className="text-purple-400" />;
      case 'Network Security': return <Wifi size={16} className="text-cyan-400" />;
      case 'Cloud Security': return <Cloud size={16} className="text-indigo-400" />;
      case 'AI & Modern Cyber Threats': return <Bot size={16} className="text-pink-400" />;
      case 'Mobile Security': return <Smartphone size={16} className="text-amber-400" />;
      default: return <BookOpen size={16} className="text-slate-400" />;
    }
  };

  const calculatePasswordScore = (pass: string) => {
    if (!pass) return { text: 'Enter password to test', score: 0, color: 'text-slate-500' };
    if (pass.length < 8) return { text: 'Weak (Crackable in seconds)', score: 20, color: 'text-red-400' };
    if (pass.length < 12) return { text: 'Moderate (Crackable in 3 days)', score: 55, color: 'text-amber-400' };
    if (pass.length >= 16 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) {
      return { text: 'Excellent (Passkey / Cryptographic Standard)', score: 100, color: 'text-emerald-400' };
    }
    return { text: 'Strong (Crackable in 400 years)', score: 85, color: 'text-blue-400' };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-white">Adaptive Learning Platform</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <Sparkles size={12} /> AI Powered
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Dynamic cybersecurity education, interactive threat simulations, and real-time intelligence feeds.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'modules' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpenCheck size={14} /> Curriculum Modules
          </button>
          <button
            onClick={() => setActiveTab('threats')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'threats' ? 'bg-red-600 text-white shadow-md shadow-red-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertCircle size={14} /> Latest Cyber Threats
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'admin' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus size={14} /> Manage Content
            </button>
          )}
        </div>
      </div>

      {/* ── Adaptive Profile Dashboard Bar ── */}
      {adaptiveProfile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Award size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Knowledge Level</p>
              <p className="text-lg font-black text-white">{adaptiveProfile.knowledge_level}</p>
            </div>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Flame size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Learning Streak</p>
              <p className="text-lg font-black text-white">{adaptiveProfile.streak_days} Days Active 🔥</p>
            </div>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <BookOpenCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Modules</p>
              <p className="text-lg font-black text-white">{adaptiveProfile.completed_count} / {adaptiveProfile.total_assigned} ({adaptiveProfile.completion_percentage}%)</p>
            </div>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Level Tier</p>
              <p className="text-lg font-black text-white capitalize">{adaptiveProfile.suggested_next_difficulty} Tier</p>
            </div>
          </Card>
        </div>
      )}

      {/* ── Adaptive Recommendation Banner ── */}
      {adaptiveProfile?.recommended_lessons && adaptiveProfile.recommended_lessons.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-slate-900/40 border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Adaptive Learning Recommendation</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Based on your recent security checks, we recommend completing: <strong className="text-blue-300">{adaptiveProfile.recommended_lessons[0].title}</strong>
              </p>
            </div>
          </div>
          <Button 
            onClick={() => handleSelectLesson(adaptiveProfile.recommended_lessons[0].id)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 flex items-center gap-2 rounded-xl whitespace-nowrap shadow-md shadow-blue-500/20"
          >
            Start Recommended Lesson <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* ── TAB 1: CURRICULUM MODULES ── */}
      {activeTab === 'modules' && (
        <div className="flex gap-6 items-start">

          {/* ── LEFT SIDEBAR: Category Nav + Module List ── */}
          <div className="w-64 flex-shrink-0 space-y-3 sticky top-4">

            {/* Search + Difficulty Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="All">All Difficulty Tiers</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            {/* Category Nav */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Categories</p>
              </div>
              <div className="p-2 space-y-0.5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {cat !== 'All'
                      ? getCategoryIcon(cat)
                      : <BookOpen size={14} className={selectedCategory === 'All' ? 'text-white' : 'text-slate-500'} />
                    }
                    {cat}
                    {selectedCategory === cat && cat !== 'All' && (
                      <span className="ml-auto text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-black">
                        {filteredLessons.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Module List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
              {isLoading ? (
                <p className="text-xs text-slate-500 px-2 py-4">Loading modules...</p>
              ) : filteredLessons.length === 0 ? null : (
                filteredLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 ${
                      selectedLesson?.id === lesson.id
                        ? 'border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                        : 'border-slate-800/80 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      {lesson.completed ? (
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle size={10} /> Done
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {lesson.difficulty}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-slate-500">
                        {getCategoryIcon(lesson.category)}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white leading-snug line-clamp-2">{lesson.title}</h3>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Lesson Reader ── */}
          <div className="flex-1 min-w-0">
            {(filteredLessons.length === 0 || !selectedLesson) ? (
              <div className="h-full min-h-[480px] border border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-10 bg-slate-900/20">
                <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-700/30 mb-5">
                  <BookOpen size={40} className="text-slate-600" />
                </div>
                {filteredLessons.length === 0 ? (
                  <>
                    <p className="text-base font-bold text-slate-300">No Modules Found</p>
                    <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                      No cybersecurity modules match the selected category or search query. Try selecting a different category from the sidebar.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-bold text-slate-300">Select a Cybersecurity Module</p>
                    <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                      Choose any training course from the curriculum on the left to read content and complete knowledge checks.
                    </p>
                  </>
                )}
              </div>
            ) : selectedLesson ? (
                <Card className="border border-slate-800 bg-slate-900/50 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
                  {/* Header */}
                  <div className="pb-4 border-b border-slate-800 flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          {getCategoryIcon(selectedLesson.category)}
                          {selectedLesson.category}
                        </span>
                        <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg font-bold">
                          {selectedLesson.difficulty} Level
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 leading-tight">{selectedLesson.title}</h2>
                    </div>

                    {selectedLesson.completed && (
                      <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 px-3.5 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 shadow-inner">
                        <CheckCircle size={16} /> Certified Complete
                      </span>
                    )}
                  </div>

                  {/* Render Lesson HTML Content */}
                  <div 
                    className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none space-y-4"
                    dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                  />

                  {/* ── Interactive Practical Exercise Widgets ── */}
                  {selectedLesson.category === 'Phishing Attacks' && (
                    <div className="p-5 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-3">
                      <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                        <Eye size={16} /> INTERACTIVE EXERCISE: Spot The Red Flag
                      </div>
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
                        <p><strong>From:</strong> security-update@paypa1-verify.com</p>
                        <p><strong>Subject:</strong> 🚨 Immediate Action Required: Account Suspended in 24 Hours</p>
                        <p className="text-slate-400">"Dear Customer, we detected unauthorized attempts. Click <span className="text-blue-400 underline cursor-pointer" onClick={() => setEmailFlagged("Domain Spoofing Detected: 'paypa1-verify.com' is an external fake domain!")}>http://paypa1-verify.com/login</span> to verify password."</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => setEmailFlagged("Correct! The domain 'paypa1-verify.com' uses typosquatting to impersonate PayPal.")}
                          className="bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white px-3 py-1.5"
                        >
                          Flag Typosquatted Domain
                        </Button>
                      </div>
                      {emailFlagged && (
                        <p className="text-xs font-bold text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{emailFlagged}</p>
                      )}
                    </div>
                  )}

                  {selectedLesson.category === 'Password & Authentication Security' && (
                    <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <KeyRound size={16} /> INTERACTIVE EXERCISE: Real-Time Password Entropy Tester
                      </div>
                      <input
                        type="text"
                        placeholder="Type a sample password to test entropy..."
                        value={testPassword}
                        onChange={(e) => setTestPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      {testPassword && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className={calculatePasswordScore(testPassword).color}>
                              {calculatePasswordScore(testPassword).text}
                            </span>
                            <span className="text-slate-400">{calculatePasswordScore(testPassword).score}% Score</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-2 transition-all duration-300" 
                              style={{ width: `${calculatePasswordScore(testPassword).score}%` }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quiz Check Section */}
                  {selectedLesson.quiz.id ? (
                    <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <HelpCircle size={16} className="text-emerald-400" />
                        <span>Interactive Knowledge Check • Pass threshold: <strong>70%+</strong></span>
                      </div>
                      <Link to={`/quiz/${selectedLesson.quiz.id}`}>
                        <Button className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                          <Play size={16} /> Take Knowledge Quiz
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic pt-4">No quiz currently configured for this module.</p>
                  )}
                </Card>
            ) : null}
          </div>
        </div>
      )}


      {/* ── TAB 2: LATEST CYBER THREATS (EMERGING INTELLIGENCE) ── */}
      {activeTab === 'threats' && (
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-wider">
                <AlertCircle size={16} /> Real-Time Threat Intelligence Feed
              </div>
              <h2 className="text-xl font-black text-white mt-1">Newly Discovered Cyber Threats & CVE Advisories</h2>
              <p className="text-xs text-slate-400 mt-1">
                Continuously updated attack vectors, zero-day vulnerabilities, and active ransomware campaigns.
              </p>
            </div>
            <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-xl text-xs font-extrabold border border-red-500/20">
              Live Feed Active 🔴
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {emergingThreats.map((threat) => (
              <Card key={threat.id} className="border border-slate-800 bg-slate-900/40 p-6 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 tracking-wider">
                      {threat.severity}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">{threat.cve_id}</span>
                  </div>

                  <h3 className="text-base font-extrabold text-white leading-snug">{threat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{threat.summary}</p>
                </div>

                <div className="pt-4 border-t border-slate-850 space-y-3">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                    <strong className="text-emerald-400">Mitigation:</strong> {threat.mitigation}
                  </div>

                  {threat.lesson_id && (
                    <Button 
                      onClick={() => {
                        setActiveTab('modules');
                        handleSelectLesson(threat.lesson_id!);
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2"
                    >
                      Start Emergency Briefing <ArrowRight size={14} />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: ADMIN CONTENT MANAGEMENT ── */}
      {activeTab === 'admin' && isAdmin && (
        <Card className="border border-slate-800 bg-slate-900/50 p-6 sm:p-8 space-y-6">
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-xl font-black text-white">Create Custom Security Module</h2>
            <p className="text-xs text-slate-400 mt-1">Publish new cybersecurity lessons across all 9 categories to employee accounts.</p>
          </div>

          <form onSubmit={handleCreateModule} className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Lesson Title</label>
                <input
                  type="text"
                  placeholder="e.g. Quishing & Mobile QR Code Security"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                >
                  {categories.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Difficulty Tier</label>
                <select
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Short Summary</label>
                <input
                  type="text"
                  placeholder="Key takeaway preview..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">HTML Content</label>
              <textarea
                rows={6}
                placeholder="<h3>Overview</h3><p>Enter lesson HTML content here...</p>"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl flex items-center gap-2">
              <Plus size={16} /> Publish Security Module
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
