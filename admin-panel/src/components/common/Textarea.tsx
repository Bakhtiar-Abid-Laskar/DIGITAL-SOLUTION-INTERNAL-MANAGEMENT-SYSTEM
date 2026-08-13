import React from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm text-admin-text-primary placeholder:text-admin-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error ? "border-admin-danger focus-visible:ring-admin-danger" : "border-admin-border focus-visible:border-admin-accent",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
