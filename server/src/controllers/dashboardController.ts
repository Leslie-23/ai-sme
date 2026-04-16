import { Request, Response, NextFunction } from 'express';
import { buildDashboardSummary } from '../services/dashboardService';

export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const summary = await buildDashboardSummary(req.auth!.businessId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}
