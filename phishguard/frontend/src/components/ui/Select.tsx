import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full rounded-lg border bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 ${
            error 
              ? 'border-risk-critical focus:ring-risk-critical' 
              : 'border-slate-800 focus:border-slate-700'
          } disabled:opacity-50 disabled:bg-slate-950 ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-risk-critical font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
