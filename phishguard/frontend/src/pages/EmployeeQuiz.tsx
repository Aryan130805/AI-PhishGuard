import { useEffect, useState, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Award, RefreshCw, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabase';

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index?: number;
}

interface QuizData {
  id: number;
  lesson_id: number;
  lesson_title: string;
  questions: QuizQuestion[];
}

const FALLBACK_QUIZZES: Record<number, QuizData> = {
  1: {
    id: 1,
    lesson_id: 1,
    lesson_title: 'Email Phishing & Quishing (QR Code) Masterclass',
    questions: [
      {
        question: "What is 'Quishing' in modern cyber attacks?",
        options: [
          "A technique to bypass email filters using malicious QR codes directing victims to phishing sites",
          "A fast wireless network speed test protocol",
          "A hardware key authentication standard",
          "A method for encrypting email attachments"
        ],
        correct_index: 0
      },
      {
        question: "Which indicator strongly suggests an email is a spear phishing attempt?",
        options: [
          "Generic greeting like 'Dear Customer'",
          "Contextual details referencing your recent project, boss's name, or internal vendor names",
          "Sent from an @company.com domain with zero links",
          "A newsletter with an unsubscribe link"
        ],
        correct_index: 1
      }
    ]
  },
  2: {
    id: 2,
    lesson_id: 2,
    lesson_title: 'Ransomware Prevention & Incident Response',
    questions: [
      {
        question: "What is the most effective backup policy against double-extortion ransomware?",
        options: [
          "Maintaining offline, air-gapped or immutable cloud backups",
          "Saving files on a local USB drive left plugged in",
          "Relying solely on continuous cloud sync without version history",
          "Keeping passwords in a text file"
        ],
        correct_index: 0
      }
    ]
  },
  3: {
    id: 3,
    lesson_id: 3,
    lesson_title: 'Multi-Factor Authentication & Password Management',
    questions: [
      {
        question: "How should an employee respond to an unexpected series of MFA push notifications?",
        options: [
          "Deny the request immediately and report a potential credential compromise to IT Security",
          "Approve the push notification to make the popups stop",
          "Turn off the phone",
          "Wait 24 hours before taking action"
        ],
        correct_index: 0
      }
    ]
  }
};

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
    const quizIdNum = Number(id) || 1;

    // 1. Try API
    try {
      const res = await apiFetch(`/training/quiz/${id}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setQuiz(data);
        setAnswers(new Array(data.questions.length).fill(-1));
        setResult(null);
        return;
      }
    } catch {
      // ignore
    }

    // 2. Try Supabase
    try {
      const { data: supaLesson } = await supabase.from('lessons').select('*').eq('id', quizIdNum).maybeSingle();
      if (supaLesson && supaLesson.quiz) {
        const questions = Array.isArray(supaLesson.quiz) ? supaLesson.quiz : [supaLesson.quiz];
        setQuiz({
          id: quizIdNum,
          lesson_id: quizIdNum,
          lesson_title: supaLesson.title || 'Security Module',
          questions
        });
        setAnswers(new Array(questions.length).fill(-1));
        setResult(null);
        return;
      }
    } catch {
      // ignore
    }

    // 3. Fallback quiz data
    const fallback = FALLBACK_QUIZZES[quizIdNum] || FALLBACK_QUIZZES[1];
    setQuiz(fallback);
    setAnswers(new Array(fallback.questions.length).fill(-1));
    setResult(null);
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

    // 1. Try API submit first
    try {
      const res = await apiFetch(`/training/quiz/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setResult({ score: data.score, passed: data.passed });
        if (data.passed) {
          addToast({ title: 'Passed! 🎉', description: `Score: ${data.score}%. Certificate available.`, type: 'success' });
        } else {
          addToast({ title: 'Practice Makes Perfect', description: `Score: ${data.score}%. Try again.`, type: 'warning' });
        }
        setIsSubmitting(false);
        return;
      }
    } catch {
      // ignore
    }

    // 2. Fallback local grading
    let correct = 0;
    if (quiz?.questions) {
      quiz.questions.forEach((q, idx) => {
        const userChoice = answers[idx];
        const correctIdx = q.correct_index ?? 0;
        if (userChoice === correctIdx) correct++;
      });

      const score = Math.round((correct / quiz.questions.length) * 100);
      const passed = score >= 70;
      setResult({ score, passed });

      if (passed) {
        addToast({ title: 'Passed! 🎉', description: `Score: ${score}%. Security awareness check completed.`, type: 'success' });
      } else {
        addToast({ title: 'Keep Learning', description: `Score: ${score}%. Try again to pass.`, type: 'warning' });
      }
    }
    setIsSubmitting(false);
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
