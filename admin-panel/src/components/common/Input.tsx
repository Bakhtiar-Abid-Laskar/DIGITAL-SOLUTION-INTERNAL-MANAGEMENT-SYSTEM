import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-label={props['aria-label'] || props.placeholder || props.name || "Input field"}
        className={cn(
          "flex h-12 w-full rounded-md border bg-white px-3 py-2 text-sm text-admin-text-primary file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-admin-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error ? "border-admin-danger focus-visible:ring-admin-danger" : "border-admin-border focus-visible:border-admin-accent",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
