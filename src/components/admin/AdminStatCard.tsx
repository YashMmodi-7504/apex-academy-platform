import React from 'react';

type Tone = 'indigo' | 'emerald' | 'amber' | 'blue' | 'purple' | 'slate';

const TONES: Record<Tone, { chip: string; value: string }> = {
  indigo: { chip: 'bg-indigo-50 text-indigo-600 border-indigo-100', value: 'text-slate-900' },
  emerald: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-100', value: 'text-slate-900' },
  amber: { chip: 'bg-amber-50 text-amber-600 border-amber-100', value: 'text-slate-900' },
  blue: { chip: 'bg-blue-50 text-blue-600 border-blue-100', value: 'text-slate-900' },
  purple: { chip: 'bg-purple-50 text-purple-600 border-purple-100', value: 'text-slate-900' },
  slate: { chip: 'bg-slate-100 text-slate-500 border-slate-200', value: 'text-slate-900' },
};

interface AdminStatCardProps {
  label: string;
  /**
   * Pass a number/string only when it is a real, derived value.
   * Omit it to render the "not yet wired to live data" em dash — never invent a figure.
   */
  value?: React.ReactNode;
  icon: React.ReactNode;
  tone?: Tone;
  hint?: string;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  icon,
  tone = 'indigo',
  hint,
}) => {
  const t = TONES[tone];
  const unset = value === undefined || value === null || value === '';

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <p
          className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${unset ? 'text-slate-300' : t.value}`}
        >
          {unset ? '—' : value}
        </p>
        {hint && <p className="mt-1 truncate text-[11px] text-slate-500">{hint}</p>}
      </div>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${t.chip}`}
      >
        {icon}
      </div>
    </div>
  );
};
