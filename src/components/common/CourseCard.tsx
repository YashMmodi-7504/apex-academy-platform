import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Award, PlayCircle, ArrowRight, Layers } from 'lucide-react';

export interface CourseCardCourse {
  id?: string;
  title: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  difficulty?: string | null;
  duration_minutes?: number | null;
  is_free?: boolean | null;
  certificate_enabled?: boolean | null;
  category?: { name?: string; slug?: string } | null;
  /** Present on domain learning-path responses. */
  module_count?: number | null;
}

interface CourseCardProps {
  course: CourseCardCourse;
  /** Real lesson count when the caller has it. Omitted rather than guessed. */
  lessonCount?: number | null;
  /** 0-100. Renders a progress strip when provided. */
  progressPercentage?: number | null;
  /** CTA label. Kept configurable so callers keep their existing wording. */
  ctaLabel?: string;
  /** Route override; defaults to the public course detail page. */
  to?: string;
  className?: string;
}

const DIFFICULTY_TONE: Record<string, string> = {
  BEGINNER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INTERMEDIATE: 'bg-amber-50 text-amber-700 border-amber-200',
  ADVANCED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const formatDuration = (mins?: number | null): string | null => {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${h}h ${m}m`;
};

/**
 * The single course card used across the catalogue, domain pages and search.
 * Equal-height by design so grids align; CTA is always one horizontal line.
 */
export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  lessonCount,
  progressPercentage,
  ctaLabel = 'View Course',
  to,
  className = '',
}) => {
  const href = to || `/courses/${course.slug}`;
  const blurb = course.short_description || course.description || null;
  const difficulty = (course.difficulty || '').toUpperCase();
  const duration = formatDuration(course.duration_minutes);
  const hasProgress = typeof progressPercentage === 'number' && progressPercentage >= 0;

  return (
    <Link
      to={href}
      className={`group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5
                  transition-all duration-200 ease-out
                  hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${className}`}
    >
      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2">
        {course.is_free ? (
          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            Free
          </span>
        ) : (
          <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
            Premium
          </span>
        )}
        {course.category?.name && (
          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {course.category.name}
          </span>
        )}
      </div>

      {/* Title + blurb */}
      <h3 className="mt-3.5 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700">
        {course.title}
      </h3>
      {blurb && (
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-slate-600">{blurb}</p>
      )}

      {/* Metadata — only what the API actually returned */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-500">
        {difficulty && (
          <span
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              DIFFICULTY_TONE[difficulty] || 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {difficulty}
          </span>
        )}
        {typeof course.module_count === 'number' && course.module_count > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            {course.module_count} Modules
          </span>
        )}
        {typeof lessonCount === 'number' && lessonCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <PlayCircle className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            {lessonCount} Lessons
          </span>
        )}
        {duration && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            {duration}
          </span>
        )}
        {course.certificate_enabled && (
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <Award className="h-3.5 w-3.5 shrink-0" />
            Certificate
          </span>
        )}
      </div>

      {/* Progress — only when the caller supplies a real value */}
      {hasProgress && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500">Progress</span>
            <span className="text-indigo-600">{Math.round(progressPercentage!)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar__fill"
              style={{ width: `${Math.min(100, Math.max(0, progressPercentage!))}%` }}
            />
          </div>
        </div>
      )}

      {/* CTA pinned to the bottom so cards in a row align */}
      <div className="mt-auto pt-5">
        <span
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg
                     bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs
                     transition-all duration-150 group-hover:bg-indigo-700 group-hover:shadow-md"
        >
          {ctaLabel}
          <ArrowRight className="apex-cta-arrow h-3.5 w-3.5 shrink-0" />
        </span>
      </div>
    </Link>
  );
};

/** Responsive grid wrapper so every catalogue uses identical columns/gaps. */
export const CourseGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${className}`}>{children}</div>
);

export { BookOpen };
