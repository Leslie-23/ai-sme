import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ChatSession } from '../models/ChatSession';

const messageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(20000),
  modelUsed: z.string().optional(),
  timestamp: z.string().datetime(),
});

const upsertSchema = z.object({
  sessionId: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  messages: z.array(messageSchema).max(200),
});

export async function listChatSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessions = await ChatSession.find({ businessId: req.auth!.businessId })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();
    res.json(
      sessions.map((s) => ({
        id: s.sessionId,
        title: s.title,
        messageCount: s.messageCount,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messages: s.messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          modelUsed: m.modelUsed,
          timestamp: m.timestamp.toISOString(),
        })),
      }))
    );
  } catch (err) {
    next(err);
  }
}

export async function upsertChatSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = upsertSchema.parse(req.body);
    await ChatSession.findOneAndUpdate(
      { businessId: req.auth!.businessId, sessionId: input.sessionId },
      {
        businessId: req.auth!.businessId,
        userId: req.auth!.userId,
        sessionId: input.sessionId,
        title: input.title.trim(),
        messages: input.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
        messageCount: input.messages.length,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
