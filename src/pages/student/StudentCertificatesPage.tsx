import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StudentLayout } from '../../components/layout/StudentLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Card } from '../../components/common/Card.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { fetchMyCertificates } from '../../services/api.ts';
import { CertificateViewerModal } from '../../components/student/CertificateViewerModal.tsx';
import { Award, ExternalLink, FileText, ArrowRight } from 'lucide-react';

export const StudentCertificatesPage: React.FC = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [selectedCert, setSelectedCert] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCertificates() {
      const token = session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await fetchMyCertificates(token);
      if (cancelled) return;
      if (res.success) setCertificates(res.certificates || []);
      setLoading(false);
    }
    loadCertificates();
    return () => { cancelled = true; };
  }, [session]);

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Certificates
          </h1>
          <p className="mt-1.5 text-[13px] text-slate-500">
            Credentials issued for the courses you have completed, each with a public verification
            link.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon={<Award className="h-6 w-6" />}
              title="No certificates yet"
              description="Complete every required lesson and pass the assessments in a course to earn its certificate."
              action={
                <Link to="/student/my-learning">
                  <Button variant="primary" iconRight={<ArrowRight className="h-4 w-4" />}>
                    Go to my learning
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {certificates.map((cert) => {
              const issuedDate = cert.issued_at
                ? new Date(cert.issued_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : null;

              return (
                <Card
                  key={cert.id}
                  className="flex flex-col p-6 transition-colors hover:border-amber-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
                        <Award className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold leading-snug text-slate-900">
                          {cert.course_title}
                        </h3>
                        {issuedDate && (
                          <p className="mt-0.5 text-[12px] text-slate-500">Issued {issuedDate}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="success" size="sm" dot>
                      Verified
                    </Badge>
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Certificate ID
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[12.5px] font-semibold text-slate-700">
                      {cert.certificate_number}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedCert(cert)}
                      icon={<FileText className="h-4 w-4" />}
                    >
                      View
                    </Button>
                    <Link
                      to={`/verify/${cert.certificate_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        iconRight={<ExternalLink className="h-3.5 w-3.5" />}
                      >
                        Verification page
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selectedCert && (
        <CertificateViewerModal
          isOpen={!!selectedCert}
          onClose={() => setSelectedCert(null)}
          certificate={selectedCert}
        />
      )}
    </StudentLayout>
  );
};
