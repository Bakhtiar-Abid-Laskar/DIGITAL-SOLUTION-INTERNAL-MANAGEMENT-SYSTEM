import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants = {
  primary: "bg-admin-accent text-white hover:bg-admin-accent-dark shadow-xs",
  secondary: "bg-admin-bg-subtle text-admin-text-primary hover:bg-admin-border border border-admin-border shadow-xs",
  outline: "border border-admin-border bg-admin-bg-surface hover:bg-admin-bg-subtle text-admin-text-primary shadow-xs",
  ghost: "bg-transparent hover:bg-admin-bg-subtle text-admin-text-secondary hover:text-admin-text-primary",
  danger: "bg-admin-urgent-bg text-admin-urgent-fg hover:bg-admin-urgent-bg/80 border border-admin-urgent-fg/20 shadow-xs"
};

const sizes = {
  sm: "h-8 px-3 text-xs font-medium rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm font-medium rounded-lg gap-2",
  lg: "h-12 px-6 text-base font-medium rounded-xl gap-2.5",
  icon: "h-10 w-10 justify-center p-0 rounded-lg"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 ease-out active:scale-[0.98] select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";
