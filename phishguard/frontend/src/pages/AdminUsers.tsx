import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Users } from 'lucide-react';

export default function AdminUsers() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Employee Database</h1>
        <p className="mt-2 text-sm text-slate-400">Manage employee directories, risk bands, and educational status.</p>
      </div>
      <Card className="border border-slate-800 bg-slate-900/40 p-6">
        <CardHeader className="pb-4">
          <div className="w-10 h-10 bg-primary-500/10 text-primary-400 flex items-center justify-center rounded-lg mb-3">
            <Users size={20} />
          </div>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Search, filter, and modify specific candidate records or security groups.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="p-8 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
            <p className="text-sm font-semibold text-primary-400">Coming Soon</p>
            <p className="text-xs text-slate-400 mt-1">Directory list view with filtering algorithms is coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
