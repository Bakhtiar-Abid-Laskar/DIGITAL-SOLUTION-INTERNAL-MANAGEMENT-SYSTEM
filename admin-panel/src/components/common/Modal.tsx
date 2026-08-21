"use client";

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  closeOnOutsideClick?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl'
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  closeOnOutsideClick = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

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
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (closeOnOutsideClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "bg-admin-bg-surface border border-admin-border sm:rounded-xl rounded-t-2xl shadow-modal w-full overflow-hidden flex flex-col max-h-[90vh] animate-scale-in relative",
          sizeClasses[size],
          className
        )}
      >
        {(title || description) && (
          <div className="p-5 border-b border-admin-border flex items-start justify-between gap-4 bg-admin-bg-subtle/50">
            <div>
              {typeof title === 'string' ? (
                <h3 className="text-lg font-bold text-admin-text-primary tracking-tight">{title}</h3>
              ) : (
                title
              )}
              {description && (
                <p className="text-xs text-admin-text-secondary mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-admin-text-muted hover:text-admin-text-primary p-1.5 rounded-lg hover:bg-admin-bg-hover transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>

        {footer && (
          <div className="p-4 border-t border-admin-border bg-admin-bg-subtle/50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
