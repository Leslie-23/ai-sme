import { Types } from 'mongoose';
import { Sale } from '../models/Sale';
import { Product } from '../models/Product';
import { Expense } from '../models/Expense';
import { Payment } from '../models/Payment';
import { Business } from '../models/Business';

export interface ReportStats {
  businessName: string;
  currency: string;
  generatedAt: string;
  firstActivity: string | null;
  totals: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    expenses: number;
    payments: number;
    netProfit: number;
    productsInCatalog: number;
  };
  paymentMix: { method: string; total: number; count: number; pct: number }[];
  topProducts: { productName: string; revenue: number; units: number }[];
  bottomProducts: { productName: string; revenue: number; units: number }[];
  expenseBreakdown: { category: string; total: number; count: number; pct: number }[];
  lowStock: { name: string; sku: string; currentStock: number; threshold: number }[];
  monthly: { month: string; revenue: number; orders: number; expenses: number }[];
  dayOfWeek: { day: string; revenue: number; orders: number }[];
  bestMonth: { month: string; revenue: number } | null;
  recentTrend: {
    last30Revenue: number;
    previous30Revenue: number;
    changePct: number | null;
  };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthLabel(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`;
}

export async function buildAllTimeReport(businessId: Types.ObjectId): Promise<ReportStats> {
  const now = new Date();
  const last30From = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const prev30From = new Date(now.getTime() - 60 * 24 * 3600 * 1000);

  const [
    business,
    salesAgg,
    paymentMix,
    productAgg,
    expenseAgg,
    totalExpenses,
    totalPayments,
    lowStock,
    monthlyAgg,
    dayAgg,
    last30,
    prev30,
    productCount,
    firstSale,
  ] = await Promise.all([
    Business.findById(businessId),
    Sale.aggregate([
      { $match: { businessId } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
    ]),
    Sale.aggregate([
      { $match: { businessId } },
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
      { $match: { businessId } },
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
      { $project: { _id: 0, productName: 1, revenue: 1, units: 1 } },
    ]),
    Expense.aggregate([
      { $match: { businessId } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, category: '$_id', total: 1, count: 1 } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: { businessId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { businessId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Product.find({ businessId, $expr: { $lt: ['$currentStock', '$lowStockThreshold'] } })
      .select('name sku currentStock lowStockThreshold')
      .sort({ currentStock: 1 })
      .limit(20)
      .lean(),
    Sale.aggregate([
      { $match: { businessId } },
      {
        $group: {
          _id: {
            y: { $year: '$createdAt' },
            m: { $month: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]),
    Sale.aggregate([
      { $match: { businessId } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      { $match: { businessId, createdAt: { $gte: last30From } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
    ]),
    Sale.aggregate([
      { $match: { businessId, createdAt: { $gte: prev30From, $lt: last30From } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
    ]),
    Product.countDocuments({ businessId }),
    Sale.findOne({ businessId }).sort({ createdAt: 1 }).select('createdAt').lean(),
  ]);

  const revenue = salesAgg[0]?.revenue || 0;
  const orders = salesAgg[0]?.orders || 0;
  const expenseTotal = totalExpenses[0]?.total || 0;
  const paymentTotal = totalPayments[0]?.total || 0;

  // Expense breakdown by month for monthly series
  const monthlyExpenseAgg = await Expense.aggregate([
    { $match: { businessId } },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
        total: { $sum: '$amount' },
      },
    },
  ]);
  const expByMonth = new Map<string, number>();
  for (const e of monthlyExpenseAgg) {
    expByMonth.set(monthLabel(e._id.y, e._id.m), e.total);
  }

  const monthly = monthlyAgg.map((row) => {
    const label = monthLabel(row._id.y, row._id.m);
    return {
      month: label,
      revenue: row.revenue,
      orders: row.orders,
      expenses: expByMonth.get(label) || 0,
    };
  });

  const bestMonth = monthly.length
    ? monthly.reduce((b, m) => (m.revenue > b.revenue ? m : b), monthly[0])
    : null;

  const dayOfWeek = DAY_NAMES.map((name, idx) => {
    const row = dayAgg.find((d) => d._id === idx + 1);
    return {
      day: name,
      revenue: row?.revenue || 0,
      orders: row?.orders || 0,
    };
  });

  const last30Revenue = last30[0]?.revenue || 0;
  const previous30Revenue = prev30[0]?.revenue || 0;
  const changePct =
    previous30Revenue > 0
      ? ((last30Revenue - previous30Revenue) / previous30Revenue) * 100
      : last30Revenue > 0
        ? 100
        : null;

  const withPct = <T extends { total: number }>(rows: T[]): (T & { pct: number })[] => {
    const sum = rows.reduce((s, r) => s + r.total, 0) || 1;
    return rows.map((r) => ({ ...r, pct: (r.total / sum) * 100 }));
  };

  return {
    businessName: business?.name || 'Unknown business',
    currency: business?.currency || 'USD',
    generatedAt: now.toISOString(),
    firstActivity: firstSale?.createdAt ? firstSale.createdAt.toISOString() : null,
    totals: {
      revenue,
      orders,
      averageOrderValue: orders > 0 ? revenue / orders : 0,
      expenses: expenseTotal,
      payments: paymentTotal,
      netProfit: revenue + paymentTotal - expenseTotal,
      productsInCatalog: productCount,
    },
    paymentMix: withPct(paymentMix),
    topProducts: productAgg.slice(0, 8),
    bottomProducts: productAgg.length > 8 ? productAgg.slice(-5).reverse() : [],
    expenseBreakdown: withPct(expenseAgg),
    lowStock: lowStock.map((p) => ({
      name: p.name,
      sku: p.sku,
      currentStock: p.currentStock,
      threshold: p.lowStockThreshold,
    })),
    monthly,
    dayOfWeek,
    bestMonth: bestMonth ? { month: bestMonth.month, revenue: bestMonth.revenue } : null,
    recentTrend: { last30Revenue, previous30Revenue, changePct },
  };
}
