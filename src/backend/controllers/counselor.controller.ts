import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.ts';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';
import { TARGET_DOMAINS, EXPERIENCE_LEVELS, PREFERRED_CONTACT_METHODS } from '../../types/database.types.ts';

/**
 * Controller to handle consultation lead submissions for "Speak to a Career Advisor"
 * Strictly enforces real user data with zero synthetic fallback generation.
 */
export async function submitCounselorLead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { 
      name, 
      email, 
      phone, 
      target_domain, 
      experience_level, 
      preferred_contact_method, 
      message, 
      program_id 
    } = req.body;

    // 1. Validate Full Name
    const fullName = (name || '').toString().trim();
    if (!fullName || fullName.length < 2 || fullName.length > 100) {
      res.status(400).json({
        success: false,
        error: 'Please enter a valid full name (2–100 characters).'
      });
      return;
    }

    // 2. Validate Email Address
    const userEmail = (email || '').toString().trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userEmail || !emailRegex.test(userEmail) || userEmail.length > 150) {
      res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
      return;
    }

    // 3. Validate Phone / WhatsApp Number
    const phoneNumber = (phone || '').toString().trim();
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (!phoneNumber || cleanDigits.length < 7 || cleanDigits.length > 15) {
      res.status(400).json({
        success: false,
        error: 'Please enter a valid phone number (at least 7 digits).'
      });
      return;
    }

    // 4. Validate Target Domain
    const domain = (target_domain || '').toString().trim();
    if (!domain || !(TARGET_DOMAINS as readonly string[]).includes(domain)) {
      res.status(400).json({
        success: false,
        error: 'Please select a valid Target Domain.'
      });
      return;
    }

    // 5. Validate Experience Level
    const expLevel = (experience_level || '').toString().trim();
    if (!expLevel || !(EXPERIENCE_LEVELS as readonly string[]).includes(expLevel)) {
      res.status(400).json({
        success: false,
        error: 'Please select a valid Experience Level.'
      });
      return;
    }

    // 6. Validate Preferred Contact Method
    const contactMethod = (preferred_contact_method || '').toString().trim();
    if (!contactMethod || !(PREFERRED_CONTACT_METHODS as readonly string[]).includes(contactMethod)) {
      res.status(400).json({
        success: false,
        error: 'Please select a valid Preferred Contact Method.'
      });
      return;
    }

    // 7. Validate Optional Message / Query
    let userMessage: string | null = null;
    if (message && typeof message === 'string' && message.trim().length > 0) {
      userMessage = message.trim().slice(0, 1000);
    }

    // 8. Assemble insert payload with strictly user-submitted fields
    const fullInsertData: Record<string, any> = {
      name: fullName,
      email: userEmail,
      phone: phoneNumber,
      target_domain: domain,
      experience_level: expLevel,
      preferred_contact_method: contactMethod,
      message: userMessage,
      program_id: program_id || null,
      status: 'NEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let newLead: any = null;

    const { data: leadResult, error: insertError } = await supabaseAdmin
      .from('counselor_leads')
      .insert(fullInsertData)
      .select('*')
      .single();

    if (insertError) {
      // Fallback handling if schema migration 00003 is pending execution on live database
      if (insertError.message?.includes('target_domain') || insertError.message?.includes('preferred_contact_method') || insertError.message?.includes('schema cache')) {
        console.warn('[submitCounselorLead] Target schema columns not in live DB yet. Fallback base insert.');
        const fallbackInsertData: Record<string, any> = {
          name: fullName,
          email: userEmail,
          phone: phoneNumber,
          experience_level: expLevel,
          message: userMessage,
          program_id: program_id || null,
          status: 'NEW',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: fallbackResult, error: fallbackError } = await supabaseAdmin
          .from('counselor_leads')
          .insert(fallbackInsertData)
          .select('*')
          .single();

        if (fallbackError) {
          console.error('[submitCounselorLead] Fallback insert failed:', fallbackError.message);
          res.status(500).json({
            success: false,
            error: "We couldn't submit your request. Please check your details and try again."
          });
          return;
        }
        newLead = fallbackResult;
      } else {
        console.error('[submitCounselorLead] Supabase insert failed:', insertError.message);
        res.status(500).json({
          success: false,
          error: "We couldn't submit your request. Please check your details and try again."
        });
        return;
      }
    } else {
      newLead = leadResult;
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! Your consultation request has been submitted. Our career advisor will contact you using your preferred contact method.',
      lead: newLead
    });
  } catch (err: any) {
    console.error('[submitCounselorLead] Server exception:', err);
    res.status(500).json({
      success: false,
      error: "We couldn't submit your request. Please check your details and try again."
    });
  }
}
