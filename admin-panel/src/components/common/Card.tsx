import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noAccentLine?: boolean;
}

export function Card({ children, className, noAccentLine = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-admin-bg-surface border border-admin-border rounded-lg relative overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("p-4 border-b border-admin-border", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: CardProps) {
  return (
    <h2 className={cn("text-lg font-bold text-admin-text-primary tracking-tight", className)} {...props}>
      {children}
    </h2>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("p-4", className)} {...props}>
      {children}
    </div>
  );
}
