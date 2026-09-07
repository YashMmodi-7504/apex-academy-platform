import React from 'react';

/**
 * Hue variants name a colour; semantic variants name a meaning.
 * Both are supported because call sites use each — several admin pages were
 * already passing `success` / `warning` / `danger`, which previously resolved
 * to `undefined` and rendered an unstyled badge.
 */
type BadgeVariant =
  | 'blue'
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'purple'
  | 'red'
  | 'gray'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'primary'
  | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  /** Leading dot, useful for status columns in dense tables. */
  dot?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
  outline: 'bg-transparent text-slate-700 border-slate-300',
  // Semantic aliases
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

const DOT_STYLES: Record<BadgeVariant, string> = {
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  red: 'bg-red-500',
  gray: 'bg-slate-400',
  outline: 'bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  primary: 'bg-indigo-500',
  neutral: 'bg-slate-400',
};

const SIZE_STYLES = {
  sm: 'px-2 py-0.5 text-[11px] font-semibold',
  md: 'px-2.5 py-1 text-xs font-semibold',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  // Unknown variants fall back to neutral rather than rendering unstyled.
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-md border ${SIZE_STYLES[size]} ${styles} ${className}`}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_STYLES[variant] || DOT_STYLES.neutral}`}
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
};
