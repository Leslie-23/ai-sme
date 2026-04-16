import { Types } from 'mongoose';
import { Sale } from '../models/Sale';
import { Product } from '../models/Product';
import { Expense } from '../models/Expense';
import { Business } from '../models/Business';

export interface AIContext {
  businessName: string;
  currency: string;
  dateRange: { from: string; to: string };
  salesSummary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
  };
  paymentMethodBreakdown: { method: string; total: number; count: number }[];
  topProducts: { productName: string; revenue: number; units: number }[];
  bottomProducts: { productName: string; revenue: number; units: number }[];
  lowStockProducts: { name: string; sku: string; currentStock: number }[];
  recentExpenses: { amount: number; category: string; description?: string; createdAt: string }[];
}

export async function buildAIContext(
  businessId: Types.ObjectId,
  dateRange?: { from?: string; to?: string }
): Promise<AIContext> {
  const now = new Date();
  const from = dateRange?.from ? new Date(dateRange.from) : new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const to = dateRange?.to ? new Date(dateRange.to) : now;

  const business = await Business.findById(businessId);
  const businessName = business?.name || 'Unknown business';
  const currency = business?.currency || 'USD';

  const [salesAgg, paymentAgg, productAgg, lowStock, expenses] = await Promise.all([
    Sale.aggregate([
      { $match: { businessId, createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
    ]),
    Sale.aggregate([
      { $match: { businessId, createdAt: { $gte: from, $lte: to } } },
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
      { $match: { businessId, createdAt: { $gte: from, $lte: to } } },
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
    Product.find({ businessId, $expr: { $lt: ['$currentStock', '$lowStockThreshold'] } })
      .select('name sku currentStock')
      .limit(15)
      .lean(),
    Expense.find({ businessId, createdAt: { $gte: from, $lte: to } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const totalRevenue = salesAgg[0]?.totalRevenue || 0;
  const totalOrders = salesAgg[0]?.totalOrders || 0;
  const topProducts = productAgg.slice(0, 5);
  const bottomProducts = productAgg.slice(-5).reverse();

  return {
    businessName,
    currency,
    dateRange: { from: from.toISOString(), to: to.toISOString() },
    salesSummary: {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    },
    paymentMethodBreakdown: paymentAgg,
    topProducts,
    bottomProducts,
    lowStockProducts: lowStock.map((p) => ({
      name: p.name,
      sku: p.sku,
      currentStock: p.currentStock,
    })),
    recentExpenses: expenses.map((e) => ({
      amount: e.amount,
      category: e.category,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
