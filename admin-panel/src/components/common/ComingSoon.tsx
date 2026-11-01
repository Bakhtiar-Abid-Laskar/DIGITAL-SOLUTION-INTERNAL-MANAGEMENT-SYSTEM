import React, { ReactNode } from 'react';
import { Clock } from 'lucide-react';

interface ComingSoonProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
}

export function ComingSoon({
  title = 'Coming Soon',
  description = 'The Salary section will be available soon.',
  icon,
}: ComingSoonProps) {
  return (
    <div className="w-full max-w-md mx-auto my-auto p-8 rounded-2xl bg-admin-surface border border-admin-border shadow-card flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-2xl bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center text-admin-accent mb-5 shadow-inner">
        {icon || <Clock className="w-8 h-8 text-admin-accent" />}
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-admin-text-primary mb-2 tracking-tight">
        {title}
      </h2>
      <p className="text-sm md:text-base text-admin-text-secondary leading-relaxed max-w-sm">
        {description}
      </p>
    </div>
  );
}
