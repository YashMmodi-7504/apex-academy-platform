import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Code2,
  BookMarked,
  Award,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatLessonDuration } from '../../utils/duration.ts';

interface LessonItem {
  id: string;
  title: string;
  lesson_type: string;
  duration_seconds?: number;
  display_order: number;
  is_preview?: boolean;
  is_required?: boolean;
}

interface ModuleItem {
  id: string;
  title: string;
  display_order: number;
  lessons: LessonItem[];
  assessmentUnlocked?: boolean;
  assessmentPassed?: boolean;
  isCompleted?: boolean;
}

interface CurriculumSidebarProps {
  modules: ModuleItem[];
  currentLessonId?: string;
  progressMap: Record<string, { status: string; watch_percentage?: number }>;
  onSelectLesson: (lessonId: string) => void;
  onOpenModuleAssessment?: (moduleId: string, moduleTitle: string) => void;
  onOpenFinalAssessment?: () => void;
  hasFinalAssessment?: boolean;
  overallProgressPercentage: number;
}

const LESSON_TYPE_ICON: Record<string, { icon: React.ElementType; className: string }> = {
  VIDEO: { icon: PlayCircle, className: 'text-indigo-500' },
  ARTICLE: { icon: FileText, className: 'text-emerald-500' },
  PRACTICAL: { icon: Code2, className: 'text-amber-500' },
};

const MODULES_PER_PAGE = 3;

