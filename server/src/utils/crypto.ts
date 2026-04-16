import crypto from 'crypto';
import { env } from './env';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function getKey(): Buffer {
  const raw = env.ENCRYPTION_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  const key = crypto.createHash('sha256').update(raw).digest();
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !encB64) throw new Error('Invalid ciphertext');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

export function maskSecret(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 8) return '•'.repeat(secret.length);
  return `${secret.slice(0, 4)}${'•'.repeat(Math.max(4, secret.length - 8))}${secret.slice(-4)}`;
}
