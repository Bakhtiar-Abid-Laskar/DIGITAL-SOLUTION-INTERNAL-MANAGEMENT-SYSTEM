import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from './Card';

interface LoadingStateProps {
  message?: string;
  className?: string;
  asCard?: boolean;
}

export function LoadingState({ 
  message = "Loading...", 
  className,
  asCard = false
}: LoadingStateProps) {
  
  const content = (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <Loader2 className="w-8 h-8 text-admin-accent animate-spin mb-4" />
      <p className="text-sm font-medium text-admin-text-secondary">{message}</p>
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

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full border border-admin-border rounded-xl overflow-hidden bg-admin-bg-surface shadow-xs">
      <div className="bg-admin-bg-subtle p-4 border-b border-admin-border flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 skeleton-pulse flex-1" />
        ))}
      </div>
      <div className="divide-y divide-admin-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 skeleton-pulse flex-1" style={{ opacity: 1 - c * 0.15 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-admin-bg-surface border border-admin-border rounded-xl p-5 shadow-xs flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="h-4 w-24 skeleton-pulse" />
            <div className="h-8 w-8 rounded-lg skeleton-pulse" />
          </div>
          <div className="h-8 w-20 skeleton-pulse mt-1" />
          <div className="h-3 w-32 skeleton-pulse" />
        </div>
      ))}
    </div>
  );
}

