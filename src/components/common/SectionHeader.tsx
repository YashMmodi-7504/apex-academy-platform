import React from 'react';

interface SectionHeaderProps {
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right-aligned action (e.g. a "View all" link) — desktop only alignment. */
  action?: React.ReactNode;
  align?: 'left' | 'center';
  /** Use on dark backgrounds. */
  tone?: 'light' | 'dark';
  className?: string;
  as?: 'h2' | 'h3';
}

/**
 * Consistent section heading block, giving every page the same vertical rhythm
 * and hierarchy instead of ad-hoc heading markup per page.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  tone = 'light',
  className = '',
  as: Heading = 'h2',
}) => {
  const centered = align === 'center';
  const titleColor = tone === 'dark' ? 'text-white' : 'text-slate-900';
  const descColor = tone === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const eyebrowColor = tone === 'dark' ? 'text-indigo-300' : 'text-indigo-600';

  return (
    <div
      className={`flex flex-col gap-5 sm:flex-row sm:items-end ${centered ? 'sm:justify-center' : 'sm:justify-between'} ${className}`}
    >
      <div className={`${centered ? 'text-center mx-auto max-w-2xl' : 'max-w-2xl'}`}>
        {eyebrow && (
          <div className={`text-[11px] font-bold uppercase tracking-[0.12em] mb-2.5 ${eyebrowColor}`}>
            {eyebrow}
          </div>
        )}
        <Heading
          className={`font-semibold tracking-tight ${titleColor} ${
            Heading === 'h2' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
          }`}
        >
          {title}
        </Heading>
        {description && (
          <p className={`mt-3 text-sm sm:text-base leading-relaxed ${descColor}`}>{description}</p>
        )}
      </div>
      {action && !centered && <div className="shrink-0">{action}</div>}
    </div>
  );
};
