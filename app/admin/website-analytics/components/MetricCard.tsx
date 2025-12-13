'use client';

import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  format?: 'number' | 'currency' | 'percent' | 'decimal';
  icon?: React.ComponentType<{ className?: string }>;
  iconBgColor?: string;
  iconColor?: string;
  loading?: boolean;
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  change,
  changeLabel,
  format = 'number',
  icon: Icon,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  loading = false,
  subtitle,
}: MetricCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'decimal':
        return val.toFixed(2);
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(Math.round(val));
    }
  };

  const getChangeColor = (changeVal: number): string => {
    if (changeVal > 0) return 'text-green-600';
    if (changeVal < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatValue(value)}
          </p>
          {(change !== undefined || subtitle) && (
            <div className="mt-1 flex items-center gap-1">
              {change !== undefined && (
                <>
                  {change !== 0 && (
                    change > 0 ? (
                      <ArrowUpIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 text-red-600" />
                    )
                  )}
                  <span className={`text-sm font-medium ${getChangeColor(change)}`}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                </>
              )}
              {changeLabel && (
                <span className="text-sm text-gray-500 ml-1">{changeLabel}</span>
              )}
              {subtitle && !change && (
                <span className="text-sm text-gray-500">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`${iconBgColor} p-2.5 rounded-lg`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        )}
      </div>
    </div>
  );
}

// Grid wrapper for consistent layout
export function MetricCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
