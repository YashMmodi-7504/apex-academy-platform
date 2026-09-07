import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  /** Leading icon. Rendered before the label, never wraps. */
  icon?: React.ReactNode;
  /** Trailing icon (e.g. a chevron). Nudges right on hover. */
  iconRight?: React.ReactNode;
  /** Stretch to the container width — useful for mobile CTAs. */
  fullWidth?: boolean;
  /** Replaces content with a spinner and disables interaction. */
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  iconRight,
  fullWidth = false,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'group relative inline-flex items-center justify-center font-semibold rounded-lg cursor-pointer ' +
    'transition-all duration-150 ease-out select-none ' +
    'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
    'active:translate-y-px';

  // Consistent heights so buttons align when placed side by side.
  const sizeStyles = {
    sm: 'h-9 px-3.5 text-xs gap-1.5',
    md: 'h-11 px-5 text-sm gap-2',
    lg: 'h-13 px-7 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs hover:shadow-md',
    secondary: 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-xs hover:shadow-md',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-800',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-xs hover:shadow-md',
    success: 'bg-emerald-700 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs hover:shadow-md',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="w-4 h-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      )}
      {!loading && icon && <span className="shrink-0 inline-flex items-center">{icon}</span>}

      {/*
        The label wrapper is inline-flex so a trailing <svg> stays on the SAME
        horizontal line as the text. Tailwind preflight sets svg{display:block},
        which inside a plain inline span pushes the icon onto its own line —
        producing "Explore Course" with the arrow beneath it. As flex items both
        the text node and the icon lay out in a row and stay vertically centred.
      */}
      <span className="inline-flex items-center gap-2 min-w-0">{children}</span>

      {!loading && iconRight && (
        <span className="shrink-0 inline-flex items-center apex-cta-arrow">{iconRight}</span>
      )}
    </button>
  );
};
