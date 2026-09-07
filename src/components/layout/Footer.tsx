import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Award, BadgeCheck, ArrowRight } from 'lucide-react';
import { CAREER_DOMAINS } from '../../data/domainsData.ts';

/** Column definitions — every `to` corresponds to a route declared in AppRoutes. */
const LEARNING_LINKS = [
  { to: '/programs', label: 'All Programs' },
  { to: '/free-courses', label: 'Free Courses' },
  { to: '/resources', label: 'Articles & Resources' },
  { to: '/search', label: 'Search Curriculum' },
];

const SUPPORT_LINKS = [
  { to: '/career-support', label: 'Career Support' },
  { to: '/success-stories', label: 'Success Stories' },
  { to: '/institutions', label: 'Partner Institutions' },
  { to: '/enterprise', label: 'Corporate Training' },
];

export const Footer: React.FC = () => {
  // Domain list is derived from the same source the rest of the app uses,
  // so the footer never drifts out of sync with the real catalogue.
  const domains = CAREER_DOMAINS.slice(0, 8);

  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-600">
      <div className="apex-container pt-14 pb-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 border-b border-slate-200 pb-12 lg:grid-cols-12">

          {/* Brand */}
          <div className="col-span-2 lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-700 text-white shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-900">
                APEX<span className="text-indigo-600">ACADEMY</span>
              </span>
            </div>

            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-slate-500">
              Structured, career-focused learning paths in data, AI and analytics — built around
              practical skills, guided curricula and verifiable certification.
            </p>

            <div className="mt-5 flex flex-col gap-2.5 text-[13px] text-slate-600">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 shrink-0 text-amber-500" />
                <span>Certificate of completion for every course</span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>Public certificate verification by code</span>
              </div>
            </div>

            <Link
              to="/verify-certificate"
              className="group mt-5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50"
            >
              Verify a Certificate
              <ArrowRight className="apex-cta-arrow h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>

          {/* Career domains */}
          <div className="lg:col-span-4">
            <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-900">
              Career Domains
            </h4>
            <ul className="grid grid-cols-1 gap-y-2 text-[13px] sm:grid-cols-2">
              {domains.map((d) => (
                <li key={d.slug}>
                  <Link
                    to={`/domains/${d.slug}`}
                    className="text-slate-600 transition-colors hover:text-indigo-700"
                  >
                    {d.name}
                  </Link>
                </li>
              ))}
              <li className="sm:col-span-2">
                <Link
                  to="/programs"
                  className="font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  View all domains
                </Link>
              </li>
            </ul>
          </div>

          {/* Learning */}
          <div className="lg:col-span-2">
            <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-900">
              Learning
            </h4>
            <ul className="space-y-2.5 text-[13px]">
              {LEARNING_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-slate-600 transition-colors hover:text-slate-900">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="lg:col-span-2">
            <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-900">
              Support
            </h4>
            <ul className="space-y-2.5 text-[13px]">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-slate-600 transition-colors hover:text-slate-900">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-7 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Apex Academy. All rights reserved.</p>
          <p className="text-slate-500">Career-focused learning in data, AI &amp; analytics</p>
        </div>
      </div>
    </footer>
  );
};
