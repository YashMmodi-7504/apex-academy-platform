import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** Base shimmer block. Geometry should match the content it stands in for. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);

/** Placeholder matching the geometry of a CourseCard. */
export const CourseCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
    <div className="flex items-center gap-2">
      <Skeleton className="h-5 w-16 rounded-md" />
      <Skeleton className="h-5 w-20 rounded-md" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-5 w-4/5 rounded" />
      <Skeleton className="h-5 w-3/5 rounded" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-11/12 rounded" />
      <Skeleton className="h-3 w-2/3 rounded" />
    </div>
    <div className="flex gap-3 pt-1">
      <Skeleton className="h-3 w-20 rounded" />
      <Skeleton className="h-3 w-20 rounded" />
      <Skeleton className="h-3 w-16 rounded" />
    </div>
    <Skeleton className="h-9 w-full rounded-lg mt-1" />
  </div>
);

/** Grid of course card placeholders. */
export const CourseGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <CourseCardSkeleton key={i} />
    ))}
  </div>
);

/** Placeholder for admin/data tables. */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 5 }) => (
  <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 flex gap-6">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1 rounded" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="px-5 py-4 flex gap-6 border-b border-slate-100 last:border-0">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-3.5 flex-1 rounded" />
        ))}
      </div>
    ))}
  </div>
);

/** Multi-line text placeholder. */
export const TextSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-3.5 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);
