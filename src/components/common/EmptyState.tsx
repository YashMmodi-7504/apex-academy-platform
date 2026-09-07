import React from 'react';

interface EmptyStateProps {
  /** Lucide icon element, e.g. <BookOpen className="w-6 h-6" /> */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Optional CTA — only pass one when the destination route actually exists. */
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Consistent empty state used in place of bare "No data found" text.
 * Explains what will appear here and offers the next step.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  size = 'md',
}) => {
  const pad = size === 'sm' ? 'py-10 px-6' : 'py-16 px-6';

  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center ${pad} ${className}`}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-slate-500 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
