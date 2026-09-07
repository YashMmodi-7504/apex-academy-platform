import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { Button } from '../../components/common/Button.tsx';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import { fetchArticles } from '../../services/api.ts';

export const ResourcesPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchArticles().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setArticles(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Categories come from the articles that exist, so a filter never leads to a
  // guaranteed-empty list.
  const categories = useMemo(() => {
    const found = Array.from(
      new Set(articles.map((a) => a.category).filter(Boolean) as string[])
    ).sort();
    return ['All', ...found];
  }, [articles]);

  const filteredArticles = useMemo(
    () =>
      activeCategory === 'All'
        ? articles
        : articles.filter((a) => a.category === activeCategory),
    [articles, activeCategory]
  );

  // The lead article is only pulled out of the grid on the unfiltered view;
  // slicing the filtered list would silently hide one article per category.
  const showFeatured = activeCategory === 'All' && filteredArticles.length > 0;
  const featuredArticle = showFeatured ? filteredArticles[0] : null;
  const gridArticles = showFeatured ? filteredArticles.slice(1) : filteredArticles;

  const markBroken = (id: string) => setImageErrors((prev) => ({ ...prev, [id]: true }));

  return (
    <MainLayout>
      {/* ---------- Hero ---------- */}
      <section className="apex-hero">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl"
        />
        <div className="relative apex-container py-14 text-center lg:py-20">
          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 shadow-xs">
            Resources
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Articles and guides
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Writing on the tools, roles and practices behind the courses on the platform.
          </p>
        </div>
      </section>

      <div className="apex-container py-12 lg:py-16">
        {loading ? (
          <div className="space-y-10">
            <Skeleton className="h-72 rounded-2xl" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white">
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title="No articles published yet"
              description="New writing will appear here as it is published."
              action={
                <Link to="/free-courses">
                  <Button variant="outline" iconRight={<ArrowRight className="h-4 w-4" />}>
                    Browse courses
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-12">
            {/* ---------- Featured ---------- */}
            {featuredArticle && (
              <Link
                to={`/resources/${featuredArticle.slug}`}
                className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-indigo-300 hover:shadow-lg"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="relative h-56 overflow-hidden bg-slate-100 lg:h-auto lg:min-h-80">
                    {featuredArticle.image_url && !imageErrors[featuredArticle.id] ? (
                      <img
                        src={featuredArticle.image_url}
                        alt=""
                        onError={() => markBroken(featuredArticle.id)}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 text-slate-300">
                        <BookOpen className="h-10 w-10" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 lg:p-10">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-bold uppercase tracking-wider">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-600">
                        Featured
                      </span>
                      {featuredArticle.category && (
                        <span className="text-slate-500">{featuredArticle.category}</span>
                      )}
                      {featuredArticle.read_time && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {featuredArticle.read_time}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-semibold leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600 sm:text-2xl lg:text-3xl">
                      {featuredArticle.title}
                    </h2>

                    {featuredArticle.excerpt && (
                      <p className="line-clamp-3 text-[14px] leading-relaxed text-slate-600 sm:text-[15px]">
                        {featuredArticle.excerpt}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <span className="text-[13px] font-bold text-slate-900">
                        {featuredArticle.author || 'Apex Academy'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-indigo-600">
                        Read article
                        <ArrowRight className="apex-cta-arrow h-3.5 w-3.5 shrink-0" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* ---------- Grid ---------- */}
            <section>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  {activeCategory === 'All' ? 'Latest articles' : activeCategory}
                </h2>

                {categories.length > 1 && (
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
                    {categories.map((category) => {
                      const active = activeCategory === category;
                      return (
                        <button
                          key={category}
                          onClick={() => setActiveCategory(category)}
                          aria-pressed={active}
                          className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {gridArticles.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white">
                  <EmptyState
                    icon={<BookOpen className="h-6 w-6" />}
                    title="Nothing more in this category"
                    description={
                      activeCategory === 'All'
                        ? 'The featured article above is the only one published so far.'
                        : `No further articles filed under “${activeCategory}”.`
                    }
                    action={
                      activeCategory !== 'All' ? (
                        <Button variant="outline" onClick={() => setActiveCategory('All')}>
                          View all articles
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {gridArticles.map((article: any, idx: number) => {
                    const key = article.id || String(idx);
                    return (
                      <Link
                        to={`/resources/${article.slug}`}
                        key={key}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
                      >
                        <div className="relative h-44 shrink-0 overflow-hidden bg-slate-100">
                          {article.image_url && !imageErrors[key] ? (
                            <img
                              src={article.image_url}
                              alt=""
                              loading="lazy"
                              onError={() => markBroken(key)}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 text-slate-300">
                              <BookOpen className="h-8 w-8" />
                            </div>
                          )}
                          {article.category && (
                            <span className="absolute left-3.5 top-3.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-900 backdrop-blur-sm">
                              {article.category}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {(article.published_at || article.created_at) && (
                              <span>
                                {new Date(
                                  article.published_at || article.created_at
                                ).toLocaleDateString()}
                              </span>
                            )}
                            {article.read_time && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                {article.read_time}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-2.5 line-clamp-2 text-[16px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-600">
                            {article.title}
                          </h3>

                          {article.excerpt && (
                            <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                              {article.excerpt}
                            </p>
                          )}

                          <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <span className="truncate text-[12px] font-bold text-slate-700">
                              {article.author || 'Apex Academy'}
                            </span>
                            <ArrowRight className="apex-cta-arrow h-4 w-4 shrink-0 text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
