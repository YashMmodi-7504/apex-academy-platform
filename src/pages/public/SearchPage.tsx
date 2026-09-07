import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import {
  Search as SearchIcon,
  Book,
  Building,
  FileText,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Button } from '../../components/common/Button.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { searchPublic } from '../../services/api.ts';

/** Filter chips mirror the result types the API actually returns. */
const TYPE_FILTERS = ['All', 'Courses', 'Programs', 'Articles', 'Institutions'];

const TYPE_META: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  course: { label: 'Course', icon: Book, className: 'text-indigo-500' },
  program: { label: 'Program', icon: Layers, className: 'text-pink-500' },
  article: { label: 'Resource', icon: FileText, className: 'text-emerald-500' },
  institution: { label: 'Institution', icon: Building, className: 'text-purple-500' },
};

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState('All');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      setLoading(true);
      searchPublic(q).then((res) => {
        if (cancelled) return;
        setResults(res.success && res.data ? res.data : []);
        setLoading(false);
      });
    } else {
      setQuery('');
      setResults([]);
    }
    return () => { cancelled = true; };
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
  };

  // Counts per type, so a filter that would return nothing is visibly empty.
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: results.length };
    for (const t of TYPE_FILTERS.slice(1)) {
      const singular = t.toLowerCase().replace(/s$/, '');
      counts[t] = results.filter((r) => String(r.type).toLowerCase() === singular).length;
    }
    return counts;
  }, [results]);

  const filteredResults = results.filter(
    (result) =>
      activeType === 'All' ||
      String(result.type).toLowerCase() === activeType.toLowerCase().replace(/s$/, '')
  );

  const activeQuery = searchParams.get('q');

  return (
    <MainLayout>
      {/* ---------- Search header ---------- */}
      <section className="apex-hero">
        <div className="apex-container py-12 lg:py-16">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              Search Apex Academy
            </h1>
            <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <SearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Courses, programs, articles or institutions"
                  aria-label="Search"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-[15px] text-slate-900 shadow-xs placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                />
              </div>
              <Button type="submit" variant="primary" size="lg" className="shrink-0">
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="apex-container py-10 lg:py-14">
          {/* Type filters: a horizontal chip row that scrolls rather than a
              sidebar that collapses out of reach on mobile. */}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {TYPE_FILTERS.map((type) => {
              const active = activeType === type;
              const count = typeCounts[type] ?? 0;
              return (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  aria-pressed={active}
                  className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {type}
                  {results.length > 0 && (
                    <span className={`ml-1.5 tabular-nums ${active ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200 pb-4">
            <h2 className="min-w-0 text-lg font-bold tracking-tight text-slate-900">
              {activeQuery ? (
                <>
                  Results for <span className="text-indigo-600">&ldquo;{activeQuery}&rdquo;</span>
                </>
              ) : (
                'Enter a search term'
              )}
            </h2>
            {activeQuery && !loading && (
              <span className="shrink-0 text-[13px] font-medium tabular-nums text-slate-500">
                {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'}
              </span>
            )}
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="space-y-4">
                {filteredResults.map((result) => {
                  const meta = TYPE_META[String(result.type).toLowerCase()] || {
                    label: 'Result',
                    icon: SearchIcon,
                    className: 'text-slate-500',
                  };
                  const Icon = meta.icon;

                  return (
                    <Link
                      to={result.slug}
                      key={result.id}
                      className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md sm:gap-5 sm:p-6"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 transition-colors group-hover:border-indigo-100 group-hover:bg-indigo-50">
                        {result.thumbnail ? (
                          <img
                            src={result.thumbnail}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Icon className={`h-5 w-5 ${meta.className}`} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {meta.label}
                        </span>
                        <h3 className="mt-2 truncate text-base font-bold text-slate-900 transition-colors group-hover:text-indigo-600 sm:text-lg">
                          {result.title}
                        </h3>
                        {result.description && (
                          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                            {result.description}
                          </p>
                        )}
                        {result.badge && (
                          <p className="mt-2 text-[12px] font-medium text-slate-500">
                            {result.badge}
                          </p>
                        )}
                      </div>

                      <div className="hidden h-9 w-9 shrink-0 items-center justify-center self-center rounded-full bg-slate-50 transition-colors group-hover:bg-indigo-600 sm:flex">
                        <ChevronRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-white" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : activeQuery ? (
              <div className="rounded-2xl border border-slate-200 bg-white">
                <EmptyState
                  icon={<SearchIcon className="h-6 w-6" />}
                  title="No results found"
                  description={
                    activeType !== 'All' && results.length > 0
                      ? `Nothing under “${activeType}”. Try the All filter or a different search term.`
                      : `Nothing matched “${activeQuery}”. Try a more general keyword.`
                  }
                  action={
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuery('');
                        setActiveType('All');
                        setSearchParams({});
                      }}
                    >
                      Clear search
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white">
                <EmptyState
                  icon={<SearchIcon className="h-6 w-6" />}
                  title="Search the catalogue"
                  description="Look up a course, career path, article or partner institution by name or topic."
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  );
};
