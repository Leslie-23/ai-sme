import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  ENCRYPTION_KEY: required('ENCRYPTION_KEY'),
  NODE_ENV: process.env.NODE_ENV || 'development',
};
