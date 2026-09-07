import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Sparkles,
  BarChart3,
  BrainCircuit,
  Server,
  Database,
  Layers,
  LineChart,
  PieChart,
  Briefcase,
  Activity,
  Target,
  ArrowRight,
} from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { CAREER_DOMAINS } from '../../data/domainsData.ts';

const DOMAIN_ICON_MAP: Record<string, React.ElementType> = {
  BarChart3,
  BrainCircuit,
  Server,
  Database,
  Layers,
  LineChart,
  PieChart,
  Briefcase,
  Activity,
  Sparkles,
  Target,
};

export const ProgramsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const filteredDomains = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CAREER_DOMAINS;
    return CAREER_DOMAINS.filter(
      (domain) =>
        domain.name.toLowerCase().includes(q) ||
        domain.shortDesc.toLowerCase().includes(q) ||
        domain.targetRoles.some((r) => r.toLowerCase().includes(q)) ||
        domain.keyTools.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const domainCount = CAREER_DOMAINS.length;

  return (
    <MainLayout>
      {/* ---------- Hero ---------- */}
      <section className="apex-hero">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl"
        />
        <div className="relative apex-container py-14 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 shadow-xs">
              <Sparkles className="h-3 w-3 shrink-0 text-amber-400" />
              {domainCount} career domains
            </span>

            <h1 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Career paths, not a course list
            </h1>

            <p className="mt-5 text-sm leading-relaxed text-slate-600 sm:text-base">
              Each domain sets out the roles it prepares you for, the tools you will work with and
              the courses that make up the path.
            </p>

            <div className="relative mx-auto mt-8 max-w-md">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                placeholder="Search by domain, role or tool..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search career domains"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Domains ---------- */}
      <section className="bg-slate-50">
        <div className="apex-container py-12 lg:py-16">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              {searchQuery ? 'Matching domains' : 'All career domains'}
            </h2>
            <span className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white">
              {filteredDomains.length}
              {searchQuery ? ` of ${domainCount}` : ''}
            </span>
          </div>

          {filteredDomains.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title="No domains match that search"
                description="Try a broader term such as “data”, “AI”, “BI” or a tool name."
                action={
                  <Button variant="outline" onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredDomains.map((domain) => {
                const IconComp = DOMAIN_ICON_MAP[domain.iconName] || BarChart3;
                const imageBroken = imageErrors[domain.id];

                return (
                  <Link
                    key={domain.id}
                    to={`/domains/${domain.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
                  >
                    {/* Banner */}
                    <div className="relative h-32 shrink-0 overflow-hidden bg-slate-900">
                      {!imageBroken && (
                        <img
                          src={domain.cardImage}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setImageErrors((prev) => ({ ...prev, [domain.id]: true }))
                          }
                          className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/25 to-transparent"
                      />

                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        <IconComp className="h-2.5 w-2.5 shrink-0" />
                        {domain.badge}
                      </span>

                      <div className="absolute inset-x-3 bottom-3">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                          Focus
                        </span>
                        <span className="line-clamp-1 text-[12.5px] font-bold text-white">
                          {domain.learningFocus}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-600">
                        {domain.name}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                        {domain.shortDesc}
                      </p>

                      <div className="mt-4 border-t border-slate-100 pt-3.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Target roles
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {domain.targetRoles.slice(0, 3).map((role) => (
                            <span
                              key={role}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                            >
                              {role}
                            </span>
                          ))}
                          {domain.targetRoles.length > 3 && (
                            <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                              +{domain.targetRoles.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Key skills
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {domain.keySkills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                            >
                              {skill}
                            </span>
                          ))}
                          {domain.keySkills.length > 3 && (
                            <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                              +{domain.keySkills.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="mt-5 inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-indigo-600">
                        Explore this domain
                        <ArrowRight className="apex-cta-arrow h-3.5 w-3.5 shrink-0" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};
