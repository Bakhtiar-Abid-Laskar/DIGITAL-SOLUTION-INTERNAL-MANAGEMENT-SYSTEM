import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from './Card';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton-pulse", className)}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <Card noAccentLine className="p-0">
      <CardContent className="flex items-center gap-4 p-6">
        <Skeleton className="w-14 h-14 rounded-[14px]" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}
