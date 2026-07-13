import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div 
        className={`relative w-full ${sizeClasses[size]} transform overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-slate-100 p-6 shadow-2xl transition-all scale-100 opacity-100 animate-in fade-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-white tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 max-h-[70vh] overflow-y-auto text-sm text-slate-300 leading-relaxed pr-1">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            {footer}
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
};
