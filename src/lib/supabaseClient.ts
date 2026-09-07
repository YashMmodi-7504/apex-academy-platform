import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const DEFAULT_SUPABASE_URL = 'https://zbbxnfovtxcbzgykipev.supabase.co';
const DEFAULT_ANON_KEY = 'sb_publishable_lQxL9ucwfioFTn3-2Y1iOQ_FsEiBA27';

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

const supabaseUrl = isValidHttpUrl(rawUrl) ? rawUrl!.trim() : DEFAULT_SUPABASE_URL;
const supabaseAnonKey = rawKey && rawKey.trim().length > 0 && rawKey !== 'YOUR_SUPABASE_ANON_KEY' ? rawKey.trim() : DEFAULT_ANON_KEY;

if (!rawUrl || !isValidHttpUrl(rawUrl)) {
  console.warn('[Supabase Client]: Using default valid Supabase URL endpoint.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  },
});

const isValidJwt = (tokenStr: any): boolean => {
  if (!tokenStr || typeof tokenStr !== 'string') return false;
  const trimmed = tokenStr.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return false;
  }
  const segments = trimmed.split('.');
  return segments.length === 3 && segments.every((s) => s.length > 0);
};

export const getAuthToken = (): string | null => {
  // 1. Check explicit apex_token
  const directToken = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
  if (isValidJwt(directToken)) return directToken!.trim();

  // 2. Dynamically scan localStorage & sessionStorage for Supabase Auth keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth-token') || key.startsWith('sb-'))) {
        const val = localStorage.getItem(key);
        if (val) {
          if (isValidJwt(val)) return val.trim();
          try {
            const parsed = JSON.parse(val);
            const token = parsed?.access_token || parsed?.currentSession?.access_token;
            if (isValidJwt(token)) return token.trim();
          } catch {}
        }
      }
    }
  } catch {}

  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('auth-token') || key.startsWith('sb-'))) {
        const val = sessionStorage.getItem(key);
        if (val) {
          if (isValidJwt(val)) return val.trim();
          try {
            const parsed = JSON.parse(val);
            const token = parsed?.access_token || parsed?.currentSession?.access_token;
            if (isValidJwt(token)) return token.trim();
          } catch {}
        }
      }
    }
  } catch {}

  return null;
};

export const getAuthTokenAsync = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && isValidJwt(session.access_token)) {
      return session.access_token;
    }
  } catch (err) {
    console.error('[getAuthTokenAsync] Exception getting Supabase session:', err);
  }
  return getAuthToken();
};


