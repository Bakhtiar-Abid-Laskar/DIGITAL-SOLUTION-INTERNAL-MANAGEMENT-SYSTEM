import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardContent } from './Card';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
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

/**
 * StatCardSkeleton
 * Mimics the exact layout of a StatCard: uppercase label, large bold number, subtitle, and icon box.
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card noAccentLine className={cn("p-4 border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-3.5 w-36 rounded" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      </div>
    </Card>
  );
}

/**
 * StatCardGridSkeleton
 * Mimics a grid of StatCards (default 4 cards).
 */
export function StatCardGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * PageHeaderSkeleton
 * Mimics the PageHeader component (title + subtitle + action buttons).
 */
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", className)}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-md" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * SectionCardSkeleton
 * Mimics a SectionCard (header with title + badge + list items).
 */
export function SectionCardSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <Card noAccentLine className={cn("border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-admin-border">
        <Skeleton className="h-5 w-36 rounded" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-admin-border/60">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * DataTableSkeleton
 * Mimics a real data table layout with header and shimmering body rows.
 */
export function DataTableSkeleton({
  rows = 6,
  cols = 6,
  hasFilterBar = true,
  className
}: {
  rows?: number;
  cols?: number;
  hasFilterBar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 flex-1 flex flex-col", className)}>
      {hasFilterBar && (
        <div className="p-4 rounded-lg border border-admin-border bg-admin-bg-surface flex flex-wrap gap-4 items-center justify-between shadow-xs">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      )}

      <Card noAccentLine className="flex-1 flex flex-col overflow-hidden border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-admin-bg-subtle text-admin-text-secondary border-b border-admin-border">
              <tr>
                {Array.from({ length: cols }).map((_, i) => (
                  <th key={i} className="px-6 py-3.5">
                    <Skeleton className={cn("h-3.5 rounded", i === 0 ? "w-20" : i === cols - 1 ? "w-16 ml-auto" : "w-24")} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border bg-admin-bg-surface">
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className="hover:bg-admin-bg-hover transition-colors">
                  {Array.from({ length: cols }).map((_, c) => (
                    <td key={c} className="px-6 py-4">
                      <Skeleton
                        className={cn(
                          "h-4 rounded",
                          c === 0 ? "w-24" : c === 1 ? "w-36" : c === cols - 1 ? "w-16 ml-auto" : "w-20"
                        )}
                        style={{ opacity: Math.max(0.4, 1 - (c * 0.08 + (r % 2) * 0.05)) }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Aliases for backwards compatibility
export const TableSkeleton = DataTableSkeleton;
export const CardSkeleton = StatCardGridSkeleton;
export const SkeletonCard = StatCardSkeleton;

/**
 * JobDetailSkeleton
 * Mimics the multi-card detail view layout.
 */
export function JobDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 max-w-7xl mx-auto pb-10", className)}>
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCardSkeleton rows={3} />
          <SectionCardSkeleton rows={2} />
        </div>
        <div className="space-y-6">
          <SectionCardSkeleton rows={2} />
          <SectionCardSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}
