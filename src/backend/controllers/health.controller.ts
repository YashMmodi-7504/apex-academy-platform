import { Request, Response } from 'express';
import { checkDatabaseHealth } from '../database/connection.ts';
import { checkSupabaseConnectivity } from '../database/supabaseAdmin.ts';

export async function getHealth(req: Request, res: Response) {
  const [dbHealth, supabaseHealth] = await Promise.all([
    checkDatabaseHealth().catch(() => ({ connected: false, message: 'PG not connected' })),
    checkSupabaseConnectivity().catch((err: any) => ({ connected: false, message: err?.message || 'Supabase check failed', responseTimeMs: undefined })),
  ]);

  const envCheck = {
    PORT: process.env.PORT ? 'PRESENT' : 'DEFAULT_SET (3000)',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'CONFIGURED' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'CONFIGURED' : 'MISSING',
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'CONFIGURED' : 'MISSING',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'CONFIGURED' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV ? 'PRESENT' : 'DEFAULT_SET (development)',
    JWT_SECRET: process.env.JWT_SECRET ? 'PRESENT' : 'DEFAULT_SET',
  };

  return res.status(200).json({
    success: true,
    message: 'Apex Academy API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: supabaseHealth.connected || dbHealth.connected ? 'connected' : 'disconnected',
      supabase: {
        status: supabaseHealth.connected ? 'connected' : 'disconnected',
        details: supabaseHealth.message,
        responseTimeMs: supabaseHealth.responseTimeMs,
      },
      postgres: {
        status: dbHealth.connected ? 'connected' : 'disconnected',
        details: dbHealth.message,
      },
    },
    envCheck,
    version: '1.0.0-phase1',
  });
}


