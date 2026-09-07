import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, Menu } from 'lucide-react';

interface CoursePlayerHeaderProps {
  courseTitle: string;
  courseSlug: string;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  hasFinalAssessment?: boolean;
  onToggleMobileSidebar?: () => void;
}

export const CoursePlayerHeader: React.FC<CoursePlayerHeaderProps> = ({
  courseTitle,
  courseSlug,
  progressPercentage,
  completedLessons,
  totalLessons,
  hasFinalAssessment,
  onToggleMobileSidebar,
}) => {
  const pct = Math.max(0, Math.min(100, Math.round(progressPercentage || 0)));

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="apex-container-wide flex h-16 items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            aria-label="Toggle course curriculum"
            className="-ml-1 shrink-0 cursor-pointer rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <Link
          to="/student/my-learning"
          aria-label="Back to My Learning"
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">My Learning</span>
        </Link>

        {/* Course identity — truncates rather than pushing the bar sideways */}
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
            Apex Academy
          </span>
          <h1 className="truncate text-[14px] font-bold leading-tight text-slate-900 sm:text-[15px]">
            {courseTitle}
          </h1>
        </div>

        {/* Progress: the header already received these props but never showed them */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <div className="text-right leading-tight">
            <div className="text-[13px] font-bold tabular-nums text-slate-900">{pct}%</div>
            <div className="text-[11px] tabular-nums text-slate-500">
              {completedLessons}/{totalLessons} lessons
            </div>
          </div>
          <div
            className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Course progress"
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {pct === 100 && hasFinalAssessment && (
          <span className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 lg:inline-flex">
            <Award className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            Final assessment unlocked
          </span>
        )}

        <Link
          to={`/courses/${courseSlug}`}
          aria-label="Course overview"
          title="Course overview"
          className="hidden shrink-0 cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 sm:inline-flex"
        >
          <BookOpen className="h-4 w-4" />
        </Link>
      </div>

      {/* Mobile progress rail: the numeric block is hidden below md */}
      <div className="h-1 w-full bg-slate-100 md:hidden">
        <div
          className="h-full bg-linear-to-r from-indigo-500 to-violet-500 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </header>
  );
};
