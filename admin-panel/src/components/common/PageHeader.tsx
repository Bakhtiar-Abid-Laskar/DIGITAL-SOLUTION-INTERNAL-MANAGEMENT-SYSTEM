import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", className)} {...props}>
      <div>
        <h1 className="text-2xl font-bold text-admin-text-primary tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-admin-text-secondary text-sm mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
