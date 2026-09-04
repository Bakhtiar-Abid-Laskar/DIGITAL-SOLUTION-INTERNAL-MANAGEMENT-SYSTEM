"use client";

import React from 'react';
import { X, RotateCcw, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActiveFilterItem {
  id: string;
  label: string;
  value: string;
  onRemove?: () => void;
}

export interface ActiveFiltersBarProps {
  filters: ActiveFilterItem[];
  onClearAll: () => void;
  className?: string;
}

export function ActiveFiltersBar({ filters, onClearAll, className }: ActiveFiltersBarProps) {
  if (!filters || filters.length === 0) return null;

  return (
    <div 
      className={cn("flex flex-wrap items-center gap-2 pt-2 text-xs", className)}
      role="region"
      aria-label="Active filters summary"
    >
      {/* Active filter count badge */}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-admin-accent-dim text-admin-accent-text font-semibold border border-admin-accent/20 shrink-0">
        <Filter size={11} className="shrink-0" />
        <span>{filters.length} {filters.length === 1 ? 'filter active' : 'filters active'}</span>
      </span>

      {/* Individual filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map((filter) => (
          <span
            key={filter.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-admin-bg-subtle text-admin-text-primary border border-admin-border font-medium"
          >
            <span className="text-admin-text-muted">{filter.label}:</span>
            <span className="font-semibold">{filter.value}</span>
            {filter.onRemove && (
              <button
                type="button"
                onClick={filter.onRemove}
                className="ml-0.5 p-0.5 text-admin-text-muted hover:text-admin-danger hover:bg-admin-danger-dim/30 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-admin-danger"
                aria-label={`Remove filter ${filter.label}: ${filter.value}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Clear All button */}
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-admin-text-muted hover:text-admin-danger hover:bg-admin-danger-dim/20 transition-colors font-semibold ml-auto sm:ml-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-admin-danger"
      >
        <RotateCcw size={11} />
        <span>Clear all</span>
      </button>
    </div>
  );
}
