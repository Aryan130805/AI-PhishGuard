import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextProps {
  addToast: (options: { title: string; description: string; type?: ToastType; duration?: number }) => void;
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((options: { title: string; description: string; type?: ToastType; duration?: number }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [
      ...prev,
      {
        id,
        title: options.title,
        description: options.description,
        type: options.type || 'info',
        duration: options.duration || 3000,
      },
    ]);
  }, []);

  const toastLegacy = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    addToast({ title: '', description: message, type, duration });
  }, [addToast]);

  const success = useCallback((message: string, duration?: number) => addToast({ title: 'Success', description: message, type: 'success', duration }), [addToast]);
  const error = useCallback((message: string, duration?: number) => addToast({ title: 'Error', description: message, type: 'error', duration }), [addToast]);
  const info = useCallback((message: string, duration?: number) => addToast({ title: 'Info', description: message, type: 'info', duration }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, toast: toastLegacy, success, error, info }}>
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Internal Toast Card Component
const ToastCard: React.FC<{ toast: ToastItem; onClose: (id: string) => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const icons = {
    success: <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />,
    error: <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />,
    info: <Info size={18} className="text-sky-400 shrink-0 mt-0.5" />,
  };

  const borders = {
    success: 'border-emerald-500/20 bg-emerald-950/30',
    error: 'border-red-500/20 bg-red-950/30',
    warning: 'border-amber-500/20 bg-amber-950/30',
    info: 'border-sky-500/20 bg-slate-900/90',
  };

  return (
    <div
      className={`pointer-events-auto flex items-start justify-between w-full p-4 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-right-5 fade-in ${borders[toast.type]}`}
    >
      <div className="flex items-start gap-3">
        {icons[toast.type]}
        <div>
          {toast.title && <h4 className="text-xs font-semibold text-slate-100">{toast.title}</h4>}
          <p className="text-xs text-slate-300 mt-0.5">{toast.description}</p>
        </div>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800/40 transition-colors ml-4 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
};
