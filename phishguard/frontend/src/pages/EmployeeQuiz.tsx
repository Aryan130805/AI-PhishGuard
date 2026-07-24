import { useEffect, useState, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Award, RefreshCw, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface QuizQuestion {
  question: string;
  options: string[];
}

interface QuizData {
  id: number;
  lesson_id: number;
  lesson_title: string;
  questions: QuizQuestion[];
}

export default function EmployeeQuiz() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      const token = localStorage.getItem('employee_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`http://localhost:8000/training/quiz/${id}`, {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setQuiz(data);
        setAnswers(new Array(data.questions.length).fill(-1));
        setResult(null);
      } else {
        addToast({ title: 'Fetch Error', description: 'Could not load quiz questions.', type: 'error' });
      }
    } catch (e) {
      addToast({ title: 'Network Error', description: 'Error connecting to server.', type: 'error' });
    }
  };

  const handleSelectOption = (qIdx: number, oIdx: number) => {
    const updated = [...answers];
    updated[qIdx] = oIdx;
    setAnswers(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (answers.includes(-1)) {
      addToast({ title: 'Incomplete Answers', description: 'Please answer all questions before submitting.', type: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('employee_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`http://localhost:8000/training/quiz/${id}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ answers }),
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setResult({ score: data.score, passed: data.passed });
        if (data.passed) {
          addToast({ title: 'Passed!', description: `Score: ${data.score}%. Certificate is now available.`, type: 'success' });
        } else {
          addToast({ title: 'Practice Makes Perfect', description: `Score: ${data.score}%. Try again to pass.`, type: 'warning' });
        }
      } else {
        addToast({ title: 'Submission Error', description: 'Could not grade quiz.', type: 'error' });
      }
    } catch (err) {
      addToast({ title: 'Network Error', description: 'Could not submit answers.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-slate-400 text-sm">
        Loading quiz module...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Quiz Checkup</h1>
        <p className="mt-2 text-sm text-slate-400">Knowledge check for: <span className="text-emerald-400 font-semibold">{quiz.lesson_title}</span></p>
      </div>

      {result ? (
        /* Results View */
        <Card className="border border-slate-800 bg-slate-900/40 p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center border-2 mb-4">
            {result.passed ? (
              <CheckCircle size={40} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={40} className="text-amber-400" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">{result.score}% Score</h2>
            <p className={`text-sm font-bold uppercase tracking-wider ${result.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {result.passed ? 'Passed compliance targets!' : 'Did not meet pass target (70%)'}
            </p>
          </div>

          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {result.passed
              ? 'Your security certification is ready! Download the credential PDF to verify compliance.'
              : 'Take a brief review of the course and try the checkup again to master the threat indicators.'}
          </p>

          <div className="pt-6 border-t border-slate-800 flex flex-wrap justify-center gap-4">
            {result.passed ? (
              <>
                <Link to="/certificates">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 flex items-center gap-2">
                    <Award size={18} /> View Certificates
                  </Button>
                </Link>
                <Link to="/lessons">
                  <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800 px-6 py-2.5">
                    Back to Curriculum
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button onClick={fetchQuiz} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2.5 flex items-center gap-2">
                  <RefreshCw size={16} /> Try Checkup Again
                </Button>
                <Link to="/lessons">
                  <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800 px-6 py-2.5">
                    Review Lesson Material
                  </Button>
                </Link>
              </>
            )}
          </div>
        </Card>
      ) : (
        /* Quiz Questions Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          {quiz.questions.map((question, qIdx) => (
            <Card key={qIdx} className="border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <div className="flex gap-3">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0">
                  {qIdx + 1}
                </span>
                <p className="text-base font-bold text-white leading-relaxed">{question.question}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
                {question.options.map((option, oIdx) => (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectOption(qIdx, oIdx)}
                    className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all duration-150 ${
                      answers[qIdx] === oIdx
                        ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400 font-semibold'
                        : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </Card>
          ))}

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || answers.includes(-1)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 flex items-center gap-2 border border-emerald-500/20"
            >
              {isSubmitting ? 'Grading...' : 'Submit Answers'}
              <ChevronRight size={18} />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
