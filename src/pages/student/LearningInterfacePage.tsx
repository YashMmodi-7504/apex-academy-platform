import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { getAuthTokenAsync } from '../../lib/supabaseClient.ts';
import { Button } from '../../components/common/Button.tsx';
import { CoursePlayerHeader } from '../../components/learning/CoursePlayerHeader.tsx';
import { CurriculumSidebar } from '../../components/learning/CurriculumSidebar.tsx';
import { LessonRenderer } from '../../components/learning/LessonRenderer.tsx';
import { ModuleAssessmentModal } from '../../components/learning/ModuleAssessmentModal.tsx';
import { FinalAssessmentModal } from '../../components/learning/FinalAssessmentModal.tsx';
import {
  fetchCourseLearningOverview,
  fetchLessonContent,
  updateLessonProgress,
  completeLesson,
  enrollInCourse
} from '../../services/api.ts';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  BookOpen,
  ArrowRight,
  X,
} from 'lucide-react';

export const LearningInterfacePage: React.FC = () => {
  const { courseSlug, courseId, lessonId: urlLessonId } = useParams();
  const slugOrId = courseSlug || courseId || 'python-programming-fundamentals';
  const navigate = useNavigate();
  const { session, isAuthenticated } = useAuth();

  const [overview, setOverview] = useState<any | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(urlLessonId || null);
  const [lessonData, setLessonData] = useState<any | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingLesson, setLoadingLesson] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [notEnrolled, setNotEnrolled] = useState<boolean>(false);
  const [enrolling, setEnrolling] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [activeAssessmentModule, setActiveAssessmentModule] = useState<{ id: string; title: string } | null>(null);
  const [finalAssessmentOpen, setFinalAssessmentOpen] = useState<boolean>(false);

  const handleOpenModuleAssessment = (modId: string, modTitle: string) => {
    setActiveAssessmentModule({ id: modId, title: modTitle });
  };

  const handleOpenFinalAssessment = () => {
    setFinalAssessmentOpen(true);
  };

  const token = session?.access_token;

  // 1. Fetch Course Overview & Curriculum
  const loadOverview = useCallback(async (silent = false) => {
    const activeToken = token || (await getAuthTokenAsync());
    if (!activeToken) return;
    if (!silent) setLoadingOverview(true);
    setNotEnrolled(false);

    const res = await fetchCourseLearningOverview(slugOrId, activeToken);

    if (res.notEnrolled) {
      setNotEnrolled(true);
      setOverview(null);
      setLoadingOverview(false);
      return;
    }

    if (res.success) {
      setOverview(res);
      setNotEnrolled(false);

      let targetLessonId = urlLessonId || currentLessonId || res.enrollment?.last_accessed_lesson_id;

      // If last_accessed_lesson_id is not set, pick the first lesson of first module
      if (!targetLessonId && res.modules && res.modules.length > 0) {
        const firstMod = res.modules[0];
        if (firstMod.lessons && firstMod.lessons.length > 0) {
          targetLessonId = firstMod.lessons[0].id;
        }
      }

      if (targetLessonId && targetLessonId !== currentLessonId) {
        setCurrentLessonId(targetLessonId);
      }

      // Ensure browser URL reflects canonical route /learn/:courseSlug/lesson/:lessonId
      if (res.course?.slug && targetLessonId) {
        const canonicalUrl = `/learn/${res.course.slug}/lesson/${targetLessonId}`;
        if (window.location.pathname !== canonicalUrl) {
          navigate(canonicalUrl, { replace: true });
        }
      }
    } else {
    }
    if (!silent) setLoadingOverview(false);
  }, [slugOrId, token, urlLessonId]);

  useEffect(() => {
    loadOverview();
  }, [slugOrId, token]);

  // Sync route param urlLessonId to state currentLessonId
  useEffect(() => {
    if (urlLessonId && urlLessonId !== currentLessonId) {
      setCurrentLessonId(urlLessonId);
    }
  }, [urlLessonId]);

  // 2. Fetch Detailed Lesson Content when currentLessonId changes
  const loadLesson = useCallback(async (lId: string) => {
    if (!token) return;
    setLoadingLesson(true);

    const res = await fetchLessonContent(slugOrId, lId, token);
    if (res.success) {
      setLessonData(res);
    } else {
      console.error('Failed to load lesson content:', res.error);
    }
    setLoadingLesson(false);
  }, [slugOrId, token]);

  useEffect(() => {
    if (currentLessonId) {
      loadLesson(currentLessonId);
    }
  }, [currentLessonId, loadLesson]);

  // 3. Handle Lesson Selection
  const handleSelectLesson = (lId: string) => {
    setCurrentLessonId(lId);
    setMobileSidebarOpen(false);
    // Keep URL synced with selected lesson canonical route
    if (overview?.course?.slug) {
      navigate(`/learn/${overview.course.slug}/lesson/${lId}`, { replace: true });
    }
  };

  // 4. Handle Save Progress (Video timestamp / position)
  const handleUpdateProgress = async (progressData: { last_position_seconds: number; watch_percentage?: number }) => {
    if (!token || !currentLessonId) return;
    await updateLessonProgress(slugOrId, currentLessonId, token, progressData);
  };

  // 5. Handle Complete Lesson — Optimistic UI update (GL-style: instant feedback)
  const handleCompleteLesson = async () => {
    if (!token || !currentLessonId) return;
    if (isCompleting) return;
    setIsCompleting(true);

    // OPTIMISTIC UPDATE: Immediately reflect COMPLETED in sidebar
    setOverview((prev: any) => {
      if (!prev) return prev;
      const newProgressMap = {
        ...prev.progressMap,
        [currentLessonId]: { status: 'COMPLETED', watch_percentage: 100 }
      };

      const updatedModules = (prev.modules || []).map((m: any) => {
        const completedInMod = (m.lessons || []).filter(
          (les: any) => newProgressMap[les.id]?.status === 'COMPLETED'
        ).length;
        const totalInMod = m.lessons?.length || 0;
        const isUnlocked = Boolean(m.assessmentUnlocked || (totalInMod > 0 && completedInMod === totalInMod));
        return {
          ...m,
          assessmentUnlocked: isUnlocked
        };
      });

      const prevCompleted = prev.stats?.completedRequiredLessons || 0;
      const prevTotal = prev.stats?.totalRequiredLessons || 0;
      const wasAlreadyCompleted = prev.progressMap?.[currentLessonId]?.status === 'COMPLETED';
      const newCompleted = wasAlreadyCompleted ? prevCompleted : Math.min(prevTotal, prevCompleted + 1);
      const newPct = prevTotal > 0 ? Math.round((newCompleted / prevTotal) * 100) : 0;

      return {
        ...prev,
        modules: updatedModules,
        progressMap: newProgressMap,
        stats: {
          ...prev.stats,
          completedRequiredLessons: newCompleted,
          progressPercentage: newPct
        }
      };
    });

    // API call in background
    const res = await completeLesson(slugOrId, currentLessonId, token);

    if (res.success) {
      // Don't need to reload current lesson if we are auto-advancing
      // await loadLesson(currentLessonId); 
      await loadOverview(true);

      // Auto-advance to next lesson if available
      if (lessonData?.nextLesson) {
        setTimeout(() => {
          handleSelectLesson(lessonData.nextLesson.id);
        }, 800);
      }
    } else {
      await loadOverview(true);
    }

    setIsCompleting(false);
  };

  // 6. Handle One-Click Enrollment for Non-Enrolled Gate
  const handleEnrollNow = async () => {
    if (!token || !overview?.courseId) return;
    setEnrolling(true);

    const res = await enrollInCourse(overview.courseId, token);
    if (res.success) {
      await loadOverview();
    }
    setEnrolling(false);
  };

  // LOADING STATE
  if (loadingOverview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-300">Loading Apex Learning Interface...</p>
        </div>
      </div>
    );
  }

  // ENROLLMENT GATE / PROTECTED CONTENT SCREEN
  if (notEnrolled) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
        <div className="max-w-md w-full bg-white border border-slate-200 shadow-lg rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">Enrollment Required</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              You must be enrolled in this course to access the lesson player and learning content.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold"
              onClick={handleEnrollNow}
              disabled={enrolling}
            >
              {enrolling ? 'Enrolling You Now...' : 'Enroll Free & Start Learning'}
            </Button>

            <Link to="/programs" className="block text-xs text-slate-500 hover:text-white underline">
              Return to Course Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stats = overview?.stats || { totalRequiredLessons: 0, completedRequiredLessons: 0, progressPercentage: 0 };
  const courseTitle = overview?.course?.title || 'Apex Course';
  const courseSlugName = overview?.course?.slug || slugOrId;
  // Derived from the module records, so the banner never claims a pass that did not happen.
  const passedModuleAssessments = (overview?.modules || []).filter((m: any) => m.assessmentPassed).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">

      {/* 1. Sticky Header */}
      <CoursePlayerHeader
        courseTitle={courseTitle}
        courseSlug={courseSlugName}
        progressPercentage={stats.progressPercentage}
        completedLessons={stats.completedRequiredLessons}
        totalLessons={stats.totalRequiredLessons}
        hasFinalAssessment={overview?.hasFinalAssessment}
        onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      {/* 2. Completion Banner (when 100% complete) */}
      {(stats.progressPercentage === 100 || overview?.enrollment?.status === 'COMPLETED') && (
        <div className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="apex-container flex flex-col items-center justify-center gap-x-5 gap-y-1.5 text-center sm:flex-row">
            <span className="inline-flex items-center gap-2 text-[13px] font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
              All lessons complete
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-emerald-900">
              {stats.completedRequiredLessons}/{stats.totalRequiredLessons} lessons
            </span>
            {passedModuleAssessments > 0 && (
              <span className="text-[12px] font-semibold tabular-nums text-emerald-900">
                {passedModuleAssessments}/{overview?.modules?.length || 0} module assessments passed
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Main Player & Curriculum Layout */}
      <div className="flex-1 w-full max-w-[1728px] mx-auto flex overflow-hidden">

        {/* Desktop Sidebar (Persistent) */}
        <aside className="hidden lg:block w-80 shrink-0 border-r border-slate-200">
          <CurriculumSidebar
            modules={overview?.modules || []}
            currentLessonId={currentLessonId || undefined}
            progressMap={overview?.progressMap || {}}
            onSelectLesson={handleSelectLesson}
            onOpenModuleAssessment={handleOpenModuleAssessment}
            onOpenFinalAssessment={handleOpenFinalAssessment}
            hasFinalAssessment={overview?.hasFinalAssessment}
            overallProgressPercentage={stats.progressPercentage}
          />
        </aside>

        {/* Mobile Sidebar (Drawer / Sheet) */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative z-10 flex h-full w-80 max-w-[88%] flex-col bg-white shadow-2xl">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
                <span className="text-[13px] font-bold text-slate-900">Course content</span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label="Close curriculum"
                  className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <CurriculumSidebar
                  modules={overview?.modules || []}
                  currentLessonId={currentLessonId || undefined}
                  progressMap={overview?.progressMap || {}}
                  onSelectLesson={handleSelectLesson}
                  onOpenModuleAssessment={handleOpenModuleAssessment}
                  onOpenFinalAssessment={handleOpenFinalAssessment}
                  hasFinalAssessment={overview?.hasFinalAssessment}
                  overallProgressPercentage={stats.progressPercentage}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="relative flex min-w-0 flex-1 flex-col justify-between overflow-y-auto overflow-x-hidden bg-white p-4 sm:p-6 lg:p-8">

          {loadingLesson ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="space-y-3 text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <p className="text-[13px] font-semibold text-slate-500">Loading lesson…</p>
              </div>
            </div>
          ) : lessonData?.lesson ? (
            <div className="space-y-8">
              <LessonRenderer
                lesson={lessonData.lesson}
                resources={lessonData.resources || []}
                progress={lessonData.progress || { status: 'NOT_STARTED' }}
                onUpdateProgress={handleUpdateProgress}
                onCompleteLesson={handleCompleteLesson}
                isCompleting={isCompleting}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center py-20">
              <div className="max-w-xs text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">Pick a lesson to begin</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                  Choose any lesson from the course content list to start learning.
                </p>
              </div>
            </div>
          )}

          {/* Bottom Coursera-style Lesson Navigation & Go to Next Item Floating CTA */}
          {lessonData && (
            <div className="mt-12 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              {lessonData.prevLesson ? (
                <button
                  onClick={() => handleSelectLesson(lessonData.prevLesson.id)}
                  className="group flex min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 sm:max-w-[46%]"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-slate-600" />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Previous
                    </span>
                    <span className="block truncate text-[12.5px] font-semibold text-slate-800">
                      {lessonData.prevLesson.title}
                    </span>
                  </span>
                </button>
              ) : (
                <div className="hidden sm:block" />
              )}

              {lessonData.nextLesson ? (
                <button
                  onClick={() => handleSelectLesson(lessonData.nextLesson.id)}
                  className="group flex min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-left text-white transition-colors hover:bg-indigo-700 sm:max-w-[46%]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                      Next lesson
                    </span>
                    <span className="block truncate text-[12.5px] font-semibold">
                      {lessonData.nextLesson.title}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              ) : (
                <Link to="/student/my-learning" className="shrink-0">
                  <Button variant="outline" size="sm" iconRight={<ArrowRight className="h-4 w-4" />}>
                    Back to My Learning
                  </Button>
                </Link>
              )}
            </div>
          )}

        </main>

      </div>

      {/* Module Assessment Modal */}
      {activeAssessmentModule && (
        <ModuleAssessmentModal
          isOpen={Boolean(activeAssessmentModule)}
          onClose={() => setActiveAssessmentModule(null)}
          courseSlug={courseSlugName}
          moduleId={activeAssessmentModule.id}
          moduleTitle={activeAssessmentModule.title}
          onAssessmentCompleted={loadOverview}
        />
      )}

      {/* Final Assessment Modal */}
      {finalAssessmentOpen && (
        <FinalAssessmentModal
          isOpen={finalAssessmentOpen}
          onClose={() => setFinalAssessmentOpen(false)}
          courseSlug={courseSlugName}
          onAssessmentCompleted={loadOverview}
        />
      )}

    </div>
  );
};
