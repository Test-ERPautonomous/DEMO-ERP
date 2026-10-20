import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  getEffectiveSupabaseUrl, 
  getEffectiveSupabaseKey, 
  validateSupabaseEnv,
  isServiceRoleKey,
  isValidAnonKey
} from '../lib/supabase';

export interface DiagnosticCheckItem {
  id: string;
  category: 'config' | 'network' | 'auth' | 'tables' | 'server';
  title: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  details?: string;
  durationMs?: number;
}

export interface TableDiagnostic {
  tableName: string;
  exists: boolean;
  count?: number;
  error?: string;
  status: 'ok' | 'missing' | 'rls_restricted' | 'error';
}

export interface SupabaseDiagnosticReport {
  timestamp: string;
  overallStatus: 'connected' | 'partial' | 'misconfigured' | 'offline' | 'error';
  summaryMessage: string;
  clientConfig: {
    url: string;
    maskedUrl: string;
    hasKey: boolean;
    maskedKey: string;
    keyType: 'anon' | 'service_role' | 'invalid' | 'missing';
    isValidFormat: boolean;
  };
  serverStatus?: {
    configured: boolean;
    connected: boolean;
    latencyMs?: number;
    usingServiceRole?: boolean;
    message: string;
    missingEnv?: string[];
  };
  checks: DiagnosticCheckItem[];
  tables: TableDiagnostic[];
  latencyMs: number;
  recommendations: string[];
}

function maskString(str: string, keepStart = 6, keepEnd = 4): string {
  if (!str) return 'Not set';
  if (str.length <= keepStart + keepEnd) return '••••••••';
  return `${str.slice(0, keepStart)}••••${str.slice(-keepEnd)}`;
}

