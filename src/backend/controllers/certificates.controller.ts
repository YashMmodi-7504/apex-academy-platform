import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import {
  issueCertificateForUser,
  getMyCertificates,
  getCertificateForOwner,
  verifyPublicCertificate
} from '../services/certificate.service.ts';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';

/**
 * Claim / issue certificate for authenticated user
 * POST /api/courses/:courseId/certificate
 */
export async function issueCertificateHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { courseId } = req.params;
    if (!courseId) {
      res.status(400).json({ success: false, error: 'Course ID is required' });
      return;
    }

    // Resolve course slug or ID if slug passed
    let resolvedCourseId = courseId;
    if (!courseId.includes('-') || courseId.length < 32) {
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('slug', courseId)
        .maybeSingle();

      if (course) {
        resolvedCourseId = course.id;
      }
    }

    const result = await issueCertificateForUser(userId, resolvedCourseId);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      newlyIssued: result.newlyIssued,
      certificate: result.certificate
    });
  } catch (error: any) {
    console.error('Error in issueCertificateHandler:', error);
    res.status(500).json({ success: false, error: error?.message || 'Server error issuing certificate' });
  }
}

/**
 * Get all certificates for authenticated user
 * GET /api/me/certificates
 */
export async function getMyCertificatesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const certificates = await getMyCertificates(userId);
    res.json({
      success: true,
      certificates
    });
  } catch (error: any) {
    console.error('Error in getMyCertificatesHandler:', error);
    res.status(500).json({ success: false, error: error?.message || 'Server error fetching certificates' });
  }
}

/**
 * Get specific certificate detail for owner
 * GET /api/me/certificates/:certificateId
 */
export async function getCertificateByIdHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { certificateId } = req.params;
    if (!certificateId) {
      res.status(400).json({ success: false, error: 'Certificate ID is required' });
      return;
    }

    const result = await getCertificateForOwner(userId, certificateId);
    if (!result.success) {
      res.status(403).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      certificate: result.certificate
    });
  } catch (error: any) {
    console.error('Error in getCertificateByIdHandler:', error);
    res.status(500).json({ success: false, error: error?.message || 'Server error fetching certificate' });
  }
}

/**
 * Public certificate verification endpoint (NO auth required)
 * GET /api/certificates/verify/:verificationCode
 */
export async function verifyPublicCertificateHandler(req: Request, res: Response): Promise<void> {
  try {
    const { verificationCode } = req.params;
    if (!verificationCode) {
      res.status(400).json({ verified: false, error: 'Verification code is required' });
      return;
    }

    const result = await verifyPublicCertificate(verificationCode);
    if (!result.verified) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error in verifyPublicCertificateHandler:', error);
    res.status(500).json({ verified: false, error: error?.message || 'Server error verifying certificate' });
  }
}
