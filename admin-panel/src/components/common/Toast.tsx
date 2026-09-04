import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  onDismiss: (id: string) => void;
}

const variants = {
  success: 'bg-admin-bg-surface border-admin-completed-fg/30 text-admin-text-primary shadow-modal dark:bg-admin-bg-subtle',
  error: 'bg-admin-bg-surface border-admin-urgent-fg/30 text-admin-text-primary shadow-modal dark:bg-admin-bg-subtle',
  info: 'bg-admin-bg-surface border-admin-accent/30 text-admin-text-primary shadow-modal dark:bg-admin-bg-subtle',
};

const iconWrappers = {
  success: 'bg-admin-completed-bg text-admin-completed-fg p-2 rounded-xl shrink-0',
  error: 'bg-admin-urgent-bg text-admin-urgent-fg p-2 rounded-xl shrink-0',
  info: 'bg-admin-accent-dim text-admin-accent p-2 rounded-xl shrink-0',
};

const icons = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />
};

export function Toast({ id, title, message, type = 'info', action, onDismiss }: ToastProps) {
  useEffect(() => {
    // 5s duration for standard, 7s for actionable popups
    const duration = action ? 7000 : 4500;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, action, onDismiss]);

  return (
    <div className={cn(
      "flex items-start justify-between gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-modal animate-scale-in max-w-sm sm:max-w-md w-full pointer-events-auto transition-all",
      variants[type]
    )}>
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className={iconWrappers[type]}>
          {icons[type]}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          {title && (
            <p className="text-sm font-semibold text-admin-text-primary leading-tight line-clamp-1">
              {title}
            </p>
          )}
          <p className={cn(
            "text-sm text-admin-text-secondary leading-snug break-words",
            title ? "text-xs mt-1 text-admin-text-muted line-clamp-2" : "font-medium"
          )}>
            {message}
          </p>

          {action && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                onDismiss(id);
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-admin-accent-text hover:text-admin-accent-text-hover transition-colors py-0.5 focus-visible:outline-none focus-visible:underline"
            >
              <span>{action.label}</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
      <button 
        onClick={() => onDismiss(id)}
        className="text-admin-text-muted hover:text-admin-text-primary transition-colors p-1 rounded-lg hover:bg-admin-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent shrink-0"
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
}

