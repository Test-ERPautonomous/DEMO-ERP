/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const ACTIVE_SUPABASE_URL = 'https://zigwijbljvsklepgbint.supabase.co';
export const ACTIVE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZ3dpamJsanZza2xlcGdiaW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjE2OTMsImV4cCI6MjEwNzM5NzY5M30.FLeyoB1ljjzo4LXv9wro_AeVNfPKOB20n_mnbzmRLwc';
export const OUTDATED_PROJECT_REFS = [
  'tpbihpzsfjpobqwdbrmm',
  'hqpuloqjsvvgrelsvrzo'
];

export interface SupabaseEnvValidation {
  isConfigured: boolean;
  hasUrl: boolean;
  hasKey: boolean;
  isUrlValidFormat: boolean;
  isKeyValidFormat: boolean;
  missingVariables: string[];
  validationErrors: string[];
  effectiveUrl: string;
  isDefaultFallback: boolean;
}

export function normalizeSupabaseUrl(stringUrl?: string): string {
  if (!stringUrl || typeof stringUrl !== 'string') return '';
  let trimmed = stringUrl.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed.replace(/\/+$/, '');
}

function isValidHttpUrl(stringUrl: string): boolean {
  if (!stringUrl || typeof stringUrl !== 'string') return false;
  const normalized = normalizeSupabaseUrl(stringUrl);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (normalized.includes('placeholder') || normalized.includes('your-project-id') || normalized.includes('unconfigured')) return false;
    // Reject outdated, deleted, or unresolvable Supabase project references
    for (const ref of OUTDATED_PROJECT_REFS) {
      if (normalized.includes(ref)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isServiceRoleKey(key?: string): boolean {
  if (!key || typeof key !== 'string') return false;
  return key.startsWith('sb_secret_') || key.toLowerCase().includes('service_role');
}

export function isValidAnonKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.includes('your-anon-public-key') || key.includes('placeholder') || key.length < 20) return false;
  // Security check: service-role secret key must NEVER be used on frontend
  if (isServiceRoleKey(key)) {
    return false;
  }
  // Check if JWT payload contains an outdated project reference
  if (key.includes('.')) {
    try {
      const parts = key.split('.');
      if (parts.length >= 2) {
        const payloadStr = typeof atob !== 'undefined'
          ? atob(parts[1])
          : Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        if (payload?.ref && OUTDATED_PROJECT_REFS.includes(payload.ref)) {
          return false;
        }
      }
    } catch {
      // ignore
    }
  }
  return true;
}

export function getEffectiveSupabaseUrl(): string {
  const candidateUrls: (string | undefined)[] = [
    (typeof window !== 'undefined' ? (window as any).__ENV__?.VITE_SUPABASE_URL : undefined),
    (typeof window !== 'undefined' ? (window as any).__ENV__?.SUPABASE_URL : undefined),
    ((import.meta as any).env?.VITE_SUPABASE_URL),
    ((import.meta as any).env?.SUPABASE_URL),
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined),
    (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : undefined),
  ];

  for (const raw of candidateUrls) {
    const normalized = normalizeSupabaseUrl(raw);
    if (normalized && isValidHttpUrl(normalized)) {
      return normalized;
    }
  }

  // Fallback: extract project ref from JWT anon key if present and not outdated
  for (const rawKey of [
    (typeof window !== 'undefined' ? (window as any).__ENV__?.VITE_SUPABASE_ANON_KEY : undefined),
    (typeof window !== 'undefined' ? (window as any).__ENV__?.SUPABASE_ANON_KEY : undefined),
    (typeof window !== 'undefined' ? (window as any).__ENV__?.SUPABASE_API_KEY : undefined),
    ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY),
    ((import.meta as any).env?.SUPABASE_ANON_KEY),
    ((import.meta as any).env?.SUPABASE_API_KEY),
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined),
    (typeof process !== 'undefined' ? process.env?.SUPABASE_ANON_KEY : undefined),
    (typeof process !== 'undefined' ? process.env?.SUPABASE_API_KEY : undefined),
  ]) {
    const trimmedKey = (rawKey || '').trim();
    if (trimmedKey && trimmedKey.includes('.')) {
      try {
        const parts = trimmedKey.split('.');
        if (parts.length >= 2) {
          const payloadStr = typeof atob !== 'undefined'
            ? atob(parts[1])
            : Buffer.from(parts[1], 'base64').toString('utf8');
          const payload = JSON.parse(payloadStr);
          if (payload?.ref && !OUTDATED_PROJECT_REFS.includes(payload.ref)) {
            return `https://${payload.ref}.supabase.co`;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // Active production Supabase project as single source of truth
  return ACTIVE_SUPABASE_URL;
}

export function getEffectiveSupabaseKey(): string {
  const candidateKeys: (string | undefined)[] = [
    (typeof window !== 'undefined' ? (window as any).__ENV__?.VITE_SUPABASE_ANON_KEY : undefined),
    (typeof window !== 'undefined' ? (window as any).__ENV__?.SUPABASE_ANON_KEY : undefined),
    (typeof window !== 'undefined' ? (window as any).__ENV__?.SUPABASE_API_KEY : undefined),
    ((import.meta as any).env?.SUPABASE_ANON_KEY),
    ((import.meta as any).env?.SUPABASE_API_KEY),
    (typeof process !== 'undefined' ? process.env?.SUPABASE_ANON_KEY : undefined),
    (typeof process !== 'undefined' ? process.env?.SUPABASE_API_KEY : undefined),
    ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY),
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined),
  ];

  for (const raw of candidateKeys) {
    const trimmed = (raw || '').trim();
    if (trimmed && isValidAnonKey(trimmed)) {
      return trimmed;
    }
  }

  return ACTIVE_SUPABASE_ANON_KEY;
}

export function getSupabaseDiagnosticInfo() {
  const url = getEffectiveSupabaseUrl();
  const key = getEffectiveSupabaseKey();
  let targetHost = 'unconfigured';
  try {
    targetHost = new URL(url).host;
  } catch {
    targetHost = url || 'invalid-url';
  }
  let keyRef = 'none';
  let keyType = 'none';
  if (key && key.includes('.')) {
    try {
      const payloadStr = typeof atob !== 'undefined'
        ? atob(key.split('.')[1])
        : Buffer.from(key.split('.')[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);
      keyRef = payload?.ref || 'unknown';
      keyType = payload?.role || 'jwt';
    } catch {
      keyType = 'unparseable-jwt';
    }
  } else if (key) {
    keyType = key.startsWith('sb_') ? 'sb_token' : 'opaque';
  }

  return {
    configured: isSupabaseConfigured,
    targetHost,
    keyConfigured: Boolean(key),
    keyType,
    keyRef,
  };
}

export function validateSupabaseEnv(): SupabaseEnvValidation {
  const envUrl = getEffectiveSupabaseUrl();
  const envKey = getEffectiveSupabaseKey();

  const hasUrl = Boolean(envUrl);
  const hasKey = Boolean(envKey);
  const isUrlValid = isValidHttpUrl(envUrl);
  const isKeyValid = isValidAnonKey(envKey);

  const missingVariables: string[] = [];
  const validationErrors: string[] = [];

  if (!hasUrl) {
    missingVariables.push('VITE_SUPABASE_URL');
    validationErrors.push('Missing environment variable: VITE_SUPABASE_URL is not set');
  } else if (!isUrlValid) {
    validationErrors.push(`Invalid VITE_SUPABASE_URL: "${envUrl}" is not a valid HTTP/HTTPS URL`);
  }

  if (!hasKey) {
    missingVariables.push('VITE_SUPABASE_ANON_KEY');
    validationErrors.push('Missing environment variable: VITE_SUPABASE_ANON_KEY is not set');
  } else if (!isKeyValid) {
    validationErrors.push('Invalid VITE_SUPABASE_ANON_KEY: key is invalid, shorter than 20 characters, or a disallowed service role key');
  }

  const isConfigured = hasUrl && hasKey && isUrlValid && isKeyValid;

  return {
    isConfigured,
    hasUrl,
    hasKey,
    isUrlValidFormat: isUrlValid,
    isKeyValidFormat: isKeyValid,
    missingVariables,
    validationErrors,
    effectiveUrl: isConfigured ? envUrl : '',
    isDefaultFallback: !isConfigured
  };
}

const rawUrl = getEffectiveSupabaseUrl();
const rawKey = getEffectiveSupabaseKey();

export const isSupabaseConfigured = Boolean(
  isValidHttpUrl(rawUrl) &&
  isValidAnonKey(rawKey)
);

// Safe fallback placeholder values that prevent runtime crash while preserving safety
const FALLBACK_URL = (isValidHttpUrl(ACTIVE_SUPABASE_URL) ? ACTIVE_SUPABASE_URL : '') || 'https://unconfigured.supabase.co';
const FALLBACK_KEY = (isValidAnonKey(ACTIVE_SUPABASE_ANON_KEY) ? ACTIVE_SUPABASE_ANON_KEY : '') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.unconfigured_client_dummy_key_requires_environment_variables';

const activeUrl = isSupabaseConfigured && isValidHttpUrl(rawUrl) ? rawUrl : FALLBACK_URL;
const activeKey = isSupabaseConfigured && isValidAnonKey(rawKey) ? rawKey : FALLBACK_KEY;

// Safe fetch handler that prevents unhandled network exceptions when unconfigured
const customFetch: typeof fetch = async (input, init) => {
  if (!isSupabaseConfigured) {
    const urlStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    if (urlStr.includes('/auth/v1/')) {
      return new Response(JSON.stringify({ session: null, user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return fetch(input, init);
};

export const supabase: SupabaseClient = createClient(
  activeUrl,
  activeKey,
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
      storageKey: 'najm_al_huda_auth_token',
    },
    global: {
      fetch: customFetch,
      headers: isSupabaseConfigured ? {
        'apikey': activeKey,
      } : {},
    },
  }
);

