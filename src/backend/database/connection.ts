import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create PostgreSQL Connection Pool
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: connectionString || undefined,
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'apex_academy',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

/**
 * Checks PostgreSQL connectivity status safely by running a real query
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  message: string;
  databaseName?: string;
  dbTimestamp?: string;
  dbVersion?: string;
  responseTimeMs?: number;
}> {
  const startTime = Date.now();
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT current_database(), now(), version()');
      const responseTimeMs = Date.now() - startTime;
      const dbName = res.rows[0]?.current_database || 'unknown';
      const dbTimestamp = res.rows[0]?.now ? new Date(res.rows[0].now).toISOString() : undefined;
      const dbVersion = res.rows[0]?.version || undefined;
      return {
        connected: true,
        message: 'PostgreSQL database query SELECT NOW() executed successfully',
        databaseName: dbName,
        dbTimestamp,
        dbVersion,
        responseTimeMs,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return {
      connected: false,
      message: `PostgreSQL connection error: ${error?.message || 'Unable to connect to database host'}`,
    };
  }
}
