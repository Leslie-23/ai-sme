import express from 'express';
import cors from 'cors';
import { env } from './utils/env';
import { connectDB } from './utils/db';
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

async function main(): Promise<void> {
  await connectDB();
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/auth', authRoutes);

  app.use('/products', requireAuth, productRoutes);
  app.use('/sales', requireAuth, salesRoutes);
  app.use('/inventory', requireAuth, inventoryRoutes);
  app.use('/payments', requireAuth, paymentRoutes);
  app.use('/expenses', requireAuth, expenseRoutes);
  app.use('/dashboard', requireAuth, dashboardRoutes);
  app.use('/ai', requireAuth, aiRoutes);
  app.use('/config', requireAuth, configRoutes);

  app.use(errorHandler);

  app.listen(env.PORT, () => {
    console.log(`[server] listening on :${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
