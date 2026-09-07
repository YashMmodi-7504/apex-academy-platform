import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned actions. Wraps below the title on small screens. */
  actions?: React.ReactNode;
  /** Optional status chip rendered next to the title. */
  meta?: React.ReactNode;
}

/**
 * One heading treatment for every admin screen, so page titles, descriptions
 * and primary actions sit at the same rhythm across the console.
 */
export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  actions,
  meta,
}) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {meta}
      </div>
      {description && (
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-slate-500">{description}</p>
      )}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
