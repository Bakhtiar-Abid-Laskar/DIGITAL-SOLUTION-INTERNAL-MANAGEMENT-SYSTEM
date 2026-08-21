import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from './Card';
import { Skeleton, DataTableSkeleton, TableSkeleton, CardSkeleton, StatCardSkeleton, SectionCardSkeleton, PageHeaderSkeleton, JobDetailSkeleton } from './Skeleton';

export { Skeleton, DataTableSkeleton, TableSkeleton, CardSkeleton, StatCardSkeleton, SectionCardSkeleton, PageHeaderSkeleton, JobDetailSkeleton };

interface LoadingStateProps {
  message?: string;
  className?: string;
  asCard?: boolean;
  rows?: number;
}

/**
 * LoadingState (Skeleton-Powered)
 * Replaces circular spinners with a clean shimmering skeleton block.
 */
export function LoadingState({ 
  message, 
  className,
  asCard = false,
  rows = 4
}: LoadingStateProps) {
  
  const content = (
    <div className={cn("w-full py-6 px-4 space-y-3 animate-fade-in", className)}>
      {message && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-admin-text-muted uppercase tracking-wider">{message}</p>
          <div className="h-1.5 w-16 bg-admin-accent/30 rounded-full overflow-hidden">
            <div className="h-full w-full bg-admin-accent skeleton-pulse" />
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 flex-1 rounded" style={{ opacity: Math.max(0.4, 1 - i * 0.15) }} />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  if (asCard) {
    return (
      <Card noAccentLine className="border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}
