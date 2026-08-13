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
  primary: "bg-admin-accent text-white hover:bg-admin-accent-dark shadow-sm",
  secondary: "bg-admin-bg-subtle text-admin-text-primary hover:bg-admin-border shadow-sm",
  outline: "border border-admin-border bg-transparent hover:bg-admin-bg-subtle text-admin-text-primary",
  ghost: "bg-transparent hover:bg-admin-bg-subtle text-admin-text-primary",
  danger: "bg-admin-urgent-bg text-admin-urgent-fg hover:bg-admin-urgent-bg/80 border border-admin-urgent-fg/20 shadow-sm"
};

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 py-2 text-base",
  lg: "h-14 px-8 text-lg",
  icon: "h-12 w-12 justify-center p-0"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";
