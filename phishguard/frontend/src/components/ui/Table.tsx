import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyStateMessage?: string;
  className?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  emptyStateMessage = 'No data available',
  className = '',
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === undefined || bVal === undefined) return 0;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection]);

  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/20 backdrop-blur-sm ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/50">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`p-4 text-xs font-semibold uppercase tracking-wider text-slate-400 ${
                  col.sortable ? 'cursor-pointer select-none hover:text-white transition-colors' : ''
                }`}
                onClick={() => col.sortable && handleSort(String(col.key))}
              >
                <div className="flex items-center gap-1">
                  <span>{col.label}</span>
                  {col.sortable && (
                    <span className="text-slate-500">
                      {sortKey === col.key ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp size={14} className="text-primary-500" />
                        ) : (
                          <ChevronDown size={14} className="text-primary-500" />
                        )
                      ) : (
                        <ArrowUpDown size={12} />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {sortedData.length > 0 ? (
            sortedData.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors text-sm text-slate-300">
                {columns.map((col) => (
                  <td key={String(col.key)} className="p-4 align-middle">
                    {col.render ? col.render(item) : item[String(col.key)]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-slate-500 text-sm">
                {emptyStateMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
