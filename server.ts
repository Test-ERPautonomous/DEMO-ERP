import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load .env configuration with override to ensure active environment variables take precedence
dotenv.config({ override: true });

// Security Guard: Immediately sanitize process.env to remove any secret key assigned to client variables
const isServiceRoleSecret = (k?: string) => Boolean(k && (k.startsWith('sb_secret_') || k.toLowerCase().includes('service_role')));
if (process.env.VITE_SUPABASE_ANON_KEY && isServiceRoleSecret(process.env.VITE_SUPABASE_ANON_KEY)) {
  delete process.env.VITE_SUPABASE_ANON_KEY;
}
if (process.env.SUPABASE_ANON_KEY && isServiceRoleSecret(process.env.SUPABASE_ANON_KEY)) {
  delete process.env.SUPABASE_ANON_KEY;
}
if (process.env.VITE_SUPABASE_URL && ['tpbihpzsfjpobqwdbrmm', 'hqpuloqjsvvgrelsvrzo', 'trxrbbirttlisohgbfck'].some(r => process.env.VITE_SUPABASE_URL?.includes(r))) {
  delete process.env.VITE_SUPABASE_URL;
}
if (process.env.SUPABASE_URL && ['tpbihpzsfjpobqwdbrmm', 'hqpuloqjsvvgrelsvrzo', 'trxrbbirttlisohgbfck'].some(r => process.env.SUPABASE_URL?.includes(r))) {
  delete process.env.SUPABASE_URL;
}

import { authenticate } from './server/auth';
import { apiRouter } from './server/routes';
import { testSupabaseConnection } from './server/supabase';

const app = express();

// Determine directory context safely across ESM / CJS / bundle environments
let currentDir: string;
try {
  if (typeof __dirname !== 'undefined') {
    currentDir = __dirname;
  } else {
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
  currentDir = process.cwd();
}

// Trust reverse proxy (standard for Hostinger LiteSpeed / Nginx proxy / Cloud Run)
app.set('trust proxy', 1);

// Permanent Database Architecture:
// Supabase PostgreSQL is the SINGLE persistent production database.
// NO destructive re-initialization or automatic seeding on server boot.
testSupabaseConnection().then(status => {
  if (status.connected) {
    console.log(`[Supabase] ✅ Connected to Supabase PostgreSQL: ${status.message}`);
  } else {
    console.log(`[Supabase] Boot status: ${status.message}`);
  }
}).catch(err => {
  console.log(`[Supabase] Boot notice:`, err?.message || err);
});

// 2. Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(authenticate);

// 3. API Routes FIRST
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: 'ok',
    service: 'workshop-api',
    database: 'connected',
    currency: 'QAR',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiRouter);

// Fallback for any unknown /api/* route - return JSON 404 (never return HTML for /api!)
app.use('/api/*', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});

// 4. Vite middleware for development vs static build for production
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Resolve the compiled frontend dist directory across varying working directories
    const candidatePaths = [
      path.join(process.cwd(), 'dist'),
      path.resolve(currentDir, '..', 'dist'),
      path.resolve(currentDir, 'dist'),
      currentDir
    ];
    const distPath = candidatePaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || path.join(process.cwd(), 'dist');

    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: true,
      index: false,
    }));
    const indexHtmlPath = path.join(distPath, 'index.html');
    app.get('*', (req, res) => {
      try {
        if (fs.existsSync(indexHtmlPath)) {
          let html = fs.readFileSync(indexHtmlPath, 'utf8');
          const OUTDATED_PROJECT_REFS = ['tpbihpzsfjpobqwdbrmm', 'hqpuloqjsvvgrelsvrzo', 'trxrbbirttlisohgbfck'];
          const isSecretKey = (k?: string) => Boolean(k && (k.startsWith('sb_secret_') || k.toLowerCase().includes('service_role')));
          const isOutdatedJwtKey = (k?: string) => {
            if (!k || !k.includes('.')) return false;
            try {
              const payload = JSON.parse(Buffer.from(k.split('.')[1], 'base64').toString('utf8'));
              return Boolean(payload?.ref && OUTDATED_PROJECT_REFS.includes(payload.ref));
            } catch {
              return false;
            }
          };
          const candidateKeys = [
            process.env.SUPABASE_ANON_KEY,
            process.env.VITE_SUPABASE_ANON_KEY,
            process.env.SUPABASE_API_KEY,
          ].filter((k): k is string => Boolean(k && typeof k === 'string' && !isSecretKey(k) && !isOutdatedJwtKey(k)));

          const safeAnonKey = candidateKeys[0] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZ3dpamJsanZza2xlcGdiaW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjE2OTMsImV4cCI6MjEwNzM5NzY5M30.FLeyoB1ljjzo4LXv9wro_AeVNfPKOB20n_mnbzmRLwc';

          let activeSupabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
          if (activeSupabaseUrl && !activeSupabaseUrl.startsWith('http')) {
            activeSupabaseUrl = `https://${activeSupabaseUrl}`;
          }
          if (!activeSupabaseUrl || OUTDATED_PROJECT_REFS.some(r => activeSupabaseUrl.includes(r))) {
            activeSupabaseUrl = 'https://zigwijbljvsklepgbint.supabase.co';
          }
          activeSupabaseUrl = activeSupabaseUrl.replace(/\/+$/, '');
          const runtimePublicEnv = {
            VITE_SUPABASE_URL: activeSupabaseUrl,
            SUPABASE_URL: activeSupabaseUrl,
            VITE_SUPABASE_ANON_KEY: safeAnonKey,
            SUPABASE_ANON_KEY: safeAnonKey,
            VITE_APP_CURRENCY: process.env.VITE_APP_CURRENCY || 'QAR',
          };
          const envScript = `<script>window.__ENV__ = ${JSON.stringify(runtimePublicEnv)};</script>`;
          if (html.includes('<head>')) {
            html = html.replace('<head>', `<head>${envScript}`);
          } else {
            html = envScript + html;
          }
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.send(html);
        }
      } catch (err) {
        console.warn('[Server] Notice serving index.html with runtime env:', err);
      }
      res.sendFile(indexHtmlPath);
    });
  }
}

async function startServer() {
  await setupFrontend();

  const rawPort = (process.env.NODE_ENV === 'production' && process.env.PORT) ? process.env.PORT : '3000';
  const isPipe = typeof rawPort === 'string' && (
    rawPort.startsWith('\\\\.\\pipe\\') ||
    rawPort.startsWith('/') ||
    rawPort.includes('.sock') ||
    (isNaN(Number(rawPort)) && !/^\d+$/.test(rawPort))
  );
  const portNumber = isPipe ? null : (parseInt(String(rawPort), 10) || 3000);

  let server: any;
  if (isPipe) {
    server = app.listen(rawPort, () => {
      console.log(`[Server] Najm Al Huda Workshop ERP listening on Unix Socket ${rawPort} (PID: ${process.pid})`);
    });
  } else {
    const host = process.env.HOST || '0.0.0.0';
    server = app.listen(portNumber, host, () => {
      console.log(`[Server] Najm Al Huda Workshop ERP listening on http://${host}:${portNumber} (PID: ${process.pid})`);
    });
  }

  // Graceful shutdown handling for Hostinger / PM2 / Docker / Passenger
  const handleShutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}. Shutting down HTTP server gracefully...`);
    if (server && server.close) {
      server.close(() => {
        console.log('[Server] HTTP server closed cleanly.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  return server;
}

// In production, when this module is run or required directly, start the server
startServer().catch(err => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

export { app, startServer };
export default app;
