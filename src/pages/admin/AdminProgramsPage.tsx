import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader.tsx';
import { Card } from '../../components/common/Card.tsx';
import { Input } from '../../components/common/Input.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { fetchAdminPrograms } from '../../services/api.ts';
import { Search, Layers, Clock, GraduationCap, AlertCircle } from 'lucide-react';

const PROGRAM_TYPE_LABEL: Record<string, string> = {
  POST_GRADUATE: 'Post Graduate',
  EXECUTIVE: 'Executive',
  DEGREE: 'Degree',
  PROFESSIONAL_CERTIFICATE: 'Professional Certificate',
};

export const AdminProgramsPage: React.FC = () => {
  const { session } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = session?.access_token;
      if (!token) return;
      try {
        const res = await fetchAdminPrograms(token);
        if (cancelled) return;
        if (res?.success) setPrograms(res.data || []);
        else setError(res?.error || 'Programs could not be loaded.');
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Programs could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        p.program_type?.toLowerCase().includes(q)
    );
  }, [programs, searchTerm]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Learning programs"
          description="Structured programs stored in the programs table, with their publication state and format."
          meta={
            !loading && !error ? (
              <Badge variant="neutral">{programs.length} total</Badge>
            ) : undefined
          }
        />

        <div className="w-full sm:max-w-sm">
          <Input
            placeholder="Search by title, slug or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            aria-label="Search programs"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-0">
            <EmptyState
              icon={<AlertCircle className="h-6 w-6" />}
              title="Programs could not be loaded"
              description={error}
            />
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon={<Layers className="h-6 w-6" />}
              title={searchTerm ? 'No programs match that search' : 'No programs yet'}
              description={
                searchTerm
                  ? 'Try a different title, slug or program type.'
                  : 'Programs added to the catalogue will be listed here.'
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((program) => (
              <Card key={program.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <Badge variant={program.is_published ? 'success' : 'warning'} dot>
                    {program.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </div>

                <h3 className="mt-4 text-[15px] font-bold leading-snug text-slate-900">
                  {program.title}
                </h3>
                {program.slug && (
                  <p className="mt-1 truncate font-mono text-[11px] text-indigo-600">{program.slug}</p>
                )}
                {program.short_description && (
                  <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                    {program.short_description}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-[12px] font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    {PROGRAM_TYPE_LABEL[program.program_type] || program.program_type || 'Unspecified'}
                  </span>
                  {program.duration && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      {program.duration}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
