import React, { useRef } from 'react';
import { X, Printer, ShieldCheck, ExternalLink, Award } from 'lucide-react';
import { Button } from '../common/Button.tsx';

interface CertificateViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    id?: string;
    certificate_number?: string;
    certificate_code?: string;
    student_name?: string;
    course_title?: string;
    issued_at?: string;
    verification_url?: string;
    verification_status?: string;
  } | null;
}

export const CertificateViewerModal: React.FC<CertificateViewerModalProps> = ({
  isOpen,
  onClose,
  certificate
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !certificate) return null;

  const certNumber = certificate.certificate_number || certificate.certificate_code || 'APEX-2026-0000';
  const studentName = certificate.student_name || 'Apex Academy Student';
  const courseTitle = certificate.course_title || 'Statistics for Data & Analytics';
  const issuedDate = certificate.issued_at
    ? new Date(certificate.issued_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const verificationPath = certificate.verification_url || `/verify/${certNumber}`;
  const fullVerifyUrl = `${window.location.origin}${verificationPath}`;

  // Simple inline QR Code renderer using Google Chart API / QR Server API for exact SVG QR code
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(fullVerifyUrl)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 print:shadow-none print:my-0 print:w-full print:max-w-none">
        
        {/* Modal Toolbar (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">Official Apex Academy Certificate</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="w-4 h-4" />}
              className="text-white border-slate-700 hover:bg-slate-800"
            >
              Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Body */}
        <div ref={printRef} className="p-8 sm:p-14 bg-amber-50/30 border-8 border-slate-900 m-2 rounded-xl relative overflow-hidden print:p-12 print:border-4">
          
          {/* Subtle Decorative Corners */}
          <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-amber-500/40 pointer-events-none" />
          <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-amber-500/40 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-amber-500/40 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-amber-500/40 pointer-events-none" />

          {/* Certificate Content */}
          <div className="text-center space-y-6 relative z-10">
            
            {/* Header / Brand */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-indigo-900 font-semibold tracking-widest text-lg sm:text-xl uppercase">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                APEX ACADEMY
              </div>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Institute for Technology & Advanced Analytics</p>
            </div>

            {/* Title */}
            <div className="py-2">
              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight uppercase">
                Certificate of Completion
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-indigo-900 mx-auto mt-3 rounded-full" />
            </div>

            {/* Recipient Notice */}
            <p className="text-xs sm:text-sm text-slate-600 font-medium italic">
              This is to officially certify that
            </p>

            {/* Student Full Name */}
            <div className="py-1">
              <h2 className="text-2xl sm:text-4xl font-semibold text-indigo-950 tracking-tight underline decoration-amber-400/80 decoration-2 underline-offset-8">
                {studentName}
              </h2>
            </div>

            {/* Fulfillment Claim */}
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl mx-auto leading-relaxed">
              has successfully completed all required modules, theory-first core lessons, and formal graded assessments for the course credential:
            </p>

            {/* Course Title */}
            <div className="py-1">
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900">
                {courseTitle}
              </h3>
            </div>

            {/* Footer Signatures & Metadata Grid */}
            <div className="pt-8 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-left">
              
              {/* Verification QR & Code */}
              <div className="flex items-center gap-3">
                <img
                  src={qrCodeUrl}
                  alt="Certificate Verification QR Code"
                  className="w-16 h-16 rounded border border-slate-200 bg-white p-1"
                />
                <div className="text-[11px] space-y-0.5">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Verified Credential
                  </p>
                  <p className="text-slate-500 font-mono text-[10px]">{certNumber}</p>
                  <a
                    href={verificationPath}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-semibold hover:underline flex items-center gap-0.5 text-[10px] print:hidden"
                  >
                    Public Verification <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Apex Academic Seal */}
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-400 font-semibold text-xs flex items-center justify-center mx-auto border-2 border-amber-400/60 shadow-inner">
                  APEX
                </div>
                <p className="text-[10px] font-bold text-slate-700 tracking-wider uppercase">Academic Excellence</p>
              </div>

              {/* Date & Authorization */}
              <div className="text-right space-y-1 text-xs">
                <p className="text-slate-500 font-medium">Issue Date:</p>
                <p className="font-bold text-slate-900">{issuedDate}</p>
                <p className="text-[10px] text-slate-400 font-mono pt-1">Issuer: Apex Academy LMS</p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
