import React from 'react';
import { Mail, Users, AlertTriangle, CheckCircle2, TrendingUp, ShieldAlert } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { name: 'Active Campaigns', value: '4', change: '+12%', icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Targeted Employees', value: '1,248', change: '+8%', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { name: 'Average Click Rate', value: '12.4%', change: '-3.2%', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Reporting Rate', value: '68.2%', change: '+15.4%', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  const recentCampaigns = [
    { id: '1', name: 'Q2 Credential Harvest Drill', type: 'Office365 Phish', sent: '1,248', clicked: '155', reported: '850', status: 'In Progress' },
    { id: '2', name: 'CEO Urgent Wire Transfer Scam', type: 'Spear Phish', sent: '45', clicked: '2', reported: '41', status: 'Completed' },
    { id: '3', name: 'HR Benefits Policy Update', type: 'Attachment Phish', sent: '1,120', clicked: '240', reported: '512', status: 'Completed' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard Overview</h1>
        <p className="mt-2 text-sm text-slate-400">Track company-wide phishing simulation metrics and employee reporting response behaviors.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 p-5 shadow-lg backdrop-blur-sm hover:border-slate-700 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-300`}>
                <stat.icon size={22} />
              </div>
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                stat.change.startsWith('+') && stat.name.includes('Rate') && !stat.name.includes('Click')
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : stat.change.startsWith('-') && stat.name.includes('Click')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-slate-500/10 text-slate-400'
              }`}>
                <TrendingUp size={12} />
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight text-white">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard Grid split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Drill Results */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Active Simulations</h2>
            <button className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors">View all campaigns</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                  <th className="pb-3 font-medium">Campaign Name</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium text-center">Sent</th>
                  <th className="pb-3 font-medium text-center">Clicked</th>
                  <th className="pb-3 font-medium text-center">Reported</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 font-medium text-white">{camp.name}</td>
                    <td className="py-4 text-xs">{camp.type}</td>
                    <td className="py-4 text-center">{camp.sent}</td>
                    <td className="py-4 text-center text-red-400 font-semibold">{camp.clicked}</td>
                    <td className="py-4 text-center text-emerald-400 font-semibold">{camp.reported}</td>
                    <td className="py-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        camp.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Risk Indicator */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm p-6 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-500" />
              Risk Assessment
            </h2>
            <p className="text-xs text-slate-400">Aggregate telemetry from campaigns indicators.</p>
            
            <div className="mt-8 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                {/* Circular indicator mock */}
                <div className="h-32 w-32 rounded-full border-8 border-slate-800 border-t-red-500 border-r-amber-500 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-white">Med</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Score: 4.2</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Vulnerability Rating</span>
                <span className="font-semibold text-amber-400">Moderate Risk</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500">
            Based on Q2 simulated drills and training enrollment ratios.
          </div>
        </div>
      </div>
    </div>
  );
}
