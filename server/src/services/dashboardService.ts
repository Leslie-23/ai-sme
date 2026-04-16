import { Types } from 'mongoose';
import { Sale } from '../models/Sale';
import { Product } from '../models/Product';
import { Expense } from '../models/Expense';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export interface DashboardSummary {
  totals: { today: number; week: number; month: number };
  salesCount: { today: number; week: number; month: number };
  paymentMethodBreakdown: { method: string; total: number; count: number }[];
  topProducts: { productId: string; productName: string; revenue: number; units: number }[];
  lowStockProducts: {
    _id: string;
    name: string;
    sku: string;
    currentStock: number;
    lowStockThreshold: number;
  }[];
  expensesMonth: number;
  netProfitMonth: number;
}

export async function buildDashboardSummary(businessId: Types.ObjectId): Promise<DashboardSummary> {
  const now = new Date();
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const month = startOfMonth(now);

  const [totalsAgg, paymentAgg, topProductsAgg, lowStock, expensesAgg] = await Promise.all([
    Sale.aggregate([
      { $match: { businessId, createdAt: { $gte: month } } },
      {
        $group: {
          _id: null,
          todayTotal: {
            $sum: { $cond: [{ $gte: ['$createdAt', today] }, '$totalAmount', 0] },
          },
          weekTotal: {
            $sum: { $cond: [{ $gte: ['$createdAt', week] }, '$totalAmount', 0] },
          },
          monthTotal: { $sum: '$totalAmount' },
          todayCount: { $sum: { $cond: [{ $gte: ['$createdAt', today] }, 1, 0] } },
          weekCount: { $sum: { $cond: [{ $gte: ['$createdAt', week] }, 1, 0] } },
          monthCount: { $sum: 1 },
        },
      },
    ]),
    Sale.aggregate([
      { $match: { businessId, createdAt: { $gte: month } } },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, method: '$_id', total: 1, count: 1 } },
      { $sort: { total: -1 } },
    ]),
    Sale.aggregate([
      { $match: { businessId, createdAt: { $gte: month } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
          units: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          productId: { $toString: '$_id' },
          productName: 1,
          revenue: 1,
          units: 1,
        },
      },
    ]),
    Product.find({
      businessId,
      $expr: { $lt: ['$currentStock', '$lowStockThreshold'] },
    })
      .select('_id name sku currentStock lowStockThreshold')
      .limit(20)
      .lean(),
    Expense.aggregate([
      { $match: { businessId, createdAt: { $gte: month } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totals = totalsAgg[0] || {
    todayTotal: 0,
    weekTotal: 0,
    monthTotal: 0,
    todayCount: 0,
    weekCount: 0,
    monthCount: 0,
  };
  const expensesMonth = expensesAgg[0]?.total || 0;

  return {
    totals: {
      today: totals.todayTotal,
      week: totals.weekTotal,
      month: totals.monthTotal,
    },
    salesCount: {
      today: totals.todayCount,
      week: totals.weekCount,
      month: totals.monthCount,
    },
    paymentMethodBreakdown: paymentAgg,
    topProducts: topProductsAgg,
    lowStockProducts: lowStock.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      sku: p.sku,
      currentStock: p.currentStock,
      lowStockThreshold: p.lowStockThreshold,
    })),
    expensesMonth,
    netProfitMonth: totals.monthTotal - expensesMonth,
  };
}
