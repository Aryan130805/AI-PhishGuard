import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Cpu } from 'lucide-react';

export default function AdminAiGenerator() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">AI Template Generator</h1>
        <p className="mt-2 text-sm text-slate-400">Generate realistic training templates using localized generative models.</p>
      </div>
      <Card className="border border-slate-800 bg-slate-900/40 p-6">
        <CardHeader className="pb-4">
          <div className="w-10 h-10 bg-primary-500/10 text-primary-400 flex items-center justify-center rounded-lg mb-3">
            <Cpu size={20} />
          </div>
          <CardTitle>AI Simulation Editor</CardTitle>
          <CardDescription>Select vector contexts, threat themes, and draft custom phishing models.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="p-8 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
            <p className="text-sm font-semibold text-primary-400">Coming Soon</p>
            <p className="text-xs text-slate-400 mt-1">Generative models endpoint integration is in progress.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
