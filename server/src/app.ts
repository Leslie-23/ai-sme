import express, { Express } from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/error';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import salesRoutes from './routes/sales';
import inventoryRoutes from './routes/inventory';
import paymentRoutes from './routes/payments';
import expenseRoutes from './routes/expenses';
import dashboardRoutes from './routes/dashboard';
import aiRoutes from './routes/ai';
import configRoutes from './routes/config';
import importRoutes from './routes/import';
import businessRoutes from './routes/business';

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildCors() {
  const configured = parseOrigins(process.env.CORS_ORIGINS);
  const allowAll = configured.includes('*');
  // Dev fallback if no allowlist: accept localhost vite origins
  const fallback = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];
  const allowed = configured.length > 0 ? configured : fallback;

  return cors({
    origin(origin, cb) {
      // Non-browser (curl, server-to-server, health checks) — no Origin header
      if (!origin) return cb(null, true);
      if (allowAll) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      // Also auto-allow any *.vercel.app preview if the primary production
      // origin lives on vercel.app — makes preview deploys work without
      // manual allowlist churn.
      if (allowed.some((o) => o.endsWith('.vercel.app')) && origin.endsWith('.vercel.app')) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin ${origin} is not allowed`));
    },
    credentials: true,
  });
}

export function createApp(): Express {
  const app = express();
  app.use(buildCors());
  app.use(express.json({ limit: '1mb' }));

  // Public health — reachable at root and under /api for both the platform
  // (uptime checks at /health) and in-app calls (/api/health).
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/', (_req, res) => res.json({ message: 'AI SME API' }));
  app.get('/api', (_req, res) => res.json({ message: 'AI SME API' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/products', requireAuth, productRoutes);
  app.use('/api/sales', requireAuth, salesRoutes);
  app.use('/api/inventory', requireAuth, inventoryRoutes);
  app.use('/api/payments', requireAuth, paymentRoutes);
  app.use('/api/expenses', requireAuth, expenseRoutes);
  app.use('/api/dashboard', requireAuth, dashboardRoutes);
  app.use('/api/ai', requireAuth, aiRoutes);
  app.use('/api/config', requireAuth, configRoutes);
  app.use('/api/import', requireAuth, importRoutes);
  app.use('/api/business', requireAuth, businessRoutes);

  app.use(errorHandler);
  return app;
}
