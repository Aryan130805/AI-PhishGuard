import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, ExternalLink, Mail, ShieldAlert, BookOpen, Award, Sparkles } from 'lucide-react';

interface NotificationItem {
  id: number;
  type: string;
  payload: {
    message: string;
    link?: string;
  };
  read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  role: 'admin' | 'employee';
}

const API_BASE = 'http://localhost:8000';

export default function NotificationBell({ role }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tokenKey = role === 'admin' ? 'token' : 'employee_token';
  const historyLink = role === 'admin' ? '/admin/notifications' : '/employee/notifications';

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem(tokenKey);
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };

  const loadNotifications = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
      
      const countRes = await fetchWithAuth(`${API_BASE}/notifications/unread-count`);
      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadCount(countData.unread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Poll notifications on mount/unmount
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [role]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetchWithAuth(`${API_BASE}/notifications/${id}/read`, {
        method: 'POST',
      });
      if (res.ok) {
        loadNotifications();
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/notifications/read-all`, {
        method: 'POST',
      });
      if (res.ok) {
        loadNotifications();
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'campaign_completed':
        return <Mail size={14} className="text-blue-400" />;
      case 'high_risk_score':
        return <ShieldAlert size={14} className="text-red-400" />;
      case 'lesson_assigned':
        return <BookOpen size={14} className="text-yellow-400" />;
      case 'certificate_issued':
        return <Award size={14} className="text-emerald-400" />;
      default:
        return <Sparkles size={14} className="text-purple-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-slate-900 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="font-semibold text-sm text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  className={`flex gap-3 p-3.5 hover:bg-slate-800/40 transition-colors ${
                    !notif.read ? 'bg-slate-800/20' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0 flex items-center justify-center h-6 w-6 rounded-lg bg-slate-800 border border-slate-700">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-relaxed ${!notif.read ? 'text-white font-medium' : 'text-slate-400'}`}>
                      {notif.payload.message}
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      title="Mark as read"
                      className="shrink-0 text-slate-500 hover:text-emerald-400 transition-colors p-1"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 px-4 text-center text-slate-500 text-xs">
                You're all caught up!
              </div>
            )}
          </div>

          <Link
            to={historyLink}
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white border-t border-slate-800 transition-colors"
          >
            <span>View All Notifications</span>
            <ExternalLink size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}