export const CurriculumSidebar: React.FC<CurriculumSidebarProps> = ({
  modules,
  currentLessonId,
  progressMap,
  onSelectLesson,
  onOpenModuleAssessment,
  onOpenFinalAssessment,
  hasFinalAssessment,
  overallProgressPercentage,
}) => {
  // Modules default to expanded. Storing only explicit collapses means modules
  // that arrive after first render are still open, which a `{}` seeded from an
  // empty first render would not be.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);

  const toggleModule = (modId: string) =>
    setCollapsed((prev) => ({ ...prev, [modId]: !prev[modId] }));

  const totalPages = Math.max(1, Math.ceil(modules.length / MODULES_PER_PAGE));
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const pct = Math.max(0, Math.min(100, Math.round(overallProgressPercentage || 0)));

  // Keep the page in step with the lesson being played.
  React.useEffect(() => {
    if (!currentLessonId || modules.length === 0) return;
    const modIdx = modules.findIndex((m) => m.lessons?.some((l) => l.id === currentLessonId));
    if (modIdx !== -1) setCurrentPage(Math.floor(modIdx / MODULES_PER_PAGE) + 1);
  }, [currentLessonId, modules]);

  const visibleModules = modules.slice(
    (currentPage - 1) * MODULES_PER_PAGE,
    currentPage * MODULES_PER_PAGE
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-r border-slate-200 bg-white">
      {/* ---- Progress summary ---- */}
      <div className="shrink-0 border-b border-slate-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Course content</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {modules.length} {modules.length === 1 ? 'module' : 'modules'} · {totalLessons}{' '}
              {totalLessons === 1 ? 'lesson' : 'lessons'}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white">
            {pct}%
          </span>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall course progress"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ---- Modules ---- */}
      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {visibleModules.map((mod) => {
          const modIdx = modules.findIndex((m) => m.id === mod.id);
          const isExpanded = !collapsed[mod.id];
          const totalInMod = mod.lessons?.length || 0;
          const completedInMod = (mod.lessons || []).filter(
            (les) => progressMap[les.id]?.status === 'COMPLETED'
          ).length;
          const modPct = totalInMod > 0 ? Math.round((completedInMod / totalInMod) * 100) : 0;
          const modDone = totalInMod > 0 && completedInMod === totalInMod;

          return (
            <div key={mod.id} className="bg-white">
              <button
                onClick={() => toggleModule(mod.id)}
                aria-expanded={isExpanded}
                className="group flex w-full cursor-pointer items-start justify-between gap-2 p-3.5 text-left transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                    Module {modIdx + 1}
                  </span>
                  <h3 className="text-[13px] font-semibold leading-snug text-slate-800">
                    {mod.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${
                          modDone ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${modPct}%` }}
                      />
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold tabular-nums ${
                        modDone ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {completedInMod}/{totalInMod}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 pt-1 text-slate-500 transition-colors group-hover:text-slate-600">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {isExpanded && (
                <div className="divide-y divide-slate-100/80 border-t border-slate-100 bg-slate-50/60">
                  {mod.lessons?.map((lesson) => {
                    const isCurrent = lesson.id === currentLessonId;
                    const prog = progressMap[lesson.id];
                    const isCompleted = prog?.status === 'COMPLETED';
                    const isInProgress = prog?.status === 'IN_PROGRESS';
                    const typeMeta =
                      LESSON_TYPE_ICON[(lesson.lesson_type || '').toUpperCase()] || {
                        icon: BookMarked,
                        className: 'text-slate-500',
                      };
                    const TypeIcon = typeMeta.icon;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => onSelectLesson(lesson.id)}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={`flex w-full cursor-pointer items-start gap-2.5 border-l-[3px] px-3 py-2.5 text-left transition-colors ${
                          isCurrent
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-transparent hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <span className="shrink-0 pt-0.5">
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 fill-emerald-100 text-emerald-700" />
                          ) : isCurrent ? (
                            <PlayCircle className="h-4 w-4 fill-indigo-100 text-indigo-600" />
                          ) : isInProgress ? (
                            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-300" />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[12.5px] leading-snug ${
                              isCurrent
                                ? 'font-semibold text-indigo-900'
                                : isCompleted
                                  ? 'text-slate-500'
                                  : 'text-slate-800'
                            }`}
                          >
                            {lesson.title}
                          </span>
                          <span className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                            <TypeIcon className={`h-3 w-3 shrink-0 ${typeMeta.className}`} />
                            <span className="capitalize">
                              {(lesson.lesson_type || '').toLowerCase()}
                            </span>
                            {formatLessonDuration(lesson.duration_seconds) && (
                              <span>· {formatLessonDuration(lesson.duration_seconds)}</span>
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}

                  {onOpenModuleAssessment &&
                    (() => {
                      const isUnlocked = Boolean(mod.assessmentUnlocked || modDone);
                      const disabled = !isUnlocked && !mod.assessmentPassed;
                      return (
                        <div className="p-3">
                          <button
                            onClick={() =>
                              isUnlocked && onOpenModuleAssessment(mod.id, mod.title)
                            }
                            disabled={disabled}
                            className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-bold transition-colors ${
                              mod.assessmentPassed
                                ? 'cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/70'
                                : isUnlocked
                                  ? 'cursor-pointer border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                                  : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {mod.assessmentPassed ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                              ) : isUnlocked ? (
                                <Award className="h-4 w-4 shrink-0" />
                              ) : (
                                <Lock className="h-4 w-4 shrink-0" />
                              )}
                              <span>Module assessment</span>
                            </span>
                            <span className="shrink-0 text-[10px] font-bold">
                              {mod.assessmentPassed
                                ? 'Passed'
                                : isUnlocked
                                  ? 'Start'
                                  : 'Locked'}
                            </span>
                          </button>
                          {!isUnlocked && !mod.assessmentPassed && (
                            <p className="mt-1.5 px-0.5 text-[10.5px] leading-snug text-slate-500">
                              Complete all {totalInMod} lessons in this module to unlock.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                </div>
              )}
            </div>
          );
        })}

        {/* ---- Final assessment: only when the course actually has one ---- */}
        {hasFinalAssessment && (
          <div className="border-t border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="text-[12px] font-bold uppercase tracking-wider text-amber-900">
                Final assessment
              </span>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-slate-600">
              A comprehensive exam covering all {modules.length}{' '}
              {modules.length === 1 ? 'module' : 'modules'} of this course.
            </p>
            {onOpenFinalAssessment && (
              <button
                onClick={onOpenFinalAssessment}
                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-amber-500"
              >
                <Award className="h-4 w-4 shrink-0" />
                <span>Take final assessment</span>
              </button>
            )}
          </div>
        )}

        {/* ---- Module paging ---- */}
        {totalPages > 1 && (
          <div className="sticky bottom-0 flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 p-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous modules"
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
              Prev
            </button>
            <span className="text-[11px] font-semibold tabular-nums text-slate-500">
              {(currentPage - 1) * MODULES_PER_PAGE + 1}–
              {Math.min(currentPage * MODULES_PER_PAGE, modules.length)} of {modules.length}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next modules"
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
