import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

/**
 * ConfirmationModal Component
 *
 * NOTE: Animation classes `animate-fade-in` and `animate-scale-in` rely on global
 * CSS keyframes defined in `globals.css`. Ensure those keyframes remain intact.
 */
interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmationModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Initial focus
    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1]?.focus(); // Focus primary action (usually last)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in">
      <dialog 
        ref={modalRef as any}
        open
        aria-labelledby="modal-title"
        className="bg-admin-bg-surface border border-admin-border rounded-xl max-w-sm w-full p-6 animate-scale-in m-auto relative top-1/2 -translate-y-1/2 backdrop:bg-admin-bg-dark/80 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${isDestructive ? 'bg-admin-danger/10 text-admin-danger' : 'bg-admin-accent/10 text-admin-accent'}`}>
            <AlertTriangle size={24} />
          </div>
          <h3 id="modal-title" className="text-lg font-semibold text-admin-text-primary">{title}</h3>
        </div>
        <p className="text-admin-text-secondary text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>{cancelText}</Button>
          <Button variant={isDestructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
