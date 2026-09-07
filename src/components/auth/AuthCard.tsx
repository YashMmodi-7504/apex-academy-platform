import React, { useState } from 'react';
import { GraduationCap, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '../common/Input.tsx';

/** Shared shell for sign in, register and password reset. */
export const AuthCard: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}> = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-[75vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-700 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{subtitle}</p>
        </div>

        <div className="mt-6 space-y-4">{children}</div>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-[13px] text-slate-500">
          {footer}
        </div>
      </div>
    </div>
  </div>
);

export const AuthError: React.FC<{ message: string }> = ({ message }) => (
  <div
    role="alert"
    className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-[13px] text-red-800"
  >
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
    <span>{message}</span>
  </div>
);

export const AuthSuccess: React.FC<{ message: string }> = ({ message }) => (
  <div
    role="status"
    className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-[13px] text-emerald-800"
  >
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
    <span>{message}</span>
  </div>
);

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  error?: string;
  autoComplete?: string;
}

/**
 * Password field with its own reveal toggle. The toggle is positioned against
 * the field row rather than a fixed offset from the card, so it stays aligned
 * when a helper or error message is present.
 */
export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  value,
  onChange,
  disabled,
  placeholder = '••••••••',
  helperText,
  error,
  autoComplete,
}) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        label={label}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-11"
        required
        disabled={disabled}
        helperText={helperText}
        error={error}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute right-2 top-[27px] cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};
