import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    return;
  }
  if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
    const e = err as { status: number; message: string };
    res.status(e.status).json({ error: e.message });
    return;
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
