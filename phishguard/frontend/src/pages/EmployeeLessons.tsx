import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BookOpen, CheckCircle, ArrowRight, BookOpenCheck, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';

interface LessonItem {
  id: number;
  topic: string;
  title: string;
  assigned_at: string;
  completed_at: string | null;
  completed: boolean;
}

interface LessonDetail {
  id: number;
  topic: string;
  title: string;
  content: string;
  completed: boolean;
  quiz: {
    id: number | null;
    questions: any[];
  };
}

export default function EmployeeLessons() {
  const { addToast } = useToast();
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/training/lessons');
      if (res.ok) {
        const data = await res.json();
        setLessons(data);
      } else {
        addToast({ title: 'Fetch Failed', description: 'Could not load assigned modules.', type: 'error' });
      }
    } catch (e) {
      addToast({ title: 'Network Error', description: 'Could not fetch training list.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLesson = async (lessonId: number) => {
    try {
      const res = await apiFetch(`/training/lessons/${lessonId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLesson(data);
      } else {
        addToast({ title: 'Failed to Load', description: 'Could not load lesson details.', type: 'error' });
      }
    } catch (e) {
      addToast({ title: 'Network Error', description: 'Could not load lesson content.', type: 'error' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Security Modules</h1>
        <p className="mt-2 text-sm text-slate-400">Complete assigned compliance lessons and quizzes to build security habits.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Modules List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-slate-800 bg-slate-900/40 p-5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BookOpenCheck size={18} className="text-emerald-400" />
                Assigned Curriculum
              </CardTitle>
              <CardDescription>Track your active and completed training units.</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {isLoading ? (
                <p className="text-xs text-slate-500">Loading lessons...</p>
              ) : lessons.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                  <p className="text-xs text-slate-500">No security modules assigned at the moment.</p>
                </div>
              ) : (
                lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson.id)}
                    className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                      selectedLesson?.id === lesson.id
                        ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400'
                        : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{lesson.topic.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-bold text-white">{lesson.title}</p>
                    </div>
                    <div>
                      {lesson.completed ? (
                        <CheckCircle size={18} className="text-emerald-400" />
                      ) : (
                        <ArrowRight size={18} className="text-slate-500" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Lesson Detail */}
        <div className="lg:col-span-2">
          {selectedLesson ? (
            <Card className="border border-slate-800 bg-slate-900/40 p-6 space-y-6">
              <div className="pb-4 border-b border-slate-800 flex justify-between items-start flex-wrap gap-4">
                <div>
                  <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 font-semibold tracking-wide uppercase">
                    {selectedLesson.topic.replace(/_/g, ' ')}
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mt-2">{selectedLesson.title}</h2>
                </div>
                {selectedLesson.completed && (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <CheckCircle size={14} /> Completed
                  </span>
                )}
              </div>

              {/* HTML Content */}
              <div 
                className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none space-y-4"
                dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
              />

              {/* Interactive Quiz Button */}
              {selectedLesson.quiz.id ? (
                <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-emerald-400" />
                    Quiz checks your understanding. Standard to pass: 70%+
                  </div>
                  <Link to={`/quiz/${selectedLesson.quiz.id}`}>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 flex items-center gap-2">
                      Take Quiz Check
                      <ArrowRight size={16} />
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No quiz currently configured for this lesson.</p>
              )}
            </Card>
          ) : (
            <div className="h-full min-h-[300px] border border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-slate-900/10">
              <BookOpen size={48} className="text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-400">Select a Training Module</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">Click on any course from the curriculum path on the left to read content and start knowledge checkups.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
