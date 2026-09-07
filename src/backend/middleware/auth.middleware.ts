import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../database/supabaseAdmin.ts';
import { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  profile?: {
    id: string;
    role: string;
    full_name: string | null;
  };
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore token verification errors for optional authentication
    }
  }
  next();
}

/**
 * Middleware requiring a valid Supabase bearer token in the Authorization header.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or malformed Authorization header.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: `Unauthorized: ${error?.message || 'Invalid or expired session token.'}`,
      });
      return;
    }

    req.user = user;

    // Attach profile if available
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      req.profile = profile;
    }

    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Authentication failed: ${err?.message || 'Internal server error'}`,
    });
  }
}

/**
 * Middleware requiring both a valid Supabase auth token AND verified ADMIN role in public.profiles.
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, async () => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No user found on request.',
      });
      return;
    }

    try {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Profile record not found.',
        });
        return;
      }

      if (profile.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required.',
        });
        return;
      }

      req.profile = profile;
      next();
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: `Authorization check failed: ${err?.message || 'Internal server error'}`,
      });
    }
  });
}
