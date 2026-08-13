import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Toast } from '../components/common/Toast';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastOptions, setToastOptions] = useState<ToastOptions | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showToast = useCallback((options: ToastOptions) => {
    setToastOptions(options);
    setIsVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setIsVisible(false);
  }, []);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toastOptions && (
        <Toast
          visible={isVisible}
          title={toastOptions.title}
          message={toastOptions.message}
          type={toastOptions.type || 'info'}
          onHide={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
