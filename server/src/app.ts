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
import reportRoutes from './routes/reports';
import billingRoutes from './routes/billing';
import exportRoutes from './routes/export';
import teamRoutes from './routes/team';
import { getPlans } from './controllers/billingController';
import { paystackWebhook } from './controllers/paystackWebhookController';
import { requirePro } from './middleware/requirePro';
import { requireBusiness } from './middleware/requireBusiness';
import { requirePermission } from './middleware/requirePermission';

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

  // Baseline always-allowed dev origins so local work never breaks.
  const devDefaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ];

  // The explicit allowlist = user config ∪ dev defaults. Explicit entries
  // take precedence; dev defaults just mean `npm run dev` works out of the box.
  const explicit = new Set<string>([...configured, ...devDefaults]);

  // If the user set CORS_ORIGINS=* we accept everything. Otherwise we also
  // auto-accept any *.vercel.app origin because this app is deployed on
  // Vercel and will have sibling frontend(s) there — avoids the whole
  // "works locally, 404/CORS in prod" dance when the env var is missing.
  const autoAllowVercel = !allowAll;

  return cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl, server-to-server, health checks
      if (allowAll) return cb(null, true);
      if (explicit.has(origin)) return cb(null, true);
      if (autoAllowVercel && /\.vercel\.app$/.test(new URL(origin).hostname)) {
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

  // Paystack webhook must see the raw bytes to verify the HMAC signature, so
  // register it BEFORE express.json() swallows the body.
  app.post('/api/webhooks/paystack', express.raw({ type: '*/*' }), paystackWebhook);

  app.use(express.json({ limit: '1mb' }));

  // Public health — reachable at root and under /api for both the platform
  // (uptime checks at /health) and in-app calls (/api/health).
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/', (_req, res) => res.json({ message: 'AI SME API' }));
  app.get('/api', (_req, res) => res.json({ message: 'AI SME API' }));

  app.use('/api/auth', authRoutes);
  // Public pricing — landing page needs this without a JWT.
  app.get('/api/billing/plans', getPlans);
  app.use('/api/billing', requireAuth, billingRoutes);
  app.use('/api/products', requireAuth, productRoutes);
  app.use('/api/sales', requireAuth, salesRoutes);
  app.use('/api/inventory', requireAuth, inventoryRoutes);
  app.use('/api/payments', requireAuth, paymentRoutes);
  app.use('/api/expenses', requireAuth, expenseRoutes);
  app.use('/api/dashboard', requireAuth, dashboardRoutes);
  app.use('/api/ai', requireAuth, requirePro, requirePermission('useAI'), aiRoutes);
  app.use('/api/config', requireAuth, configRoutes);
  app.use('/api/import', requireAuth, requirePro, requirePermission('manageInventory'), importRoutes);
  app.use('/api/business', requireAuth, businessRoutes);
  app.use('/api/reports', requireAuth, requirePro, requirePermission('viewReports'), reportRoutes);
  app.use('/api/export', requireAuth, requireBusiness, exportRoutes);
  app.use('/api/team', requireAuth, teamRoutes);

  app.use(errorHandler);
  return app;
}
