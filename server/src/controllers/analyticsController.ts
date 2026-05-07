import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AnalyticsEvent } from '../models/AnalyticsEvent';
import { Business } from '../models/Business';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { Expense } from '../models/Expense';
import { AIQueryLog } from '../models/AIQueryLog';
import { Feedback } from '../models/Feedback';
import { HttpError } from '../middleware/error';
import { SetupLead } from '../models/SetupLead';

const eventSchema = z.object({
  name: z.string().min(1).max(120),
  properties: z.record(z.unknown()).optional().default({}),
});

export async function createAnalyticsEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = eventSchema.parse(req.body);
    await AnalyticsEvent.create({
      businessId: req.auth?.businessId ?? null,
      userId: req.auth?.userId ?? null,
      name: input.name,
      properties: input.properties,
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function getAdminAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length > 0 && !adminEmails.includes(req.auth!.email.toLowerCase())) {
      throw new HttpError(403, 'Admin analytics access is not enabled for this user');
    }
    if (adminEmails.length === 0 && process.env.NODE_ENV === 'production') {
      throw new HttpError(403, 'Set ADMIN_EMAILS to enable admin analytics in production');
    }

    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [
      businessCount,
      businesses,
      productCount,
      saleCount,
      expenseCount,
      aiQuestionCount,
      feedbackCount,
      positiveFeedbackCount,
      setupLeadCount,
      eventAgg,
    ] = await Promise.all([
      Business.countDocuments(),
      Business.find().sort({ createdAt: -1 }).limit(50).lean(),
      Product.countDocuments(),
      Sale.countDocuments(),
      Expense.countDocuments(),
      AIQueryLog.countDocuments(),
      Feedback.countDocuments(),
      Feedback.countDocuments({ rating: 'useful' }),
      SetupLead.countDocuments(),
      AnalyticsEvent.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 40 },
        { $project: { _id: 0, name: '$_id', count: 1 } },
      ]),
    ]);

    const businessIds = businesses.map((b) => b._id);
    const [productsByBusiness, salesByBusiness, aiByBusiness, feedbackByBusiness] = await Promise.all([
      Product.aggregate([
        { $match: { businessId: { $in: businessIds } } },
        { $group: { _id: '$businessId', count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { businessId: { $in: businessIds } } },
        { $group: { _id: '$businessId', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      ]),
      AIQueryLog.aggregate([
        { $match: { businessId: { $in: businessIds } } },
        { $group: { _id: '$businessId', count: { $sum: 1 } } },
      ]),
      Feedback.aggregate([
        { $match: { businessId: { $in: businessIds } } },
        { $group: { _id: '$businessId', count: { $sum: 1 }, useful: { $sum: { $cond: [{ $eq: ['$rating', 'useful'] }, 1, 0] } } } },
      ]),
    ]);

    const byId = (rows: any[]) => new Map(rows.map((r) => [r._id.toString(), r]));
    const productMap = byId(productsByBusiness);
    const saleMap = byId(salesByBusiness);
    const aiMap = byId(aiByBusiness);
    const feedbackMap = byId(feedbackByBusiness);

    res.json({
      totals: {
        businesses: businessCount,
        products: productCount,
        sales: saleCount,
        expenses: expenseCount,
        aiQuestions: aiQuestionCount,
        feedback: feedbackCount,
        positiveFeedback: positiveFeedbackCount,
        setupLeads: setupLeadCount,
      },
      eventsLast30Days: eventAgg,
      businesses: businesses.map((b) => {
        const id = b._id.toString();
        const sales = saleMap.get(id);
        const feedback = feedbackMap.get(id);
        return {
          id,
          name: b.name,
          businessType: b.businessType || 'retail',
          plan: b.subscription?.plan || 'free',
          status: b.subscription?.status || 'none',
          createdAt: b.createdAt,
          products: productMap.get(id)?.count || 0,
          sales: sales?.count || 0,
          revenue: sales?.revenue || 0,
          aiQuestions: aiMap.get(id)?.count || 0,
          feedback: feedback?.count || 0,
          usefulFeedback: feedback?.useful || 0,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}
