import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { CourseCard, CourseGrid } from '../../components/common/CourseCard.tsx';
import { CourseGridSkeleton } from '../../components/common/Skeleton.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { fetchCourses, fetchCategories } from '../../services/api.ts';
import { BookOpen, Search, Sparkles, SlidersHorizontal, X, Award, Layers } from 'lucide-react';

const DIFFICULTIES = [
  { value: 'all', label: 'All levels' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const SORTS = [
  { value: 'default', label: 'Recommended' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'level', label: 'Level (easiest first)' },
];

const LEVEL_RANK: Record<string, number> = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };

export const FreeCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters — unchanged: these still drive the same API request as before.
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI-only additions (no API impact)
  const [sortBy, setSortBy] = useState<string>('default');
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);

  useEffect(() => {
    async function initData() {
      setLoading(true);

      const [catRes, courseRes] = await Promise.all([
        fetchCategories(),
        fetchCourses({
          category: selectedCategory,
          difficulty: selectedDifficulty,
          search: searchQuery,
        }),
      ]);

      if (catRes.success) setCategories(catRes.categories || []);
      if (courseRes.success) setCourses(courseRes.courses || []);

      setLoading(false);
    }

    initData();
  }, [selectedCategory, selectedDifficulty, searchQuery]);

  // Client-side ordering of the already-fetched result set.
  const visibleCourses = useMemo(() => {
    const list = [...courses];
    if (sortBy === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    if (sortBy === 'level') {
      list.sort(
        (a, b) =>
          (LEVEL_RANK[(a.difficulty || '').toUpperCase()] ?? 9) -
          (LEVEL_RANK[(b.difficulty || '').toUpperCase()] ?? 9)
      );
    }
    return list;
  }, [courses, sortBy]);

  const activeFilterCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedDifficulty !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setSearchQuery('');
  };

  const certificateCount = courses.filter((c) => c.certificate_enabled).length;

  /* ---- Shared filter controls (desktop toolbar + mobile drawer) ---- */
  const FilterControls: React.FC<{ stacked?: boolean }> = ({ stacked = false }) => (
    <div className={stacked ? 'space-y-5' : 'flex flex-wrap items-center gap-3'}>
      <div className={stacked ? '' : 'min-w-45'}>
        {stacked && (
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Career domain
          </label>
        )}
        <select
          aria-label="Filter by career domain"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
        >
          <option value="all">All domains</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className={stacked ? '' : 'min-w-37.5'}>
        {stacked && (
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Difficulty
          </label>
        )}
        <select
          aria-label="Filter by difficulty"
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className={stacked ? '' : 'min-w-42.5'}>
        {stacked && (
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Sort by
          </label>
        )}
        <select
          aria-label="Sort courses"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="h-3.5 w-3.5 shrink-0" />
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <MainLayout>
      {/* ---------- Hero ---------- */}
      <section className="apex-hero">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl"
        />

        <div className="relative apex-container py-14 sm:py-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              100% Free — Certificate Included
            </span>

            <h1 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Learn. Build. Get Certified.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Self-paced bootcamps across data, AI and analytics. Structured modules, video lessons
              and a verifiable certificate on completion — at no cost.
            </p>

            {/* Hero search — drives the same query as the toolbar */}
            <div className="relative mt-7 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                aria-label="Search free courses"
                placeholder="Search courses by title or topic…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-xs placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
              />
            </div>

            {/* Live counts from real data only */}
            {!loading && (
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <Layers className="h-4 w-4 shrink-0 text-indigo-600" />
                  <strong className="font-bold text-slate-900">{courses.length}</strong> courses available
                </span>
                {certificateCount > 0 && (
                  <span className="inline-flex items-center gap-2">
                    <Award className="h-4 w-4 shrink-0 text-amber-500" />
                    <strong className="font-bold text-slate-900">{certificateCount}</strong> with certificate
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Toolbar + grid ---------- */}
      <section className="bg-slate-50">
        <div className="apex-container py-10 lg:py-14">

          {/* Desktop toolbar */}
          <div className="mb-8 hidden items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs md:flex">
            <FilterControls />
            <p className="shrink-0 pr-1 text-[13px] font-medium text-slate-500">
              {loading ? 'Loading…' : `${visibleCourses.length} result${visibleCourses.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {/* Mobile toolbar */}
          <div className="mb-6 flex items-center justify-between gap-3 md:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen(true)}
              icon={<SlidersHorizontal className="h-4 w-4" />}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
            <p className="text-[13px] font-medium text-slate-500">
              {loading ? 'Loading…' : `${visibleCourses.length} result${visibleCourses.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {/* Grid */}
          {loading ? (
            <CourseGridSkeleton count={6} />
          ) : visibleCourses.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white">
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title="No courses match those filters"
                description="Try a different domain or difficulty, or clear the filters to see everything available."
                action={
                  activeFilterCount > 0 ? (
                    <Button variant="primary" onClick={clearFilters}>Clear all filters</Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <CourseGrid>
              {visibleCourses.map((course) => (
                <CourseCard key={course.id} course={course} ctaLabel="View Course" />
              ))}
            </CourseGrid>
          )}
        </div>
      </section>

      {/* ---------- Mobile filter drawer ---------- */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setFiltersOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Filters</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FilterControls stacked />

            <div className="mt-6 flex gap-3">
              {activeFilterCount > 0 && (
                <Button variant="outline" fullWidth onClick={clearFilters}>Clear</Button>
              )}
              <Button variant="primary" fullWidth onClick={() => setFiltersOpen(false)}>
                Show {visibleCourses.length} result{visibleCourses.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};
