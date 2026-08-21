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
      className={cn("p-4 flex flex-wrap gap-4 items-center justify-between bg-admin-bg-surface border border-admin-border rounded-lg shadow-xs", className)} 
      {...props}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
        {hasSearch && (
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted" size={16} />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
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
