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

/**
 * Realtime transport stub.
 *
 * supabase-js always constructs a RealtimeClient inside createClient(), and
 * RealtimeClient._initializeOptions resolves a WebSocket constructor eagerly:
 *
 *   result.transport = options?.transport ?? WebSocketFactory.getWebSocketConstructor()
 *
 * On a runtime without a global WebSocket (Node < 22) that factory throws
 * "Node.js detected but native WebSocket not found", which crashed the whole
 * Netlify Function at cold start and took every /api route down with it.
 *
 * Supplying `transport` short-circuits that lookup, so client construction no
 * longer depends on the Node version. This server only performs PostgREST and
 * auth calls over HTTP — it never opens a Realtime channel — so the stub is
 * never instantiated. It throws if anything ever does, rather than failing
 * silently.
 */
class UnsupportedRealtimeTransport {
  constructor() {
    throw new Error(
      'Realtime/WebSocket is not supported in the server-side Supabase client. ' +
        'This client is HTTP-only (PostgREST + auth).'
    );
  }
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      // See UnsupportedRealtimeTransport above.
      transport: UnsupportedRealtimeTransport as any,
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
