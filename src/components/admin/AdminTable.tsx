import React from 'react';

/**
 * Shared chrome for the admin data tables: a toolbar row, a horizontally
 * scrollable table region (so wide tables scroll inside the card instead of
 * pushing the page sideways) and an optional footer.
 */
export const AdminTableCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs ${className}`}
  >
    {children}
  </div>
);

export const AdminTableToolbar: React.FC<{
  /** Search input or filters. */
  children?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ children, actions }) => (
  <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="w-full sm:max-w-sm">{children}</div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const AdminTableScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full overflow-x-auto">{children}</div>
);

export const AdminTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
);

export const AdminTh: React.FC<{
  children?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}> = ({ children, align = 'left', className = '' }) => (
  <th
    scope="col"
    className={`whitespace-nowrap px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 ${
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
    } ${className}`}
  >
    {children}
  </th>
);

export const AdminThead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="border-b border-slate-200 bg-slate-50">{children}</thead>
);

export const AdminTbody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
);

export const AdminTr: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className="transition-colors hover:bg-slate-50/80">{children}</tr>
);

export const AdminTd: React.FC<{
  children?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  colSpan?: number;
}> = ({ children, align = 'left', className = '', colSpan }) => (
  <td
    colSpan={colSpan}
    className={`px-5 py-4 align-middle ${
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
    } ${className}`}
  >
    {children}
  </td>
);

export const AdminTableFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
    {children}
  </div>
);

/** Small square icon button used in table action columns. */
export const AdminIconButton: React.FC<{
  label: string;
  onClick?: () => void;
  tone?: 'indigo' | 'blue' | 'emerald' | 'amber' | 'red';
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ label, onClick, tone = 'indigo', children, disabled }) => {
  const tones = {
    indigo: 'hover:bg-indigo-50 hover:text-indigo-600',
    blue: 'hover:bg-blue-50 hover:text-blue-600',
    emerald: 'hover:bg-emerald-50 hover:text-emerald-700',
    amber: 'hover:bg-amber-50 hover:text-amber-600',
    red: 'hover:bg-red-50 hover:text-red-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
};
