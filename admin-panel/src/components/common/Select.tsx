import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          aria-label={props['aria-label'] || props.name || "Select field"}
          className={cn(
            "flex h-12 w-full appearance-none rounded-md border bg-white px-3 py-2 pr-10 text-sm text-admin-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            error ? "border-admin-danger focus-visible:ring-admin-danger" : "border-admin-border focus-visible:border-admin-accent",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-4 w-4 text-admin-text-muted" />
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";
