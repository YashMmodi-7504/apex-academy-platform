import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/**
 * Certificate verification lives in PublicCertificateVerificationPage, which
 * calls the server-side lookup. This module previously rendered a second,
 * self-contained "verification portal" that was never wired to any route: it
 * reported "AUTHENTIC & VERIFIED" for whatever ID was typed in, without making
 * a request, and filled the result card with a made-up learner name, course and
 * a co-issuing university that has no relationship to the platform.
 *
 * Rather than leave a component that would validate a forged credential if it
 * were ever routed, it now redirects to the real verification page.
 */
export const VerifyCertificatePage: React.FC = () => {
  const { certificateId } = useParams();
  return (
    <Navigate to={certificateId ? `/verify/${certificateId}` : '/verify-certificate'} replace />
  );
};
