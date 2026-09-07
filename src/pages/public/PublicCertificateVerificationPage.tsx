import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  ArrowLeft,
  Calendar,
  FileText,
  Search,
} from 'lucide-react';
import { Button } from '../../components/common/Button.tsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.tsx';
import { verifyCertificatePublic } from '../../services/api.ts';
import { CertificateViewerModal } from '../../components/student/CertificateViewerModal.tsx';

const Panel: React.FC<{ children: React.ReactNode; tone?: string }> = ({
  children,
  tone = 'border-slate-200',
}) => (
  <div className={`rounded-2xl border bg-white p-6 shadow-lg sm:p-9 ${tone}`}>
    {children}
  </div>
);

export const PublicCertificateVerificationPage: React.FC = () => {
  const { verificationCode, code } = useParams<{ verificationCode?: string; code?: string }>();
  const navigate = useNavigate();
  const activeCode = verificationCode || code || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<{
    verified: boolean;
    error?: string;
    certificate?: {
      certificate_number: string;
      student_name: string;
      course_title: string;
      issued_at: string;
      verification_status: string;
      verification_url: string;
    };
  } | null>(null);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [lookupCode, setLookupCode] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function verifyCode() {
      if (!activeCode) {
        setLoading(false);
        setResult(null);
        return;
      }

      setLoading(true);
      const res = await verifyCertificatePublic(activeCode);
      if (cancelled) return;
      setResult(res);
      setLoading(false);
    }

    verifyCode();
    return () => { cancelled = true; };
  }, [activeCode]);

  const cert = result?.certificate;
  const issuedDateStr = cert?.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const next = lookupCode.trim();
    if (next) navigate(`/verify/${encodeURIComponent(next)}`);
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 p-4 text-slate-900 sm:p-8">
      {/* ---- Brand bar ---- */}
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 border-b border-slate-200 py-4">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 text-lg font-semibold tracking-tight text-slate-900"
        >
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
          <span className="truncate">APEX ACADEMY</span>
        </Link>
        <Link to="/login" className="shrink-0">
          <Button
            variant="outline"
            size="sm"
          >
            Sign in
          </Button>
        </Link>
      </div>

      {/* ---- Result ---- */}
      <div className="mx-auto my-12 w-full max-w-2xl">
        {loading && activeCode ? (
          <Panel>
            <div className="py-8 text-center">
              <LoadingSpinner size="lg" text="Checking this certificate…" />
            </div>
          </Panel>
        ) : !activeCode ? (
          /* ---- Lookup form: reaching the portal without a code ---- */
          <Panel>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                <Award className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
                Verify a certificate
              </h1>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                Enter the certificate code printed on the credential to check it against the Apex
                Academy record.
              </p>
            </div>

            <form onSubmit={handleLookup} className="mt-7 flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder="Certificate code"
                  aria-label="Certificate code"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 font-mono text-sm text-slate-900 shadow-xs placeholder:font-sans placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="shrink-0"
                disabled={!lookupCode.trim()}
              >
                Verify
              </Button>
            </form>
          </Panel>
        ) : result?.verified && cert ? (
          /* ---- Verified ---- */
          <Panel tone="border-emerald-300">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <ShieldCheck className="h-7 w-7 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                  Status
                </span>
                <h1 className="text-lg font-semibold text-slate-900">Certificate verified</h1>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <span className="text-[12px] font-medium text-slate-500">Recipient</span>
                <p className="mt-0.5 text-2xl font-semibold leading-tight text-slate-900">
                  {cert.student_name}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
                    <Award className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    Course
                  </span>
                  <p className="mt-1 text-[13px] font-bold text-slate-900">{cert.course_title}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                    Issued
                  </span>
                  <p className="mt-1 text-[13px] font-bold text-slate-900">{issuedDateStr}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="min-w-0">
                  <span className="text-[12px] font-medium text-slate-500">Certificate code</span>
                  <p className="mt-0.5 break-all font-mono text-[12.5px] font-bold text-amber-700">
                    {cert.certificate_number}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  Valid record
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="primary"
                onClick={() => setShowModal(true)}
                icon={<FileText className="h-4 w-4" />}
              >
                View certificate
              </Button>
              <Link to="/">
                <Button
                  variant="outline"
                  icon={<ArrowLeft className="h-4 w-4" />}
                  fullWidth
                >
                  Back to homepage
                </Button>
              </Link>
            </div>
          </Panel>
        ) : (
          /* ---- Not found ---- */
          <Panel tone="border-rose-300">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <span className="mt-5 inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-rose-700">
                Verification failed
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                No certificate found
              </h1>
              <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-slate-600">
                The code{' '}
                <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-amber-700">
                  {activeCode}
                </code>{' '}
                does not match an issued certificate.
              </p>
            </div>

            <form onSubmit={handleLookup} className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="Try another code"
                aria-label="Certificate code"
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 shadow-xs placeholder:font-sans placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
              />
              <Button
                type="submit"
                variant="primary"
                className="shrink-0"
                disabled={!lookupCode.trim()}
              >
                Verify
              </Button>
            </form>
          </Panel>
        )}
      </div>

      {cert && (
        <CertificateViewerModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          certificate={cert}
        />
      )}

      <div className="border-t border-slate-200 py-4 text-center text-[12px] text-slate-500">
        Apex Academy certificate verification
      </div>
    </div>
  );
};
