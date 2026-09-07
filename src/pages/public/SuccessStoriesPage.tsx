import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { ArrowRight, Quote, MessageSquareQuote } from 'lucide-react';
import { fetchSuccessStories } from '../../services/api.ts';

export const SuccessStoriesPage: React.FC = () => {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSuccessStories().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setStories(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <MainLayout>
      {/* ---------- Hero ---------- */}
      <section className="apex-hero">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl"
        />
        <div className="relative apex-container py-16 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 shadow-xs">
              Learner stories
            </span>
            <h1 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              In their own words
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-slate-600 sm:text-base">
              Accounts from learners who moved into data, AI and analytics roles after working
              through the platform.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Stories ---------- */}
      <section className="bg-white">
        <div className="apex-container py-16 lg:py-20">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : stories.length === 0 ? (
            <EmptyState
              icon={<MessageSquareQuote className="h-6 w-6" />}
              title="No stories published yet"
              description="Learner stories will appear here once they are published."
              action={
                <Link to="/programs">
                  <Button variant="outline" iconRight={<ArrowRight className="h-4 w-4" />}>
                    Browse career paths
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {stories.map((story) => (
                <Link
                  to={`/success-stories/${story.id}`}
                  key={story.id}
                  className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg sm:p-7"
                >
                  <Quote
                    aria-hidden="true"
                    className="absolute right-6 top-6 h-10 w-10 text-slate-50 transition-colors group-hover:text-indigo-50"
                  />

                  <div className="relative flex items-center gap-3.5">
                    {story.image_url && !imageErrors[story.id] ? (
                      <img
                        src={story.image_url}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-full object-cover"
                        onError={() =>
                          setImageErrors((prev) => ({ ...prev, [story.id]: true }))
                        }
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-bold text-slate-500"
                      >
                        {story.learner_name?.charAt(0) || 'A'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
                        {story.learner_name}
                      </h2>
                      {story.salary_increase && (
                        <span className="mt-1 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          {story.salary_increase} salary increase
                        </span>
                      )}
                    </div>
                  </div>

                  {story.testimonial && (
                    <p className="relative z-10 mt-5 line-clamp-4 text-[14px] italic leading-relaxed text-slate-600">
                      &ldquo;{story.testimonial}&rdquo;
                    </p>
                  )}

                  <div className="mt-auto space-y-3 border-t border-slate-100 pt-5">
                    {story.previous_role && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Previously
                        </div>
                        <div className="mt-0.5 text-[13px] font-medium text-slate-700">
                          {story.previous_role}
                          {story.previous_company ? ` · ${story.previous_company}` : ''}
                        </div>
                      </div>
                    )}
                    {story.new_role && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                          Now
                        </div>
                        <div className="mt-0.5 text-[13px] font-bold text-indigo-900">
                          {story.new_role}
                          {story.current_company ? ` · ${story.current_company}` : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Start your own path
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Pick the career domain you are aiming at and work through the courses that lead to it.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/programs" className="inline-block">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                iconRight={<ArrowRight className="h-4 w-4" />}
              >
                Explore career paths
              </Button>
            </Link>
            <Link to="/free-courses" className="inline-block">
              <Button variant="outline" size="lg" fullWidth>
                Browse courses
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};
