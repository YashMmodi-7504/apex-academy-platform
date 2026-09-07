import { Request, Response } from 'express';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';

/**
 * GET /api/admin/content
 * Fetch all articles/content for Admin Content Page
 */
export async function getAdminContent(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching admin content:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch content' });
  }
}

/**
 * GET /api/admin/certificates
 * Fetch all certificates for Admin Certificates Page
 */
export async function getAdminCertificates(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select(`
        *,
        profiles:user_id(full_name, email),
        courses:course_id(title)
      `)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching admin certificates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch certificates' });
  }
}

/**
 * GET /api/admin/assessments
 * Fetch all assessments for Admin Assessments Page
 */
export async function getAdminAssessments(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('assessments')
      .select(`
        *,
        courses:course_id(title)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching admin assessments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assessments' });
  }
}

/**
 * GET /api/admin/inquiries
 * Fetch all counselor leads for Admin Inquiries Page
 */
export async function getAdminInquiries(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('counselor_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching admin inquiries:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inquiries' });
  }
}

/**
 * GET /api/admin/programs
 * Fetch all programs for Admin Programs Page
 */
export async function getAdminPrograms(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('programs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching admin programs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch programs' });
  }
}

/**
 * GET /api/admin/students
 * Fetch all students for Admin Students Page
 */
export async function getAdminStudents(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'STUDENT')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching admin students:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
}
