"use client";

import React from 'react';
import Link from 'next/link';
import { Card } from './Card';
import { cn } from '../../lib/utils';
import { useCountUp } from '../../hooks/useCountUp';

export interface StatCardProps {
  title: string;
  value: number | string;
  detail?: string | React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'money';
  href?: string;
  onClick?: () => void;
  className?: string;
  formatter?: (val: number) => string;
  animate?: boolean;
}

const toneStyles = {
  primary: "bg-admin-accent-dim text-admin-accent border-admin-accent/20",
  info: "bg-admin-progress-bg text-admin-progress-fg border-admin-progress-fg/20",
  success: "bg-admin-completed-bg text-admin-completed-fg border-admin-completed-fg/20",
  warning: "bg-admin-pending-bg text-admin-pending-fg border-admin-pending-fg/20",
  danger: "bg-admin-urgent-bg text-admin-urgent-fg border-admin-urgent-fg/20",
  money: "bg-admin-pending-bg text-admin-pending-fg border-admin-pending-fg/20",
  neutral: "bg-admin-bg-subtle text-admin-text-secondary border-admin-border"
};

export function StatCard({
  title,
  value,
  detail,
  icon,
  tone = 'primary',
  href,
  onClick,
  className,
  formatter,
  animate = true
}: StatCardProps) {
  const isNumeric = typeof value === 'number';
  const animatedNumber = useCountUp(isNumeric ? value : 0);

  const displayValue = isNumeric
    ? animate
      ? formatter
        ? formatter(Number(animatedNumber))
        : animatedNumber
      : formatter
        ? formatter(value)
        : value
    : value;

  const content = (
    <Card 
      noAccentLine 
      className={cn(
        "p-4 transition-all duration-150 ease-out border border-admin-border bg-admin-bg-surface",
        (href || onClick) && "hover:bg-admin-bg-subtle hover:border-admin-border-strong cursor-pointer group shadow-xs hover:shadow-card",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted truncate">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-admin-text-primary tracking-tight truncate">
            {displayValue}
          </p>
          {detail && (
            <div className="mt-1 text-sm text-admin-text-secondary truncate">
              {detail}
            </div>
          )}
        </div>
        {icon && (
          <span className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-transform duration-150 group-hover:scale-105",
            toneStyles[tone]
          )}>
            {icon}
          </span>
        )}
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}
