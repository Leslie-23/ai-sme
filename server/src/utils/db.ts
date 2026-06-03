import mongoose from 'mongoose';
import { env } from './env';

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: readPositiveInt('MONGODB_MAX_POOL_SIZE', 3),
    minPoolSize: 0,
    maxIdleTimeMS: readPositiveInt('MONGODB_MAX_IDLE_TIME_MS', 30_000),
    serverSelectionTimeoutMS: readPositiveInt('MONGODB_SERVER_SELECTION_TIMEOUT_MS', 5_000),
  });
  console.log('[db] connected to MongoDB');
}
