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
import { fetchAdminContent } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Search, FileText, AlertCircle } from 'lucide-react';

export const AdminContentPage: React.FC = () => {
  const { session } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadContent() {
      const token = session?.access_token;
      if (!token) return;
      try {
        const res = await fetchAdminContent(token);
        if (cancelled) return;
        if (res?.success) setContent(res.data || []);
        else setError(res?.error || 'Articles could not be loaded.');
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Articles could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadContent();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  const filteredContent = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return content;
    return content.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) || item.author?.toLowerCase().includes(q)
    );
  }, [content, searchTerm]);

  const publishedCount = content.filter((c) => c.is_published).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Articles & stories"
          description="Editorial content served on the public site, with its publication state."
          meta={
            !loading && !error ? (
              <Badge variant="neutral">
                {publishedCount} published of {content.length}
              </Badge>
            ) : undefined
          }
        />

        <AdminTableCard>
          <AdminTableToolbar>
            <Input
              placeholder="Search by title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              aria-label="Search articles"
            />
          </AdminTableToolbar>

          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={6} cols={4} />
            </div>
          ) : error ? (
            <EmptyState
              icon={<AlertCircle className="h-6 w-6" />}
              title="Articles could not be loaded"
              description={error}
            />
          ) : filteredContent.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title={searchTerm ? 'No articles match that search' : 'No articles yet'}
              description={
                searchTerm
                  ? 'Try a different title or author name.'
                  : 'Published articles and success stories will be listed here.'
              }
            />
          ) : (
            <>
              <AdminTableScroll>
                <AdminTable>
                  <AdminThead>
                    <tr>
                      <AdminTh>Title</AdminTh>
                      <AdminTh>Author</AdminTh>
                      <AdminTh>Status</AdminTh>
                      <AdminTh>Created</AdminTh>
                    </tr>
                  </AdminThead>
                  <AdminTbody>
                    {filteredContent.map((item) => (
                      <AdminTr key={item.id}>
                        <AdminTd>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="block max-w-90 truncate font-semibold text-slate-900">
                              {item.title}
                            </span>
                          </div>
                        </AdminTd>
                        <AdminTd className="text-slate-600">{item.author || '—'}</AdminTd>
                        <AdminTd>
                          <Badge variant={item.is_published ? 'success' : 'warning'} dot>
                            {item.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </AdminTd>
                        <AdminTd className="whitespace-nowrap font-mono text-[12px] text-slate-500">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                        </AdminTd>
                      </AdminTr>
                    ))}
                  </AdminTbody>
                </AdminTable>
              </AdminTableScroll>
              <AdminTableFooter>
                <span>
                  Showing {filteredContent.length} of {content.length}
                </span>
              </AdminTableFooter>
            </>
          )}
        </AdminTableCard>
      </div>
    </AdminLayout>
  );
};
