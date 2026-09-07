import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft, Compass } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';

export const NotFoundPage: React.FC = () => (
  <MainLayout>
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/5 blur-3xl"
      />

      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
          <Compass className="h-7 w-7" />
        </div>

        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          The link may be out of date, or the page may have moved. Try searching the catalogue or
          head back to the homepage.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/" className="inline-block">
            <Button variant="primary" fullWidth icon={<Home className="h-4 w-4" />}>
              Go to homepage
            </Button>
          </Link>
          <Link to="/search" className="inline-block">
            <Button variant="outline" fullWidth icon={<Search className="h-4 w-4" />}>
              Search courses
            </Button>
          </Link>
        </div>

        <button
          onClick={() => window.history.back()}
          className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          Go back
        </button>
      </div>
    </div>
  </MainLayout>
);
