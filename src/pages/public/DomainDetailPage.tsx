import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { SectionHeader } from '../../components/common/SectionHeader.tsx';
import { CourseCard } from '../../components/common/CourseCard.tsx';
import { CourseCardSkeleton, Skeleton } from '../../components/common/Skeleton.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import {
  Briefcase,
  ChevronRight,
  Sparkles,
  BookOpen,
  Wrench,
  CheckCircle2,
  Layers,
  ArrowRight,
  Target,
  Route as RouteIcon,
  Award,
} from 'lucide-react';
import { fetchDomainLearningPath } from '../../services/api.ts';
import { getDomainBySlug } from '../../data/domainsData.ts';

export const DomainDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [domainData, setDomainData] = useState<any>(null);
  const [pathCourses, setPathCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const domainMeta = slug ? getDomainBySlug(slug) : undefined;

  useEffect(() => {
    async function loadDomainPathData() {
      if (!slug) return;
      setLoading(true);
      try {
        const res = await fetchDomainLearningPath(slug);
        if (res.success) {
          setDomainData(res);
          setPathCourses(res.courses || []);
        }
      } catch (err) {
        console.error('Error loading domain path data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDomainPathData();
  }, [slug]);

  const domain = domainData?.domain;
  const learningPath = domainData?.learningPath;
  const domainName =
    domain?.name ||
    domainMeta?.name ||
    (slug ? slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Career Domain');
  const description =
    domain?.description ||
    domainMeta?.description ||
    `Explore structured learning paths, specialized courses, and career mentorship for ${domainName}.`;

  // Figures derived from the API response only — nothing invented.
  const courseCount = pathCourses.length;
  const moduleCount = pathCourses.reduce((sum, c) => sum + (c.module_count || 0), 0);
  const certificateCourses = pathCourses.filter((c) => c.certificate_enabled !== false).length;

  return (
    <MainLayout>
      {/* ---------- Hero ---------- */}
      <section className="apex-hero">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl" />

        <div className="relative apex-container py-12 lg:py-16">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-slate-500">
            <Link to="/" className="transition-colors hover:text-indigo-700">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link to="/programs" className="transition-colors hover:text-indigo-700">Career Domains</Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="text-indigo-700">{domainName}</span>
          </nav>

          <div className="mt-7 grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 shadow-xs">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                Career Domain
              </span>

              <h1 className="mt-5 text-3xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {domainName}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                {description}
              </p>

              {domainMeta?.learningFocus && (
                <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-slate-500">
                  <span className="font-bold text-indigo-700">Core focus: </span>
                  {domainMeta.learningFocus}
                </p>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#learning-path" className="inline-block">
                  <Button variant="primary" size="lg" fullWidth iconRight={<ArrowRight className="h-4 w-4" />}>
                    Explore Career Path
                  </Button>
                </a>
                <Link to="/free-courses" className="inline-block">
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    
                  >
                    Browse All Courses
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats — all derived from the loaded path */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-white/85 shadow-sm p-6 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600">
                  {learningPath?.title || 'Learning path'}
                </p>
                {loading ? (
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                  </div>
                ) : (
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-semibold text-slate-900 sm:text-3xl">{courseCount}</div>
                      <div className="mt-1 text-[12px] text-slate-500">Courses</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-slate-900 sm:text-3xl">{moduleCount}</div>
                      <div className="mt-1 text-[12px] text-slate-500">Modules</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-slate-900 sm:text-3xl">{certificateCourses}</div>
                      <div className="mt-1 text-[12px] text-slate-500">Certificates</div>
                    </div>
                  </div>
                )}

                {domainMeta?.targetRoles?.length ? (
                  <div className="mt-6 border-t border-slate-200 pt-5">
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Target roles
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {domainMeta.targetRoles.map((r) => (
                        <span key={r} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-slate-50">
        {/* ---------- Learning path ---------- */}
        <section id="learning-path" className="scroll-mt-20">
          <div className="apex-container py-14 lg:py-16">
            <SectionHeader
              eyebrow="Career roadmap"
              title="Your structured learning path"
              description="Work through these courses in order. Each builds on the last, ending in certification."
            />

            <div className="mt-10 space-y-5">
              {loading ? (
                <>
                  <CourseCardSkeleton />
                  <CourseCardSkeleton />
                </>
              ) : pathCourses.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white">
                  <EmptyState
                    icon={<RouteIcon className="h-6 w-6" />}
                    title="Learning path coming soon"
                    description={`The structured course sequence for ${domainName} is being finalised. In the meantime you can browse the full catalogue.`}
                    action={
                      <Link to="/free-courses">
                        <Button variant="primary" iconRight={<ArrowRight className="h-4 w-4" />}>
                          Browse Courses
                        </Button>
                      </Link>
                    }
                  />
                </div>
              ) : (
                pathCourses.map((course, idx) => (
                  <div
                    key={course.id}
                    className="group relative rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-indigo-300 hover:shadow-md sm:p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      {/* Step index */}
                      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm">
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        {idx < pathCourses.length - 1 && (
                          <div aria-hidden="true" className="hidden h-full w-px flex-1 bg-slate-200 sm:block" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 sm:text-lg">{course.title}</h3>
                          {course.difficulty && (
                            <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                              {course.difficulty}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <Award className="h-3 w-3 shrink-0" />
                            Certificate
                          </span>
                        </div>

                        {(course.short_description || course.description) && (
                          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-600">
                            {course.short_description || course.description}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-medium text-slate-500">
                          {typeof course.module_count === 'number' && course.module_count > 0 && (
                            <span className="inline-flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                              {course.module_count} Modules
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                            Self-paced
                          </span>
                          {course.is_required && (
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                              <Target className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                              Required
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 sm:self-center">
                        <Link to={`/courses/${course.slug}`} className="block">
                          <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            iconRight={<ChevronRight className="h-4 w-4" />}
                          >
                            Explore Course
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ---------- Skills & tools ---------- */}
        {domainMeta && (
          <section className="border-t border-slate-200 bg-white">
            <div className="apex-container py-14 lg:py-16">
              <SectionHeader
                eyebrow="What you will build"
                title="Skills, tools and outcomes"
                description={`The capabilities this path develops and the technologies you will work with as a ${domainName}.`}
              />

              <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7">
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <Sparkles className="h-4 w-4 shrink-0 text-indigo-600" />
                    Key competencies
                  </h3>
                  <ul className="mt-5 space-y-2.5">
                    {domainMeta.keySkills.map((skill) => (
                      <li key={skill} className="flex items-start gap-2.5 text-[13px] font-medium text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                        <span>{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7">
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <Wrench className="h-4 w-4 shrink-0 text-indigo-600" />
                    Tools &amp; technologies
                  </h3>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {domainMeta.keyTools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>

                  {domainMeta.targetRoles?.length ? (
                    <>
                      <h3 className="mt-7 flex items-center gap-2 text-base font-bold text-slate-900">
                        <Briefcase className="h-4 w-4 shrink-0 text-indigo-600" />
                        Roles this prepares you for
                      </h3>
                      <ul className="mt-4 space-y-2">
                        {domainMeta.targetRoles.map((role) => (
                          <li key={role} className="flex items-center gap-2.5 text-[13px] font-medium text-slate-700">
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                            {role}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------- Closing CTA ---------- */}
        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-7 text-center sm:flex-row sm:text-left">
              <div>
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Ready to start the {domainName} path?
                </h2>
                <p className="mt-1.5 text-[13px] text-slate-600">
                  Create a free account and begin with the first course in the sequence.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link to="/register">
                  <Button variant="primary" iconRight={<ArrowRight className="h-4 w-4" />}>
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/programs">
                  <Button variant="outline">All Domains</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};
