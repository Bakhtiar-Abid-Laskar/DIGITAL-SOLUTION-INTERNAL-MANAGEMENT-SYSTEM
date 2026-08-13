import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onDismiss: (id: string) => void;
}

const variants = {
  success: 'bg-admin-completed-bg border-admin-completed-fg/20 text-admin-completed-fg',
  error: 'bg-admin-urgent-bg border-admin-urgent-fg/20 text-admin-urgent-fg',
  info: 'bg-admin-progress-bg border-admin-progress-fg/20 text-admin-progress-fg',
};

const icons = {
  success: <CheckCircle size={20} />,
  error: <AlertCircle size={20} />,
  info: <Info size={20} />
};

export function Toast({ id, message, type = 'info', onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 4000); // 4s auto-dismiss

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 p-4 rounded-xl border shadow-modal animate-scale-in max-w-sm w-full pointer-events-auto",
      variants[type]
    )}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button 
        onClick={() => onDismiss(id)}
        className="text-current opacity-70 hover:opacity-100 transition-opacity p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
