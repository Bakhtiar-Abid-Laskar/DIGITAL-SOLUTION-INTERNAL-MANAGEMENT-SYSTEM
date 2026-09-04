"use client";

import React from "react";
import { Printer, CheckCircle2 } from "lucide-react";

export interface PrintProgressState {
  isOpen: boolean;
  percent: number;
  message: string;
  isComplete?: boolean;
}

interface PrintProgressModalProps {
  state: PrintProgressState | null;
  onClose?: () => void;
}

export function PrintProgressModal({ state, onClose }: PrintProgressModalProps) {
  if (!state || !state.isOpen) return null;

  const percent = Math.min(100, Math.max(0, state.percent));
  const isComplete = percent >= 100 || state.isComplete;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4" 
      style={{ background: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'blur(6px)' }}
    >
      <div 
        className="rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-scale-in"
        style={{ 
          background: 'var(--admin-surface, #1e2030)', 
          border: '1px solid rgba(255, 255, 255, 0.1)' 
        }}
      >
        {/* Header with Icon */}
        <div className="flex items-center gap-3.5">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
            style={{ 
              background: isComplete ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              border: isComplete ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)'
            }}
          >
            {isComplete ? (
              <CheckCircle2 size={20} className="text-emerald-400" />
            ) : (
              <Printer size={20} className="text-indigo-400 animate-pulse" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-base tracking-tight">
              {isComplete ? 'Invoice Ready' : 'Generating Invoice'}
            </h3>
            <p className="text-xs text-white/50 truncate mt-0.5">
              {isComplete ? 'Opening print preview...' : 'Please wait while the document is prepared.'}
            </p>
          </div>
        </div>

        {/* Dynamic Progress Bar & Percent Indicator */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-white/70 truncate mr-2">
              {state.message || 'Processing document...'}
            </span>
            <span className="font-bold text-white text-xs font-mono tracking-tight shrink-0">
              {percent}%
            </span>
          </div>

          <div 
            className="h-2 rounded-full overflow-hidden p-0.5"
            style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${percent}%`,
                background: isComplete 
                  ? 'linear-gradient(90deg, #10b981, #22c55e)' 
                  : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                boxShadow: isComplete 
                  ? '0 0 12px rgba(34, 197, 94, 0.4)' 
                  : '0 0 12px rgba(99, 102, 241, 0.4)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
