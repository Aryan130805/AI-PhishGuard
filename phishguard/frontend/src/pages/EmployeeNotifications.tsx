import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, BookOpen, Award, ShieldAlert, Circle, CheckCircle, Mail } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';

interface NotificationItem {
  id: number;
  type: string;
  payload: { message?: string; link?: string; title?: string };
  read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  lesson_assigned: { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  certificate_issued: { icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  high_risk_score: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  campaign_scheduled: { icon: Bell, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  campaign_completed: { icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
};

const DEFAULT_CONFIG = { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700' };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function EmployeeNotifications() {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/notifications');
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch {
      addToast({ title: 'Load Error', description: 'Could not load notifications.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const markRead = async (id: number) => {
    await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      addToast({ title: 'Done', description: 'All notifications marked as read.', type: 'success' });
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">
            System alerts, new lesson assignments, and compliance updates.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 transition-colors disabled:opacity-60"
          >
            <CheckCheck size={14} />
            {markingAll ? 'Marking...' : `Mark all read (${unreadCount})`}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 rounded-2xl text-center">
          <Bell size={48} className="text-slate-700 mb-3" />
          <p className="text-base font-bold text-slate-400">You're all caught up!</p>
          <p className="text-sm text-slate-500 mt-2 max-w-xs">
            Notifications appear here when new modules are assigned, your risk score changes, or a certificate is earned.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const cfg = TYPE_CONFIG[notif.type] || DEFAULT_CONFIG;
            const IconComponent = cfg.icon;
            const title = notif.payload?.title || notif.type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
            const message = notif.payload?.message || '';

            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markRead(notif.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  notif.read
                    ? 'border-slate-800 bg-slate-900/20 opacity-70'
                    : `border-slate-700 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900`
                }`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                  <IconComponent size={16} className={cfg.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{title}</p>
                    {!notif.read && (
                      <Circle size={6} className="text-emerald-400 fill-emerald-400" />
                    )}
                  </div>
                  {message && <p className="text-xs text-slate-400 mt-0.5">{message}</p>}
                </div>

                {/* Time */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-slate-500">{notif.created_at ? timeAgo(notif.created_at) : ''}</p>
                  {notif.read && <CheckCircle size={12} className="text-slate-600 mt-1 ml-auto" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
