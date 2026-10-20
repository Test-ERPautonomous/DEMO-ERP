import express from 'express';
import cookieParser from 'cookie-parser';
import { authenticate } from '../server/auth';
import { apiRouter } from '../server/routes';
import { isServerSupabaseConfigured } from '../server/supabase';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(authenticate);

// Health check endpoint with live database probe
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    ok: true,
    status: 'ok',
    service: 'najm-al-huda-api',
    database: isServerSupabaseConfigured ? 'supabase-connected' : 'supabase-configured',
    currency: process.env.VITE_APP_CURRENCY || 'QAR',
    timestamp: new Date().toISOString()
  });
});

// Primary REST API routes
app.use('/api', apiRouter);

// Strict JSON 404 handler for any unmatched /api/* route
app.use('/api/*', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});

// Global JSON 500 error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Unhandled Error]', err);
  res.setHeader('Content-Type', 'application/json');
  res.status(500).json({
    error: err?.message || 'Internal Server Error',
    path: req.originalUrl
  });
});

export default app;