export async function runSupabaseDiagnostics(customCredentials?: {
  url?: string;
  key?: string;
}): Promise<SupabaseDiagnosticReport> {
  const isCustom = Boolean(customCredentials?.url || customCredentials?.key);
  const targetUrl = (customCredentials?.url || getEffectiveSupabaseUrl() || '').trim();
  const targetKey = (customCredentials?.key || getEffectiveSupabaseKey() || '').trim();

  const checks: DiagnosticCheckItem[] = [];
  const recommendations: string[] = [];
  const tables: TableDiagnostic[] = [];
  let totalLatency = 0;

  // 1. Client Credentials Format Check
  const hasUrl = Boolean(targetUrl);
  const hasKey = Boolean(targetKey);
  const isUrlValid = hasUrl && /^https?:\/\//i.test(targetUrl) && !targetUrl.includes('your-project-id') && !targetUrl.includes('placeholder');
  
  let keyType: 'anon' | 'service_role' | 'invalid' | 'missing' = 'missing';
  if (!hasKey) {
    keyType = 'missing';
  } else if (isServiceRoleKey(targetKey)) {
    keyType = 'service_role';
  } else if (isValidAnonKey(targetKey)) {
    keyType = 'anon';
  } else {
    keyType = 'invalid';
  }

  // Check 1.1: URL Format
  if (!hasUrl) {
    checks.push({
      id: 'url_presence',
      category: 'config',
      title: 'Project URL Configuration',
      description: 'Check if Supabase Project URL is provided',
      status: 'error',
      details: 'Missing VITE_SUPABASE_URL. Set it in .env or Hostinger environment.',
    });
    recommendations.push('Set VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co in your .env or Hostinger deployment settings.');
  } else if (!isUrlValid) {
    checks.push({
      id: 'url_format',
      category: 'config',
      title: 'Project URL Format',
      description: 'Check URL protocol and hostname',
      status: 'error',
      details: `Invalid URL format: "${targetUrl}". Must begin with https:// and not be a placeholder.`,
    });
    recommendations.push('Ensure VITE_SUPABASE_URL is a valid HTTPS address pointing to your Supabase project.');
  } else {
    checks.push({
      id: 'url_format',
      category: 'config',
      title: 'Project URL Format',
      description: 'Validated URL syntax',
      status: 'success',
      details: `Valid HTTPS project URL: ${maskString(targetUrl, 12, 10)}`,
    });
  }

  // Check 1.2: API Key Format & Security
  if (!hasKey) {
    checks.push({
      id: 'key_presence',
      category: 'config',
      title: 'API Key Configuration',
      description: 'Check if Anon Public Key is provided',
      status: 'error',
      details: 'Missing VITE_SUPABASE_ANON_KEY. Set it in .env or Hostinger environment.',
    });
    recommendations.push('Set VITE_SUPABASE_ANON_KEY=<your-anon-key> in your .env file or deployment settings.');
  } else if (keyType === 'service_role') {
    checks.push({
      id: 'key_security',
      category: 'config',
      title: 'API Key Role Security Check',
      description: 'Verify key permissions and exposure',
      status: 'warning',
      details: 'A service-role secret key was provided. NEVER expose service-role keys in public frontend code! Use your public anon key instead.',
    });
    recommendations.push('SECURITY ALERT: Replace the service_role secret key with the public "anon" key in your frontend environment.');
  } else if (keyType === 'invalid') {
    checks.push({
      id: 'key_validity',
      category: 'config',
      title: 'API Key Format & Checksum',
      description: 'Validate key length and structure',
      status: 'error',
      details: 'The provided API key is malformed, too short, or an unconfigured placeholder.',
    });
    recommendations.push('Retrieve the valid "anon" public key from your Supabase Dashboard > Project Settings > API.');
  } else {
    checks.push({
      id: 'key_validity',
      category: 'config',
      title: 'API Key Format & Checksum',
      description: 'Validated anon public key',
      status: 'success',
      details: `Valid public anon JWT key (${targetKey.length} chars).`,
    });
  }

  // If credentials are fundamentally missing or invalid, abort network checks gracefully
  if (!isUrlValid || !hasKey || keyType === 'invalid') {
    return {
      timestamp: new Date().toISOString(),
      overallStatus: 'misconfigured',
      summaryMessage: 'Supabase credentials are not properly configured. Please update your environment variables.',
      clientConfig: {
        url: targetUrl,
        maskedUrl: maskString(targetUrl, 12, 10),
        hasKey,
        maskedKey: maskString(targetKey, 8, 4),
        keyType,
        isValidFormat: false,
      },
      checks,
      tables: [],
      latencyMs: 0,
      recommendations,
    };
  }

  // Create temporary client for diagnostic probing
  let probeClient: SupabaseClient;
  try {
    probeClient = createClient(targetUrl, targetKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err: any) {
    checks.push({
      id: 'client_init',
      category: 'config',
      title: 'Supabase SDK Initialization',
      description: 'Initialize Supabase JS client',
      status: 'error',
      details: `Client initialization failed: ${err.message}`,
    });
    return {
      timestamp: new Date().toISOString(),
      overallStatus: 'error',
      summaryMessage: `Failed to initialize Supabase client: ${err.message}`,
      clientConfig: {
        url: targetUrl,
        maskedUrl: maskString(targetUrl, 12, 10),
        hasKey,
        maskedKey: maskString(targetKey, 8, 4),
        keyType,
        isValidFormat: true,
      },
      checks,
      tables: [],
      latencyMs: 0,
      recommendations,
    };
  }

  // 2. Network & Auth Health Check
  const pingStart = Date.now();
  let networkOk = false;
  try {
    // Probe Supabase Auth health endpoint directly
    const authHealthUrl = `${targetUrl.replace(/\/$/, '')}/auth/v1/health`;
    const authRes = await fetch(authHealthUrl, {
      method: 'GET',
      headers: { 'apikey': targetKey },
    });
    const pingDuration = Date.now() - pingStart;
    totalLatency = pingDuration;

    if (authRes.ok) {
      networkOk = true;
      checks.push({
        id: 'network_ping',
        category: 'network',
        title: 'Network & Endpoint Reachability',
        description: 'Direct HTTPS handshake with Supabase server',
        status: 'success',
        durationMs: pingDuration,
        details: `Connected successfully (${pingDuration}ms roundtrip latency).`,
      });
    } else {
      checks.push({
        id: 'network_ping',
        category: 'network',
        title: 'Network & Endpoint Reachability',
        description: 'Direct HTTPS handshake with Supabase server',
        status: 'warning',
        durationMs: pingDuration,
        details: `Endpoint responded with HTTP ${authRes.status}: ${authRes.statusText}`,
      });
    }
  } catch (netErr: any) {
    const pingDuration = Date.now() - pingStart;
    checks.push({
      id: 'network_ping',
      category: 'network',
      title: 'Network & Endpoint Reachability',
      description: 'Direct HTTPS handshake with Supabase server',
      status: 'error',
      durationMs: pingDuration,
      details: `Network request failed: ${netErr.message || 'Host unreachable or CORS restricted'}.`,
    });
    recommendations.push('Check that your device has internet access and your Supabase project is active (not paused).');
  }

  // 3. Supabase Auth Service Check
  const authStart = Date.now();
  try {
    const { data: sessionData, error: sessionErr } = await probeClient.auth.getSession();
    const authDuration = Date.now() - authStart;

    if (sessionErr) {
      checks.push({
        id: 'auth_service',
        category: 'auth',
        title: 'Supabase Auth Handshake',
        description: 'Probe GoTrue authentication service',
        status: 'warning',
        durationMs: authDuration,
        details: `Auth response: ${sessionErr.message}`,
      });
    } else {
      checks.push({
        id: 'auth_service',
        category: 'auth',
        title: 'Supabase Auth Handshake',
        description: 'Probe GoTrue authentication service',
        status: 'success',
        durationMs: authDuration,
        details: sessionData.session 
          ? `Authenticated active session (${sessionData.session.user?.email || 'Logged in'})` 
          : 'Auth service operational. Ready for user authentication.',
      });
    }
  } catch (authErr: any) {
    checks.push({
      id: 'auth_service',
      category: 'auth',
      title: 'Supabase Auth Handshake',
      description: 'Probe GoTrue authentication service',
      status: 'error',
      details: `Auth exception: ${authErr.message}`,
    });
  }

  // 4. PostgreSQL REST API & Core Tables Probing
  const targetTables = ['customers', 'vehicles', 'suppliers', 'inventory_items', 'job_cards', 'invoices', 'settings'];
  let successfulTables = 0;
  let missingTables = 0;
  let rlsRestrictedTables = 0;

  for (const tableName of targetTables) {
    try {
      const { data, count, error } = await probeClient
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        successfulTables++;
        tables.push({
          tableName,
          exists: true,
          count: count ?? 0,
          status: 'ok',
        });
      } else {
        const msg = error.message || '';
        const code = (error as any).code || '';

        if (code === '42P01' || msg.includes('does not exist') || msg.includes('relation')) {
          missingTables++;
          tables.push({
            tableName,
            exists: false,
            error: 'Table does not exist in schema',
            status: 'missing',
          });
        } else if (msg.includes('row-level security') || msg.includes('permission denied') || code === '42501' || (error as any).status === 403 || (error as any).status === 401) {
          rlsRestrictedTables++;
          tables.push({
            tableName,
            exists: true,
            error: 'Protected by Row Level Security (RLS)',
            status: 'rls_restricted',
          });
        } else {
          tables.push({
            tableName,
            exists: false,
            error: msg,
            status: 'error',
          });
        }
      }
    } catch (tblErr: any) {
      tables.push({
        tableName,
        exists: false,
        error: tblErr.message,
        status: 'error',
      });
    }
  }

  // Table summary check item
  if (successfulTables === targetTables.length) {
    checks.push({
      id: 'table_schemas',
      category: 'tables',
      title: 'PostgreSQL Tables & Schema Readiness',
      description: 'Query core workshop tables via PostgREST',
      status: 'success',
      details: `All ${targetTables.length} core ERP tables exist and are queryable.`,
    });
  } else if (missingTables > 0) {
    checks.push({
      id: 'table_schemas',
      category: 'tables',
      title: 'PostgreSQL Tables & Schema Readiness',
      description: 'Query core workshop tables via PostgREST',
      status: 'warning',
      details: `${missingTables} of ${targetTables.length} tables are missing. Database migrations need to be applied.`,
    });
    recommendations.push('Run the migration script: "npm run db:migrate:supabase" to create all required database tables.');
  } else if (rlsRestrictedTables > 0) {
    checks.push({
      id: 'table_schemas',
      category: 'tables',
      title: 'PostgreSQL Tables & Schema Readiness',
      description: 'Query core workshop tables via PostgREST',
      status: 'success',
      details: `${targetTables.length - rlsRestrictedTables} tables readable, ${rlsRestrictedTables} secured with RLS policies.`,
    });
  } else {
    checks.push({
      id: 'table_schemas',
      category: 'tables',
      title: 'PostgreSQL Tables & Schema Readiness',
      description: 'Query core workshop tables via PostgREST',
      status: 'error',
      details: 'Unable to query tables from Supabase REST API.',
    });
  }

  // 5. Server Backend Proxy & Sync Status
  let serverReport: any = undefined;
  try {
    const endpoint = isCustom ? '/api/supabase/test-connection' : '/api/supabase/status';
    const serverRes = isCustom
      ? await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, key: targetKey }),
        })
      : await fetch(endpoint);

    if (serverRes.ok) {
      serverReport = await serverRes.json();
      checks.push({
        id: 'server_bridge',
        category: 'server',
        title: 'Backend Server Connection',
        description: 'Node.js Express backend database connection',
        status: serverReport.connected ? 'success' : serverReport.configured ? 'warning' : 'error',
        details: serverReport.message || (serverReport.connected ? 'Server connected to Supabase' : 'Server operating in local offline cache mode'),
        durationMs: serverReport.latencyMs,
      });

      if (!serverReport.connected && serverReport.message) {
        recommendations.push(`Backend Notice: ${serverReport.message}`);
      }
    }
  } catch (srvErr: any) {
    checks.push({
      id: 'server_bridge',
      category: 'server',
      title: 'Backend Server Connection',
      description: 'Node.js Express backend database connection',
      status: 'warning',
      details: 'Local server status endpoint unreachable; running in client-only mode.',
    });
  }

  // Determine overall status
  let overallStatus: 'connected' | 'partial' | 'misconfigured' | 'offline' = 'connected';
  let summaryMessage = 'Supabase PostgreSQL database is online and connected.';

  if (!networkOk && successfulTables === 0) {
    overallStatus = 'offline';
    summaryMessage = 'Cannot connect to Supabase. Check your internet connection or project URL.';
  } else if (missingTables > 0 || rlsRestrictedTables > 0 || successfulTables < targetTables.length) {
    overallStatus = 'partial';
    summaryMessage = `Connected to Supabase, but ${missingTables > 0 ? `${missingTables} tables need migration` : 'some policies or tables require attention'}.`;
  } else {
    overallStatus = 'connected';
    summaryMessage = `All checks passed! Supabase connection verified (${totalLatency}ms latency).`;
  }

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    summaryMessage,
    clientConfig: {
      url: targetUrl,
      maskedUrl: maskString(targetUrl, 12, 10),
      hasKey,
      maskedKey: maskString(targetKey, 8, 4),
      keyType,
      isValidFormat: isUrlValid && hasKey,
    },
    serverStatus: serverReport,
    checks,
    tables,
    latencyMs: totalLatency,
    recommendations,
  };
}

