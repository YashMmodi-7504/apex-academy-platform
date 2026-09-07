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
import { fetchAdminInquiries } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Search, MessageSquare, Mail, AlertCircle } from 'lucide-react';

const STATUS_VARIANT: Record<string, 'danger' | 'warning' | 'success' | 'neutral'> = {
  NEW: 'danger',
  CONTACTED: 'warning',
  CLOSED: 'success',
};

export const AdminInquiriesPage: React.FC = () => {
  const { session } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadInquiries() {
      const token = session?.access_token;
      if (!token) return;
      try {
        const res = await fetchAdminInquiries(token);
        if (cancelled) return;
        if (res?.success) setInquiries(res.data || []);
        else setError(res?.error || 'Inquiries could not be loaded.');
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Inquiries could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInquiries();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return inquiries;
    return inquiries.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.target_domain?.toLowerCase().includes(q)
    );
  }, [inquiries, searchTerm]);

  // Derived from the loaded rows — not a hardcoded figure.
  const openCount = inquiries.filter((i) => i.status && i.status !== 'CLOSED').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Inquiries"
          description="Counselling requests and enterprise contact submissions received from the public site."
          meta={
            !loading && !error ? (
              <Badge variant={openCount > 0 ? 'warning' : 'success'} dot>
                {openCount} open
              </Badge>
            ) : undefined
          }
        />

        <AdminTableCard>
          <AdminTableToolbar>
            <Input
              placeholder="Search by name, email or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              aria-label="Search inquiries"
            />
          </AdminTableToolbar>

          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={6} cols={5} />
            </div>
          ) : error ? (
            <EmptyState
              icon={<AlertCircle className="h-6 w-6" />}
              title="Inquiries could not be loaded"
              description={error}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-6 w-6" />}
              title={searchTerm ? 'No inquiries match that search' : 'No inquiries yet'}
              description={
                searchTerm
                  ? 'Try a different name, email address or career domain.'
                  : 'Submissions from the counselling and enterprise forms will appear here.'
              }
            />
          ) : (
            <>
              <AdminTableScroll>
                <AdminTable>
                  <AdminThead>
                    <tr>
                      <AdminTh>Contact</AdminTh>
                      <AdminTh>Interest</AdminTh>
                      <AdminTh>Received</AdminTh>
                      <AdminTh>Status</AdminTh>
                      <AdminTh align="right">Reply</AdminTh>
                    </tr>
                  </AdminThead>
                  <AdminTbody>
                    {filtered.map((item) => (
                      <AdminTr key={item.id}>
                        <AdminTd>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{item.name}</div>
                            <div className="truncate text-[12px] text-slate-500">{item.email}</div>
                          </div>
                        </AdminTd>
                        <AdminTd className="text-slate-700">
                          {item.target_domain || 'General inquiry'}
                        </AdminTd>
                        <AdminTd className="whitespace-nowrap font-mono text-[12px] text-slate-500">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                        </AdminTd>
                        <AdminTd>
                          <Badge variant={STATUS_VARIANT[item.status] || 'neutral'} dot>
                            {item.status || 'UNKNOWN'}
                          </Badge>
                        </AdminTd>
                        <AdminTd align="right">
                          {item.email ? (
                            <a
                              href={`mailto:${item.email}`}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span>Email</span>
                            </a>
                          ) : (
                            <span className="text-[12px] text-slate-500">—</span>
                          )}
                        </AdminTd>
                      </AdminTr>
                    ))}
                  </AdminTbody>
                </AdminTable>
              </AdminTableScroll>
              <AdminTableFooter>
                <span>
                  Showing {filtered.length} of {inquiries.length}
                </span>
              </AdminTableFooter>
            </>
          )}
        </AdminTableCard>
      </div>
    </AdminLayout>
  );
};
