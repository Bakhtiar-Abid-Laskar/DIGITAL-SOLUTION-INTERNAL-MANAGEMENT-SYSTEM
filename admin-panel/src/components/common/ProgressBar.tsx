import React from 'react';
import { cn } from '../../lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100 or current count
  max?: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const toneStyles = {
  accent: "bg-admin-accent",
  success: "bg-admin-completed-fg",
  warning: "bg-admin-pending-fg",
  danger: "bg-admin-urgent-fg",
  info: "bg-admin-progress-fg",
};

const sizeStyles = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

export function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
  size = 'md',
  showLabel = false,
  label,
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  return (
    <div className={cn("w-full space-y-1.5", className)} {...props}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between text-xs font-medium text-admin-text-secondary">
          <span>{label || `${Math.round(percentage)}%`}</span>
          <span>{value} / {max}</span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-admin-bg-subtle overflow-hidden border border-admin-border/50", sizeStyles[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-300 ease-out", toneStyles[tone])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
