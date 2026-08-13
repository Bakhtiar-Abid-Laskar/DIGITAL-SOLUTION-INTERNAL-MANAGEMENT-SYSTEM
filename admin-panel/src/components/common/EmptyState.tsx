import React from 'react';
import { cn } from '../../lib/utils';
import { Inbox } from 'lucide-react';
import { Card, CardContent } from './Card';

interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  subtext?: string;
  action?: React.ReactNode;
  className?: string;
  asCard?: boolean;
}

export function EmptyState({ 
  icon = <Inbox className="w-12 h-12 text-admin-text-muted" />, 
  heading, 
  subtext, 
  action,
  className,
  asCard = true
}: EmptyStateProps) {
  
  const content = (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-admin-text-primary mb-1">{heading}</h3>
      {subtext && <p className="text-sm text-admin-text-secondary max-w-sm mb-6">{subtext}</p>}
      {action && <div>{action}</div>}
    </div>
  );

  if (asCard) {
    return (
      <Card noAccentLine>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}
