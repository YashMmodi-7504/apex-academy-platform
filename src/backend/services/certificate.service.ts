import { supabaseAdmin } from '../database/supabaseAdmin.ts';
import { evaluateCourseCompletion } from './courseCompletion.service.ts';
import crypto from 'crypto';

export interface IssuedCertificate {
  id: string;
  certificate_code: string;
  certificate_number: string;
  user_id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  student_name: string;
  issued_at: string;
  verification_url: string;
  verification_status: string;
}

export interface PublicVerificationResult {
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
}

/**
 * Issue a certificate for a user if course completion criteria are met.
 * NON-BLOCKING & IDEMPOTENT.
 */
export async function issueCertificateForUser(userId: string, courseId: string): Promise<{ success: boolean; certificate?: IssuedCertificate; error?: string; newlyIssued?: boolean }> {
  try {
    // 1. Check authoritative completion eligibility
    const completion = await evaluateCourseCompletion(userId, courseId, { skipAutoCert: true });
    if (!completion.courseCompleted || !completion.certificateEligible) {
      return {
        success: false,
        error: 'Course not completed or not eligible for certificate'
      };
    }

    // 2. Check if certificate already exists (Duplicate Prevention)
    const { data: existingCert } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    // 3. Get Student Name from public.profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle();

    const studentName = profile?.full_name || 'Apex Academy Student';

    // 4. Get Course Title
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('title, slug')
      .eq('id', courseId)
      .single();

    const courseTitle = course?.title || 'Course';
    const courseSlug = course?.slug || '';

    if (existingCert) {
      return {
        success: true,
        newlyIssued: false,
        certificate: {
          id: existingCert.id,
          certificate_code: existingCert.certificate_code,
          certificate_number: existingCert.certificate_code,
          user_id: existingCert.user_id,
          course_id: existingCert.course_id,
          course_title: courseTitle,
          course_slug: courseSlug,
          student_name: studentName,
          issued_at: existingCert.issued_at,
          verification_url: `/verify/${existingCert.certificate_code}`,
          verification_status: existingCert.verification_status || 'VALID'
        }
      };
    }

    // 5. Generate globally unique non-sequential certificate code
    const randomHash = crypto.randomBytes(4).toString('hex').toUpperCase();
    const year = new Date().getFullYear();
    const certCode = `APEX-STAT-${year}-${randomHash}`;

    const newId = crypto.randomUUID();
    const issuedAt = new Date().toISOString();

    const { data: newCert, error: insertErr } = await supabaseAdmin
      .from('certificates')
      .insert({
        id: newId,
        user_id: userId,
        course_id: courseId,
        certificate_code: certCode,
        issued_at: issuedAt,
        verification_status: 'VALID'
      })
      .select('*')
      .single();

    if (insertErr) {
      console.error('Certificate insert error:', insertErr.message);
      return { success: false, error: insertErr.message };
    }

    return {
      success: true,
      newlyIssued: true,
      certificate: {
        id: newCert.id,
        certificate_code: newCert.certificate_code,
        certificate_number: newCert.certificate_code,
        user_id: newCert.user_id,
        course_id: newCert.course_id,
        course_title: courseTitle,
        course_slug: courseSlug,
        student_name: studentName,
        issued_at: newCert.issued_at,
        verification_url: `/verify/${newCert.certificate_code}`,
        verification_status: newCert.verification_status || 'VALID'
      }
    };
  } catch (err: any) {
    console.error('Certificate issuance exception:', err);
    return { success: false, error: err?.message || 'Certificate issuance failed' };
  }
}

/**
 * Fetch all certificates for authenticated user.
 */
export async function getMyCertificates(userId: string): Promise<IssuedCertificate[]> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  const studentName = profile?.full_name || 'Apex Academy Student';

  const { data: certs } = await supabaseAdmin
    .from('certificates')
    .select('*, courses(id, title, slug)')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (!certs) return [];

  return certs.map((c: any) => ({
    id: c.id,
    certificate_code: c.certificate_code,
    certificate_number: c.certificate_code,
    user_id: c.user_id,
    course_id: c.course_id,
    course_title: c.courses?.title || 'Course',
    course_slug: c.courses?.slug || '',
    student_name: studentName,
    issued_at: c.issued_at,
    verification_url: `/verify/${c.certificate_code}`,
    verification_status: c.verification_status || 'VALID'
  }));
}

/**
 * Fetch specific certificate for authenticated owner (Cross-user protected).
 */
export async function getCertificateForOwner(userId: string, certificateId: string): Promise<{ success: boolean; certificate?: IssuedCertificate; error?: string }> {
  const { data: cert } = await supabaseAdmin
    .from('certificates')
    .select('*, courses(id, title, slug)')
    .eq('id', certificateId)
    .maybeSingle();

  if (!cert) {
    return { success: false, error: 'Certificate not found' };
  }

  if (cert.user_id !== userId) {
    return { success: false, error: 'Access denied: You can only access your own certificates' };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  const studentName = profile?.full_name || 'Apex Academy Student';

  return {
    success: true,
    certificate: {
      id: cert.id,
      certificate_code: cert.certificate_code,
      certificate_number: cert.certificate_code,
      user_id: cert.user_id,
      course_id: cert.course_id,
      course_title: cert.courses?.title || 'Course',
      course_slug: cert.courses?.slug || '',
      student_name: studentName,
      issued_at: cert.issued_at,
      verification_url: `/verify/${cert.certificate_code}`,
      verification_status: cert.verification_status || 'VALID'
    }
  };
}

/**
 * Public Verification API (No authentication required).
 * Returns ONLY safe metadata.
 */
export async function verifyPublicCertificate(code: string): Promise<PublicVerificationResult> {
  if (!code || typeof code !== 'string') {
    return { verified: false, error: 'CERTIFICATE NOT FOUND' };
  }

  const cleanCode = code.trim();

  // Try exact match or code prefixed
  const { data: cert } = await supabaseAdmin
    .from('certificates')
    .select('certificate_code, user_id, course_id, issued_at, verification_status, courses(title)')
    .or(`certificate_code.eq.${cleanCode},certificate_code.eq.APEX-STAT-2026-${cleanCode}`)
    .maybeSingle();

  if (!cert || cert.verification_status !== 'VALID') {
    return { verified: false, error: 'CERTIFICATE NOT FOUND' };
  }

  // Retrieve student name from profiles
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', cert.user_id)
    .maybeSingle();

  const studentName = profile?.full_name || 'Apex Academy Student';
  const courseTitle = (cert as any).courses?.title || 'Statistics for Data & Analytics';

  return {
    verified: true,
    certificate: {
      certificate_number: cert.certificate_code,
      student_name: studentName,
      course_title: courseTitle,
      issued_at: cert.issued_at,
      verification_status: cert.verification_status || 'VALID',
      verification_url: `/verify/${cert.certificate_code}`
    }
  };
}
