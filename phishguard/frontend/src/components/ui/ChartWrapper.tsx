import React from 'react';
import { ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';

interface ChartWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  height?: number | string;
  className?: string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  description,
  children,
  height = 300,
  className = '',
}) => {
  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-bold tracking-tight text-white">{title}</CardTitle>
        {description && <CardDescription className="text-xs text-slate-400">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }} className="relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Reusable custom styled Tooltip for Recharts
export const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
  valueFormatter?: (value: any) => string;
}> = ({ active, payload, label, valueFormatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950/95 p-3 shadow-xl backdrop-blur-sm text-xs space-y-1.5 z-50">
        {label && <p className="font-semibold text-slate-200">{label}</p>}
        <div className="space-y-1">
          {payload.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span 
                  className="h-2 w-2 rounded-full shrink-0" 
                  style={{ backgroundColor: item.color || item.fill }} 
                />
                {item.name}:
              </span>
              <span className="font-bold text-white font-mono">
                {valueFormatter ? valueFormatter(item.value) : item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
