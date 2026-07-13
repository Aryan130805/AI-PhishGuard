import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', type = 'text', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={`w-full rounded-lg border bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 ${
            error 
              ? 'border-risk-critical focus:ring-risk-critical' 
              : 'border-slate-800 focus:border-slate-700'
          } disabled:opacity-50 disabled:bg-slate-950 ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-risk-critical font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
