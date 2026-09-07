import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { StudentLayout } from '../../components/layout/StudentLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Card } from '../../components/common/Card.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { CourseGridSkeleton } from '../../components/common/Skeleton.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { fetchMyEnrollments } from '../../services/api.ts';
import { BookOpen, Clock, Award, ArrowRight } from 'lucide-react';

type Tab = 'ALL' | 'IN_PROGRESS' | 'COMPLETED';

const TABS: { id: Tab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'COMPLETED', label: 'Completed' },
];

export const MyLearningPage: React.FC = () => {
  const { session } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<Tab>('ALL');

  useEffect(() => {
    let cancelled = false;
    async function loadEnrollments() {
      const token = session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await fetchMyEnrollments(token);
      if (cancelled) return;
      if (res.success) setEnrollments(res.enrollments || []);
      setLoading(false);
    }
    loadEnrollments();
    return () => { cancelled = true; };
  }, [session]);

  const counts = useMemo(
    () => ({
      ALL: enrollments.length,
      IN_PROGRESS: enrollments.filter((e) => e.status !== 'COMPLETED').length,
      COMPLETED: enrollments.filter((e) => e.status === 'COMPLETED').length,
    }),
    [enrollments]
  );

  const filteredEnrollments = enrollments.filter((e) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'IN_PROGRESS') return e.status !== 'COMPLETED';
    return e.status === 'COMPLETED';
  });

  const formatDuration = (mins?: number) => {
    if (!mins) return 'Self-paced';
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours === 0) return `${remainingMins} min`;
    if (remainingMins === 0) return `${hours} hr`;
    return `${hours} hr ${remainingMins} min`;
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              My learning
            </h1>
            <p className="mt-1.5 text-[13px] text-slate-500">
              Every course you are enrolled in, with your progress so far.
            </p>
          </div>
          <Link to="/free-courses" className="shrink-0">
            <Button variant="outline" size="sm" icon={<BookOpen className="h-4 w-4" />}>
              Browse catalogue
            </Button>
          </Link>
        </div>

        {/* Tabs scroll horizontally rather than wrapping on narrow screens */}
        <div className="no-scrollbar -mb-px flex items-center gap-1 overflow-x-auto border-b border-slate-200">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'true' : undefined}
                className={`shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-[13px] font-semibold transition-colors ${
                  active
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 tabular-nums text-slate-500">{counts[tab.id]}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <CourseGridSkeleton count={6} />
        ) : filteredEnrollments.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title={
                enrollments.length === 0
                  ? 'You have not enrolled in a course yet'
                  : activeTab === 'COMPLETED'
                    ? 'No completed courses yet'
                    : 'Nothing in progress'
              }
              description={
                enrollments.length === 0
                  ? 'Browse the catalogue and enrol in a course to start learning.'
                  : activeTab === 'COMPLETED'
                    ? 'Courses appear here once you finish every required lesson.'
                    : 'All of your enrolled courses are complete.'
              }
              action={
                enrollments.length === 0 ? (
                  <Link to="/free-courses">
                    <Button variant="primary" iconRight={<ArrowRight className="h-4 w-4" />}>
                      Browse courses
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredEnrollments.map((item) => {
              const course = item.course || {};
              const progress = Math.max(0, Math.min(100, Number(item.progress_percentage || 0)));
              const isCompleted = item.status === 'COMPLETED';

              return (
                <Card
                  key={item.id}
                  className="flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="indigo" size="sm">
                      {course.category?.name || 'Course'}
                    </Badge>
                    <Badge variant={isCompleted ? 'success' : 'neutral'} size="sm" dot>
                      {isCompleted ? 'Completed' : `${progress}%`}
                    </Badge>
                  </div>

                  <h3 className="mt-3 line-clamp-2 text-[15px] font-bold leading-snug text-slate-900">
                    {course.title}
                  </h3>
                  {course.short_description && (
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                      {course.short_description}
                    </p>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Progress</span>
                      <span className="tabular-nums">{progress}%</span>
                    </div>
                    <div
                      className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${course.title || 'Course'} progress`}
                    >
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-slate-500">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{formatDuration(course.duration_minutes)}</span>
                    </span>

                    {isCompleted ? (
                      <Link to="/student/certificates" className="shrink-0">
                        <Button variant="outline" size="sm" icon={<Award className="h-3.5 w-3.5" />}>
                          Certificate
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/learn/${course.slug || course.id}`} className="shrink-0">
                        <Button variant="primary" size="sm">
                          {progress > 0 ? 'Continue' : 'Start'}
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};
