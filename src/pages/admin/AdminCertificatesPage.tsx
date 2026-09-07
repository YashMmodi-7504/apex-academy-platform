import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout.tsx';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader.tsx';
import {
  AdminIconButton,
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
import { fetchAdminCertificates } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Search, Shield, Eye, AlertCircle } from 'lucide-react';

export const AdminCertificatesPage: React.FC = () => {
  const { session } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCerts() {
      const token = session?.access_token;
      if (!token) return;
      try {
        const res = await fetchAdminCertificates(token);
        if (cancelled) return;
        if (res?.success) setCertificates(res.data || []);
        else setError(res?.error || 'Certificates could not be loaded.');
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Certificates could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCerts();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  const filteredCerts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter((cert) => {
      const studentName = cert.profiles?.full_name || '';
      const courseTitle = cert.courses?.title || '';
      return (
        studentName.toLowerCase().includes(q) ||
        courseTitle.toLowerCase().includes(q) ||
        String(cert.certificate_code || '').toLowerCase().includes(q)
      );
    });
  }, [certificates, searchTerm]);

  const validCount = certificates.filter((c) => c.verification_status === 'VALID').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Issued certificates"
          description="Audit trail of every certificate record and its public verification status."
          meta={
            !loading && !error ? (
              <Badge variant="success" dot>
                {validCount} valid of {certificates.length}
              </Badge>
            ) : undefined
          }
        />

        <AdminTableCard>
          <AdminTableToolbar>
            <Input
              placeholder="Search by student, course or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              aria-label="Search certificates"
            />
          </AdminTableToolbar>

          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={6} cols={6} />
            </div>
          ) : error ? (
            <EmptyState
              icon={<AlertCircle className="h-6 w-6" />}
              title="Certificates could not be loaded"
              description={error}
            />
          ) : filteredCerts.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-6 w-6" />}
              title={searchTerm ? 'No certificates match that search' : 'No certificates issued yet'}
              description={
                searchTerm
                  ? 'Try a student name, course title or certificate code.'
                  : 'Certificates appear here once learners complete a certified course.'
              }
            />
          ) : (
            <>
              <AdminTableScroll>
                <AdminTable>
                  <AdminThead>
                    <tr>
                      <AdminTh>Certificate code</AdminTh>
                      <AdminTh>Student</AdminTh>
                      <AdminTh>Course</AdminTh>
                      <AdminTh>Issued</AdminTh>
                      <AdminTh>Status</AdminTh>
                      <AdminTh align="right">Actions</AdminTh>
                    </tr>
                  </AdminThead>
                  <AdminTbody>
                    {filteredCerts.map((cert) => (
                      <AdminTr key={cert.id}>
                        <AdminTd>
                          <div className="flex items-center gap-2">
                            <Shield
                              className={`h-4 w-4 shrink-0 ${
                                cert.verification_status === 'VALID'
                                  ? 'text-emerald-500'
                                  : 'text-slate-300'
                              }`}
                            />
                            <span className="font-mono text-[12px] font-bold text-slate-700">
                              {cert.certificate_code}
                            </span>
                          </div>
                        </AdminTd>
                        <AdminTd className="font-semibold text-slate-900">
                          {cert.profiles?.full_name || 'Unknown student'}
                        </AdminTd>
                        <AdminTd className="text-slate-600">
                          <span className="block max-w-75 truncate">
                            {cert.courses?.title || 'Unknown course'}
                          </span>
                        </AdminTd>
                        <AdminTd className="whitespace-nowrap font-mono text-[12px] text-slate-500">
                          {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : '—'}
                        </AdminTd>
                        <AdminTd>
                          <Badge
                            variant={cert.verification_status === 'VALID' ? 'success' : 'danger'}
                            dot
                          >
                            {cert.verification_status}
                          </Badge>
                        </AdminTd>
                        <AdminTd align="right">
                          <div className="flex items-center justify-end gap-1">
                            <AdminIconButton label="View certificate">
                              <Eye className="h-4 w-4" />
                            </AdminIconButton>
                          </div>
                        </AdminTd>
                      </AdminTr>
                    ))}
                  </AdminTbody>
                </AdminTable>
              </AdminTableScroll>
              <AdminTableFooter>
                <span>
                  Showing {filteredCerts.length} of {certificates.length}
                </span>
              </AdminTableFooter>
            </>
          )}
        </AdminTableCard>
      </div>
    </AdminLayout>
  );
};
