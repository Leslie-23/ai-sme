import type { IncomingMessage, ServerResponse } from 'http';
import mongoose from 'mongoose';
import { createApp } from '../src/app';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let cached: { handler: Handler } | null = null;

// Vercel reuses the Node runtime between invocations on warm starts, so we
// connect to MongoDB once and reuse. On cold start this runs once.
async function init(): Promise<Handler> {
  if (mongoose.connection.readyState === 0) {
    mongoose.set('strictQuery', true);
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');
    await mongoose.connect(uri);
  }
  const app = createApp();
  return app as unknown as Handler;
}

function getHandler(): Promise<Handler> {
  if (cached) return Promise.resolve(cached.handler);
  return init().then((h) => {
    cached = { handler: h };
    return h;
  });
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const h = await getHandler();
    h(req, res);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[vercel-handler]', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Server init failed' }));
  }
}
