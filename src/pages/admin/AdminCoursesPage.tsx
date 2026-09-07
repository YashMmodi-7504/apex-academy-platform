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
import { fetchAdminCourses } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { BookOpen, Layers, Search, AlertCircle } from 'lucide-react';

export const AdminCoursesPage: React.FC = () => {
  const { session } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadAdminCourses() {
      const token = session?.access_token;
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetchAdminCourses(token);
        if (cancelled) return;
        if (res?.success && res.courses) {
          setCourses(res.courses);
          setError(null);
        } else {
          setError(res?.error || 'Courses could not be loaded.');
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Courses could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAdminCourses();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) => c.title?.toLowerCase().includes(q) || c.slug?.toLowerCase().includes(q)
    );
  }, [courses, searchTerm]);

  const publishedCount = courses.filter((c) => c.status === 'PUBLISHED').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Course library"
          description="Every course in the catalogue with its module count and the career paths it belongs to."
          meta={
            !loading && !error ? (
              <Badge variant="neutral">
                {publishedCount} published of {courses.length}
              </Badge>
            ) : undefined
          }
        />

        <AdminTableCard>
          <AdminTableToolbar>
            <Input
              placeholder="Search by course title or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              aria-label="Search courses"
            />
          </AdminTableToolbar>

          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={8} cols={5} />
            </div>
          ) : error ? (
            <EmptyState
              icon={<AlertCircle className="h-6 w-6" />}
              title="Courses could not be loaded"
              description={error}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title={searchTerm ? 'No courses match that search' : 'No courses in the catalogue'}
              description={
                searchTerm
                  ? 'Try a different course title or slug.'
                  : 'Courses created in the curriculum editor will be listed here.'
              }
            />
          ) : (
            <>
              <AdminTableScroll>
                <AdminTable>
                  <AdminThead>
                    <tr>
                      <AdminTh>Course</AdminTh>
                      <AdminTh>Level</AdminTh>
                      <AdminTh>Status</AdminTh>
                      <AdminTh align="center">Modules</AdminTh>
                      <AdminTh>Career paths</AdminTh>
                    </tr>
                  </AdminThead>
                  <AdminTbody>
                    {filtered.map((course) => (
                      <AdminTr key={course.id}>
                        <AdminTd>
                          <div className="min-w-0">
                            <div className="max-w-80 truncate font-semibold text-slate-900">
                              {course.title}
                            </div>
                            <div className="max-w-80 truncate font-mono text-[11px] text-indigo-600">
                              {course.slug}
                            </div>
                          </div>
                        </AdminTd>
                        <AdminTd>
                          <Badge variant="primary">{course.difficulty || '—'}</Badge>
                        </AdminTd>
                        <AdminTd>
                          <Badge
                            variant={course.status === 'PUBLISHED' ? 'success' : 'warning'}
                            dot
                          >
                            {course.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                          </Badge>
                        </AdminTd>
                        <AdminTd align="center">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] font-bold tabular-nums text-slate-700">
                            <Layers className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                            {course.module_count ?? 0}
                          </span>
                        </AdminTd>
                        <AdminTd>
                          <div className="flex max-w-100 flex-wrap gap-1">
                            {course.associated_paths?.length ? (
                              course.associated_paths.map((pathName: string, idx: number) => (
                                <Badge key={idx} variant="neutral">
                                  {pathName.replace(' Career Path', '')}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[12px] text-slate-500">Unassigned</span>
                            )}
                          </div>
                        </AdminTd>
                      </AdminTr>
                    ))}
                  </AdminTbody>
                </AdminTable>
              </AdminTableScroll>
              <AdminTableFooter>
                <span>
                  Showing {filtered.length} of {courses.length}
                </span>
              </AdminTableFooter>
            </>
          )}
        </AdminTableCard>
      </div>
    </AdminLayout>
  );
};
