import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Security guard: Ensure service role secret keys and outdated project keys are NEVER exposed
  const isServiceRoleKey = (k?: string) => Boolean(k && (k.startsWith('sb_secret_') || k.toLowerCase().includes('service_role')));
  if (process.env.VITE_SUPABASE_ANON_KEY && isServiceRoleKey(process.env.VITE_SUPABASE_ANON_KEY)) {
    delete process.env.VITE_SUPABASE_ANON_KEY;
  }
  if (process.env.SUPABASE_ANON_KEY && isServiceRoleKey(process.env.SUPABASE_ANON_KEY)) {
    delete process.env.SUPABASE_ANON_KEY;
  }

  // Load environment variables from .env files and process.env without filtering
  const env = loadEnv(mode, process.cwd(), '');
  if (env.VITE_SUPABASE_ANON_KEY && isServiceRoleKey(env.VITE_SUPABASE_ANON_KEY)) {
    delete env.VITE_SUPABASE_ANON_KEY;
  }
  if (env.SUPABASE_ANON_KEY && isServiceRoleKey(env.SUPABASE_ANON_KEY)) {
    delete env.SUPABASE_ANON_KEY;
  }

  // Extract Supabase, API, and ERP configurations with fallback to unprefixed names
  const rawSupabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const OUTDATED_PROJECT_REFS = ['tpbihpzsfjpobqwdbrmm', 'hqpuloqjsvvgrelsvrzo', 'trxrbbirttlisohgbfck'];
  let supabaseUrl = rawSupabaseUrl.trim();
  if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
  if (!supabaseUrl || OUTDATED_PROJECT_REFS.some(ref => supabaseUrl.includes(ref))) {
    supabaseUrl = '';
  }
  supabaseUrl = supabaseUrl.replace(/\/+$/, '');
  const isOutdatedJwtKey = (k?: string) => {
    if (!k || !k.includes('.')) return false;
    try {
      const payload = JSON.parse(Buffer.from(k.split('.')[1], 'base64').toString('utf8'));
      return Boolean(payload?.ref && OUTDATED_PROJECT_REFS.includes(payload.ref));
    } catch {
      return false;
    }
  };
  const candidateAnonKeys = [
    env.VITE_SUPABASE_ANON_KEY,
    env.SUPABASE_ANON_KEY,
    env.SUPABASE_API_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_API_KEY,
  ].filter((k): k is string => Boolean(k && typeof k === 'string' && !isServiceRoleKey(k) && !isOutdatedJwtKey(k)));

  const supabaseAnonKey = candidateAnonKeys[0] || '';
  const apiUrl = env.VITE_API_URL || env.VITE_API_BASE_URL || env.VITE_BACKEND_URL || process.env.VITE_API_URL || process.env.VITE_BACKEND_URL || '';
  const currency = env.VITE_APP_CURRENCY || process.env.VITE_APP_CURRENCY || 'QAR';

  // Build a comprehensive define map guaranteeing defined string values for all required client variables
  const defineEnvs: Record<string, string> = {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    'import.meta.env.VITE_APP_CURRENCY': JSON.stringify(currency),
    'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
  };

  // Inject any additional VITE_ variables detected in the build environment
  const combinedEnvs = { ...process.env, ...env };
  for (const [key, value] of Object.entries(combinedEnvs)) {
    if (key.startsWith('VITE_') && value !== undefined) {
      // Guard against accidentally passing service role secrets through VITE_ variables
      if (key === 'VITE_SUPABASE_ANON_KEY') {
        defineEnvs[`import.meta.env.${key}`] = JSON.stringify(supabaseAnonKey);
        continue;
      }
      if (typeof value === 'string' && isServiceRoleKey(value)) {
        continue;
      }
      defineEnvs[`import.meta.env.${key}`] = JSON.stringify(value);
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Expose all VITE_ prefixed environment variables to client
    envPrefix: ['VITE_'],
    define: defineEnvs,
    esbuild: {
      target: 'es2022',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
      },
    },
    build: {
      target: 'es2022',
      outDir: 'dist',
      sourcemap: true,
      minify: 'esbuild',
      emptyOutDir: true,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
