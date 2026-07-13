import React from 'react';

export type RiskLevel = 'excellent' | 'good' | 'needs-improvement' | 'critical';

interface BadgeProps {
  variant: RiskLevel | 'default' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  children,
  className = '',
}) => {
  const baseStyle = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors';
  
  const styles = {
    excellent: 'bg-risk-excellent/10 text-emerald-400 border-risk-excellent/20',
    good: 'bg-risk-good/10 text-yellow-400 border-risk-good/20',
    'needs-improvement': 'bg-risk-needs-improvement/10 text-orange-400 border-risk-needs-improvement/20',
    critical: 'bg-risk-critical/10 text-red-400 border-risk-critical/20',
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    info: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  };

  return (
    <span className={`${baseStyle} ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};