export function generateDiagnosticMarkdown(report: SupabaseDiagnosticReport): string {
  const lines: string[] = [
    '# Supabase Database Diagnostic Report',
    `**Timestamp:** ${new Date(report.timestamp).toLocaleString()}`,
    `**Overall Status:** ${report.overallStatus.toUpperCase()}`,
    `**Summary:** ${report.summaryMessage}`,
    `**Roundtrip Latency:** ${report.latencyMs}ms`,
    '',
    '## Client Configuration',
    `- **Project URL:** \`${report.clientConfig.maskedUrl}\``,
    `- **API Key Type:** \`${report.clientConfig.keyType.toUpperCase()}\``,
    `- **API Key Masked:** \`${report.clientConfig.maskedKey}\``,
    `- **Format Valid:** ${report.clientConfig.isValidFormat ? '✅ Yes' : '❌ No'}`,
    '',
    '## Diagnostics Breakdown',
  ];

  for (const c of report.checks) {
    const icon = c.status === 'success' ? '✅' : c.status === 'warning' ? '⚠️' : '❌';
    lines.push(`- ${icon} **${c.title}** (${c.status}): ${c.details || c.description}`);
  }

  lines.push('', '## Table Readiness (PostgREST)');
  for (const t of report.tables) {
    const icon = t.status === 'ok' ? '✅' : t.status === 'rls_restricted' ? '🔒' : '❌';
    lines.push(`- ${icon} \`${t.tableName}\`: ${t.status.toUpperCase()} ${t.count !== undefined ? `(${t.count} records)` : ''} ${t.error ? `(${t.error})` : ''}`);
  }

  if (report.recommendations.length > 0) {
    lines.push('', '## Recommended Actions');
    for (const r of report.recommendations) {
      lines.push(`- ${r}`);
    }
  }

  return lines.join('\n');
}
