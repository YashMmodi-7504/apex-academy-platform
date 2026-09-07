import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StudentLayout } from '../../components/layout/StudentLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Card } from '../../components/common/Card.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { fetchMyEnrollments, fetchMyCertificates } from '../../services/api.ts';
import {
  BookOpen,
  Award,
  Clock,
  PlayCircle,
  BarChart2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: string;
}> = ({ label, value, icon, tone }) => (
  <Card className="flex items-center justify-between gap-4 p-5">
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
    </div>
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
      {icon}
    </div>
  </Card>
);

export const StudentDashboardPage: React.FC = () => {
  const { profile, user, session } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const token = session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const [res, certRes] = await Promise.all([
        fetchMyEnrollments(token),
        fetchMyCertificates(token),
      ]);
      if (cancelled) return;

      if (res.success) setEnrollments(res.enrollments || []);
      if (certRes.success) setCertificates(certRes.certificates || []);
      setLoading(false);
    }

    loadData();
    return () => { cancelled = true; };
  }, [session]);

  const totalEnrolled = enrollments.length;
  const inProgressCount = enrollments.filter((e) => e.status !== 'COMPLETED').length;
  const certificatesEarnedCount = certificates.length;

  const overallCompletion =
    totalEnrolled > 0
      ? Math.round(
          enrollments.reduce((acc, curr) => acc + Number(curr.progress_percentage || 0), 0) /
            totalEnrolled
        )
      : 0;

  // The course the learner is most likely to want next.
  const activeEnrollment =
    enrollments.find((e) => e.status !== 'COMPLETED' && Number(e.progress_percentage || 0) > 0) ||
    enrollments.find((e) => e.status !== 'COMPLETED') ||
    enrollments[0];

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* ---- Welcome ---- */}
        <div className="apex-on-accent relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-700 via-indigo-800 to-slate-900 p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl"
          />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-slate-300 sm:text-sm">
                {loading
                  ? 'Loading your learning activity…'
                  : totalEnrolled === 0
                    ? 'You are not enrolled in any course yet. Browse the catalogue to get started.'
                    : `You are enrolled in ${totalEnrolled} course${totalEnrolled > 1 ? 's' : ''}, ${overallCompletion}% complete on average.`}
              </p>
            </div>

            {!loading &&
              (activeEnrollment ? (
                <Link
                  to={`/learn/${activeEnrollment.course?.slug || activeEnrollment.course?.id}`}
                  className="w-full shrink-0 sm:w-auto"
                >
                  <Button variant="primary" fullWidth icon={<PlayCircle className="h-4 w-4" />}>
                    Continue learning
                  </Button>
                </Link>
              ) : (
                <Link to="/free-courses" className="w-full shrink-0 sm:w-auto">
                  <Button variant="primary" fullWidth icon={<Sparkles className="h-4 w-4" />}>
                    Browse catalogue
                  </Button>
                </Link>
              ))}
          </div>
        </div>

        {/* ---- Stats ---- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <StatTile
                label="Enrolled"
                value={totalEnrolled}
                icon={<BookOpen className="h-5 w-5" />}
                tone="bg-blue-50 text-blue-600"
              />
              <StatTile
                label="In progress"
                value={inProgressCount}
                icon={<Clock className="h-5 w-5" />}
                tone="bg-indigo-50 text-indigo-600"
              />
              <StatTile
                label="Certificates"
                value={certificatesEarnedCount}
                icon={<Award className="h-5 w-5" />}
                tone="bg-emerald-50 text-emerald-700"
              />
              <StatTile
                label="Avg. completion"
                value={`${overallCompletion}%`}
                icon={<BarChart2 className="h-5 w-5" />}
                tone="bg-amber-50 text-amber-600"
              />
            </>
          )}
        </div>

        {/* ---- Active courses ---- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold tracking-tight text-slate-900">Continue where you left off</h2>
            {enrollments.length > 3 && (
              <Link
                to="/student/my-learning"
                className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12.5px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
              >
                View all
                <ArrowRight className="apex-cta-arrow h-3.5 w-3.5 shrink-0" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <Card className="p-0">
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title="No enrolments yet"
                description="Enrol in a course and your progress will show up here."
                action={
                  <Link to="/free-courses">
                    <Button variant="primary" iconRight={<ArrowRight className="h-4 w-4" />}>
                      Browse courses
                    </Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {enrollments.slice(0, 3).map((item) => {
                const course = item.course || {};
                const progress = Math.max(0, Math.min(100, Number(item.progress_percentage || 0)));
                const isCompleted = item.status === 'COMPLETED';

                return (
                  <Card key={item.id} className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <Badge variant={isCompleted ? 'success' : 'indigo'} size="sm">
                          {course.category?.name || (isCompleted ? 'Completed' : 'Enrolled')}
                        </Badge>
                        <h3 className="mt-2 text-[15px] font-bold leading-snug text-slate-900">
                          {course.title}
                        </h3>
                        {course.short_description && (
                          <p className="mt-1 line-clamp-1 text-[13px] text-slate-500">
                            {course.short_description}
                          </p>
                        )}
                      </div>
                      <Link
                        to={`/learn/${course.slug || course.id}`}
                        className="w-full shrink-0 sm:w-auto"
                      >
                        <Button variant={isCompleted ? 'outline' : 'primary'} size="sm" fullWidth>
                          {isCompleted ? 'Review' : progress > 0 ? 'Continue' : 'Start'}
                        </Button>
                      </Link>
                    </div>

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
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </StudentLayout>
  );
};
