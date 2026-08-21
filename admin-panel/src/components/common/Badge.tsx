import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'accent';
  className?: string;
}

const variants = {
  default: "bg-admin-bg-subtle text-admin-text-secondary border border-admin-border",
  accent: "bg-admin-progress-bg text-admin-progress-fg border border-admin-progress-fg/20",
  success: "bg-admin-completed-bg text-admin-completed-fg border border-admin-completed-fg/20",
  warning: "bg-admin-pending-bg text-admin-pending-fg border border-admin-pending-fg/20",
  danger: "bg-admin-urgent-bg text-admin-urgent-fg border border-admin-urgent-fg/20",
  neutral: "bg-admin-bg-subtle text-admin-text-secondary border border-admin-border"
};

export function Badge({ children, variant = 'default', className, ...props }: BadgeProps) {

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide transition-colors duration-150",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
