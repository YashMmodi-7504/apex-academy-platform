import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader.tsx';
import {
  AdminTable,
  AdminTableCard,
  AdminTableFooter,
  AdminTableScroll,
  AdminTableToolbar,
  AdminTbody,
  AdminTd,
  AdminTh,
  AdminThead,
  AdminTr,
} from '../../components/admin/AdminTable.tsx';
import { Input } from '../../components/common/Input.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { TableSkeleton } from '../../components/common/Skeleton.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { fetchAdminStudents } from '../../services/api.ts';
import { Search, Users, AlertCircle } from 'lucide-react';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

export const AdminStudentsPage: React.FC = () => {
  const { session } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = session?.access_token;
      if (!token) return;
      try {
        const res = await fetchAdminStudents(token);
        if (cancelled) return;
        if (res?.success) setStudents(res.data || []);
        else setError(res?.error || 'Students could not be loaded.');
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Students could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.full_name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)
    );
  }, [students, searchTerm]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Students"
          description="Profiles carrying the STUDENT role. Enrolment and progress reporting is not exposed by this endpoint."
          meta={!loading && !error ? <Badge variant="neutral">{students.length} total</Badge> : undefined}
        />

        <AdminTableCard>
          <AdminTableToolbar>
            <Input
              placeholder="Search by name or profile ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              aria-label="Search students"
            />
          </AdminTableToolbar>

          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={6} />
            </div>
          ) : error ? (
            <EmptyState
              icon={<AlertCircle className="h-6 w-6" />}
              title="Students could not be loaded"
              description={error}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title={searchTerm ? 'No students match that search' : 'No student profiles yet'}
              description={
                searchTerm
                  ? 'Try a different name or profile ID.'
                  : 'Learner accounts appear here once they register.'
              }
            />
          ) : (
            <>
              <AdminTableScroll>
                <AdminTable>
                  <AdminThead>
                    <tr>
                      <AdminTh>Student</AdminTh>
                      <AdminTh>Experience</AdminTh>
                      <AdminTh>Education</AdminTh>
                      <AdminTh>Joined</AdminTh>
                      <AdminTh>Role</AdminTh>
                    </tr>
                  </AdminThead>
                  <AdminTbody>
                    {filtered.map((s) => (
                      <AdminTr key={s.id}>
                        <AdminTd>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600">
                              {initials(s.full_name || '')}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-900">
                                {s.full_name || 'Unnamed profile'}
                              </div>
                              <div className="truncate font-mono text-[11px] text-slate-500">
                                {String(s.id).slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </AdminTd>
                        <AdminTd className="text-slate-600">{s.experience_level || '—'}</AdminTd>
                        <AdminTd className="text-slate-600">
                          <span className="block max-w-55 truncate">{s.education || '—'}</span>
                        </AdminTd>
                        <AdminTd className="whitespace-nowrap font-mono text-[12px] text-slate-500">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                        </AdminTd>
                        <AdminTd>
                          <Badge variant="primary">{s.role || 'STUDENT'}</Badge>
                        </AdminTd>
                      </AdminTr>
                    ))}
                  </AdminTbody>
                </AdminTable>
              </AdminTableScroll>
              <AdminTableFooter>
                <span>
                  Showing {filtered.length} of {students.length}
                </span>
              </AdminTableFooter>
            </>
          )}
        </AdminTableCard>
      </div>
    </AdminLayout>
  );
};
