import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { cn } from '../../lib/utils';

export interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: string | React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  action,
  badge,
  children,
  className,
  contentClassName,
  headerClassName,
  noPadding = false,
  ...props
}: SectionCardProps) {
  const hasHeader = Boolean(title || action || badge);

  return (
    <Card 
      noAccentLine 
      className={cn("border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs", className)} 
      {...props}
    >
      {hasHeader && (
        <CardHeader className={cn("flex flex-row items-center justify-between gap-4 p-4 border-b border-admin-border", headerClassName)}>
          <div className="flex items-center gap-2.5 min-w-0">
            {typeof title === 'string' ? (
              <CardTitle className="text-base font-bold text-admin-text-primary tracking-tight truncate">
                {title}
              </CardTitle>
            ) : (
              title
            )}
            {badge}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding ? "p-0" : "p-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
