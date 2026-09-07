import React from 'react';
import { Card } from './Card';
import { Input } from './Input';
import { Button } from './Button';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SearchFilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  onClearFilters?: () => void;
  showClearButton?: boolean;
  className?: string;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  children,
  actions,
  onClearFilters,
  showClearButton = false,
  className,
  ...props
}: SearchFilterBarProps) {
  const hasSearch = typeof searchQuery === 'string' && typeof onSearchChange === 'function';

  return (
    <Card 
      noAccentLine 
      className={cn("p-4 flex flex-wrap gap-4 items-center justify-between bg-admin-bg-surface border border-admin-border rounded-lg shadow-xs shrink-0", className)} 
      {...props}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
        {hasSearch && (
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted pointer-events-none" size={16} />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-8 h-10 text-sm"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  if (onClearFilters) onClearFilters();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-admin-text-muted hover:text-admin-text-primary p-1 rounded-md hover:bg-admin-bg-hover transition-colors cursor-pointer"
                aria-label="Clear search"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
        {children}
        {showClearButton && onClearFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters} 
            leftIcon={<X size={14} />}
            className="h-10 text-admin-text-secondary hover:text-admin-text-primary"
          >
            Clear Filters
          </Button>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </Card>
  );
}
