import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  Server, 
  Activity, 
  Terminal, 
  Key, 
  Globe, 
  Table, 
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  runSupabaseDiagnostics, 
  generateDiagnosticMarkdown, 
  SupabaseDiagnosticReport 
} from '../../services/supabaseDiagnosticService';

interface Props {
  onClose?: () => void;
  compact?: boolean;
}

export const SupabaseDiagnosticComponent: React.FC<Props> = ({ onClose, compact = false }) => {
  const [activeTab, setActiveTab] = useState<'current' | 'custom' | 'setup'>('current');
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<SupabaseDiagnosticReport | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Custom credentials form state
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [customInputError, setCustomInputError] = useState<string | null>(null);

  const executeDiagnostic = async (credentials?: { url?: string; key?: string }) => {
    setIsRunning(true);
    try {
      const result = await runSupabaseDiagnostics(credentials);
      setReport(result);
    } catch (err: any) {
      console.error('Diagnostic error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    executeDiagnostic();
  }, []);

  const handleCopyLog = () => {
    if (!report) return;
    const markdown = generateDiagnosticMarkdown(report);
    navigator.clipboard.writeText(markdown);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2500);
  };

  const handleCopyEnv = () => {
    const envTemplate = `# Supabase Credentials for Najm Al Huda Workshop ERP
VITE_SUPABASE_URL=${report?.clientConfig?.url || 'https://<your-project-ref>.supabase.co'}
VITE_SUPABASE_ANON_KEY=${report?.clientConfig?.hasKey ? '<your-anon-key>' : 'your-anon-public-key'}
SUPABASE_URL=${report?.clientConfig?.url || 'https://<your-project-ref>.supabase.co'}
SUPABASE_ANON_KEY=${report?.clientConfig?.hasKey ? '<your-anon-key>' : 'your-anon-public-key'}
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key`;
    
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const handleTestCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomInputError(null);
    if (!customUrl.trim()) {
      setCustomInputError('Please enter a Supabase Project URL.');
      return;
    }
    if (!customKey.trim()) {
      setCustomInputError('Please enter an API Key.');
      return;
    }
    executeDiagnostic({ url: customUrl.trim(), key: customKey.trim() });
  };

  const getStatusBadge = () => {
    if (!report) return null;
    switch (report.overallStatus) {
      case 'connected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Connected &amp; Ready
          </span>
        );
      case 'partial':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Partial / Migrations Pending
          </span>
        );
      case 'misconfigured':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Credentials Misconfigured
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Database Offline
          </span>
        );
    }
  };

  return (
    <div className={`space-y-4 text-xs font-sans ${compact ? '' : 'p-4'}`}>
      
      {/* Top Diagnostic Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Supabase Connection Diagnostics
                </h3>
                {getStatusBadge()}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Verify PostgreSQL connectivity, check table readiness, and test credentials in real time
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => executeDiagnostic(activeTab === 'custom' && customUrl ? { url: customUrl, key: customKey } : undefined)}
              disabled={isRunning}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Probing...' : 'Re-test Connection'}</span>
            </button>

            {report && (
              <button
                type="button"
                onClick={handleCopyLog}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
                title="Copy Full Diagnostic Report"
              >
                {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLog ? 'Copied' : 'Copy Report'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI stats strip */}
        {report && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Endpoint URL</span>
              <span className="font-mono text-slate-200 font-bold truncate block">{report.clientConfig.maskedUrl}</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Key Type</span>
              <span className="font-mono text-slate-200 font-bold block">{report.clientConfig.keyType.toUpperCase()}</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Roundtrip Latency</span>
              <span className="font-mono text-emerald-400 font-bold block">{report.latencyMs ? `${report.latencyMs} ms` : 'N/A'}</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Tables Ready</span>
              <span className="font-mono text-slate-200 font-bold block">
                {report.tables.filter(t => t.exists).length} / {report.tables.length || 7}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'current'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Current Environment Status</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'custom'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Test Custom Credentials</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('setup')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'setup'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Setup &amp; .env Guide</span>
        </button>
      </div>

      {/* TAB 1: CURRENT ENVIRONMENT STATUS */}
      {activeTab === 'current' && (
        <div className="space-y-4">
          
          {/* Summary Alert Notice */}
          {report && (
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              report.overallStatus === 'connected' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : report.overallStatus === 'partial'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {report.overallStatus === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : report.overallStatus === 'partial' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-bold block">{report.summaryMessage}</span>
                <span className="text-[11px] opacity-80 block mt-0.5">
                  Last verified: {new Date(report.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          {/* Diagnostic Checks Breakdown Grid */}
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.checks.map(check => {
                const isSuccess = check.status === 'success';
                const isWarning = check.status === 'warning';
                const isError = check.status === 'error';

                return (
                  <div 
                    key={check.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3 hover:border-sky-300 transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 text-xs block truncate">{check.title}</span>
                        {check.durationMs !== undefined && (
                          <span className="font-mono text-[10px] text-slate-400 font-semibold">{check.durationMs}ms</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{check.description}</p>
                      {check.details && (
                        <p className={`text-[11px] font-medium mt-1 p-1 rounded-md ${
                          isSuccess ? 'bg-emerald-50 text-emerald-800' : isWarning ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'
                        }`}>
                          {check.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table Schemas & PostgREST Status Section */}
          {report && report.tables.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-sky-600" />
                  <span className="font-bold text-slate-900 text-xs">PostgreSQL ERP Tables Readiness</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {report.tables.filter(t => t.exists).length} of {report.tables.length} Accessible
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {report.tables.map(tbl => (
                  <div 
                    key={tbl.tableName}
                    className={`p-2 rounded-lg border flex flex-col justify-between ${
                      tbl.status === 'ok'
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : tbl.status === 'rls_restricted'
                        ? 'bg-sky-50/50 border-sky-200 text-sky-950'
                        : 'bg-rose-50/50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs">{tbl.tableName}</span>
                      {tbl.status === 'ok' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : tbl.status === 'rls_restricted' ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500 font-medium">
                      {tbl.status === 'ok' && `${tbl.count ?? 0} records`}
                      {tbl.status === 'rls_restricted' && 'RLS Protected'}
                      {tbl.status === 'missing' && 'Pending Migration'}
                      {tbl.status === 'error' && 'Query Error'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Recommendations List */}
          {report && report.recommendations.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Actionable Recommendations</span>
              </div>
              <ul className="space-y-1.5 pl-5 list-disc text-[11px] text-amber-800">
                {report.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEST CUSTOM CREDENTIALS TEST BENCH */}
      {activeTab === 'custom' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Test Alternative Credentials</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Paste or type your Supabase project credentials below to verify their connection before updating your production configuration.
            </p>
          </div>

          <form onSubmit={handleTestCustom} className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://trxrbbirttlisohgbfck.supabase.co"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Supabase API Key (Anon Public Key or Service Role Key)
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={customKey}
                onChange={e => setCustomKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Keys are tested securely in-memory and never permanently stored.
              </span>
            </div>

            {customInputError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{customInputError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isRunning}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                <span>{isRunning ? 'Testing Credentials...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCustomUrl('');
                  setCustomKey('');
                  setCustomInputError(null);
                }}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Clear Form
              </button>
            </div>
          </form>

          {/* If report is from custom test */}
          {report && customUrl && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">Test Bench Result:</span>
                {getStatusBadge()}
              </div>

              <div className={`p-3 rounded-xl border text-xs font-medium ${
                report.overallStatus === 'connected'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {report.summaryMessage}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETUP & .ENV GUIDE */}
      {activeTab === 'setup' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Supabase Environment Configuration Template</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Copy and paste these environment variables into your local <code className="font-mono text-sky-700 font-bold">.env</code> or Hostinger dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyEnv}
              className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs border border-sky-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEnv ? 'Copied' : 'Copy Template'}</span>
            </button>
          </div>

          <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto shadow-inner leading-relaxed">
            <span className="text-slate-400"># Frontend Vite Client Configuration</span><br />
            <span className="text-sky-300">VITE_SUPABASE_URL</span>=<span className="text-emerald-300">https://trxrbbirttlisohgbfck.supabase.co</span><br />
            <span className="text-sky-300">VITE_SUPABASE_ANON_KEY</span>=<span className="text-amber-300">your-anon-public-key</span><br /><br />
            <span className="text-slate-400"># Backend Node.js Server Configuration</span><br />
            <span className="text-sky-300">SUPABASE_URL</span>=<span className="text-emerald-300">https://trxrbbirttlisohgbfck.supabase.co</span><br />
            <span className="text-sky-300">SUPABASE_ANON_KEY</span>=<span className="text-amber-300">your-anon-public-key</span><br />
            <span className="text-sky-300">SUPABASE_SERVICE_ROLE_KEY</span>=<span className="text-purple-300">your-service-role-key</span>
          </div>

          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5 text-[11px] text-sky-950">
            <span className="font-bold block">Database Schema Migrations:</span>
            <p>
              To create all tables in your Supabase project with matching PostgreSQL schemas, run:
            </p>
            <div className="p-2 bg-white rounded-lg border border-sky-300 font-mono text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>npm run db:migrate:supabase</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('npm run db:migrate:supabase');
                  setCopiedEnv(true);
                  setTimeout(() => setCopiedEnv(false), 2000);
                }}
                className="text-[10px] text-sky-600 hover:text-sky-800 font-sans cursor-pointer font-bold"
              >
                Copy Command
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
