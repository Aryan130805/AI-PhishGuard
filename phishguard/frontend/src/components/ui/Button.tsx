import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white border border-transparent shadow-sm shadow-primary-500/10 focus:ring-offset-slate-950',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:ring-offset-slate-950',
    danger: 'bg-risk-critical hover:bg-red-600 text-white border border-transparent shadow-sm shadow-red-500/10 focus:ring-offset-slate-950',
    ghost: 'bg-transparent hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 border border-transparent',
    outline: 'bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
