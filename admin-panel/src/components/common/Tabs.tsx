import React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  return (
    <div className={cn("bg-admin-bg-surface px-4 pt-4 rounded-t-xl border-b border-admin-border flex overflow-x-auto hide-scrollbar", className)}>
      <div className="flex gap-6">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent rounded-t-sm",
                isActive 
                  ? "border-admin-accent text-admin-accent" 
                  : "border-transparent text-admin-text-secondary hover:text-admin-text-primary hover:border-admin-border"
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
