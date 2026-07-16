import type { IncomingMessage, ServerResponse } from 'http';
import mongoose from 'mongoose';
import { createApp } from '../src/app';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let cached: { handler: Handler } | null = null;
let initPromise: Promise<Handler> | null = null;
let connectionPromise: Promise<typeof mongoose> | null = null;

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string): boolean {
  const configured = parseOrigins(process.env.CORS_ORIGINS);
  if (configured.includes('*')) return true;

  const explicit = new Set([
    ...configured,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'https://intellexa-sme.vercel.app',
  ]);
  if (explicit.has(origin)) return true;

  try {
    return /\.vercel\.app$/.test(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  const requestHeaders = req.headers['access-control-request-headers'];
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  if (typeof requestHeaders === 'string') {
    res.setHeader('Access-Control-Allow-Headers', requestHeaders);
  } else {
    res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');
  }
}

async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  mongoose.set('strictQuery', true);
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  connectionPromise = mongoose.connect(uri, {
    maxPoolSize: readPositiveInt('MONGODB_MAX_POOL_SIZE', 3),
    minPoolSize: 0,
    maxIdleTimeMS: readPositiveInt('MONGODB_MAX_IDLE_TIME_MS', 30_000),
    serverSelectionTimeoutMS: readPositiveInt('MONGODB_SERVER_SELECTION_TIMEOUT_MS', 5_000),
  });

  try {
    await connectionPromise;
  } catch (err) {
    connectionPromise = null;
    throw err;
  }
}

// Public routes should still work if MongoDB is unavailable.
function requiresMongo(req: IncomingMessage): boolean {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  return !['/', '/api', '/health', '/api/health', '/api/billing/plans'].includes(path);
}

async function init(): Promise<Handler> {
  const app = createApp();
  return app as unknown as Handler;
}

function getHandler(): Promise<Handler> {
  if (cached) return Promise.resolve(cached.handler);
  if (!initPromise) {
    initPromise = init().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise.then((h) => {
    cached = { handler: h };
    return h;
  });
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const needsMongo = requiresMongo(req);
  try {
    if (needsMongo) {
      await connectMongo();
    }
    const h = await getHandler();
    h(req, res);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[vercel-handler]', err);
    setCorsHeaders(req, res);
    res.statusCode = needsMongo ? 503 : 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: needsMongo ? 'Database unavailable' : 'Server init failed',
      })
    );
  }
}
