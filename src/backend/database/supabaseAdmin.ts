import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const isValidHttpUrl = (urlStr?: string): boolean => {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail-closed configuration.
// The service-role client bypasses all Row Level Security, so it must never be
// constructed from a hardcoded fallback or a partial configuration. If either
// value is missing the process stops here, before any privileged client exists.
// Error messages name the missing variable only — never any part of its value.
if (!isValidHttpUrl(rawUrl)) {
  throw new Error(
    'Supabase configuration error: SUPABASE_URL (or VITE_SUPABASE_URL) is missing or is not a valid http(s) URL. Set it in the environment before starting the server.'
  );
}

if (!rawKey || rawKey.trim().length === 0 || rawKey.trim() === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
  throw new Error(
    'Supabase configuration error: SUPABASE_SERVICE_ROLE_KEY is missing, empty, or still set to the placeholder value. Set it in the environment before starting the server.'
  );
}

const supabaseUrl = rawUrl!.trim();
const supabaseServiceKey = rawKey.trim();

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Perform a real backend query against Supabase to verify connectivity
 */
export async function checkSupabaseConnectivity(): Promise<{
  connected: boolean;
  message: string;
  responseTimeMs?: number;
}> {
  const startTime = Date.now();
  try {
    const { error } = await supabaseAdmin.auth.getSession();
    const responseTimeMs = Date.now() - startTime;
    if (error) {
      return {
        connected: false,
        message: `Supabase Auth error: ${error.message}`,
        responseTimeMs,
      };
    }
    return {
      connected: true,
      message: 'Supabase service-role client connected and authenticated successfully',
      responseTimeMs,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Supabase connection failed: ${err?.message || 'Unknown error'}`,
      responseTimeMs: Date.now() - startTime,
    };
  }
}
