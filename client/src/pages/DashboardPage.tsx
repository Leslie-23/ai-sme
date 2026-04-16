import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMoney } from '../lib/format';

interface DashboardSummary {
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

interface Sale {
  _id: string;
  totalAmount: number;
  paymentMethod: string;
  items: { productName: string; quantity: number }[];
  createdAt: string;
}

export function DashboardPage() {
  const { business } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currency = business?.currency || 'USD';

  useEffect(() => {
    Promise.all([api<DashboardSummary>('/dashboard/summary'), api<Sale[]>('/sales', { query: { limit: '10' } })])
      .then(([s, recent]) => {
        setSummary(s);
        setSales(recent);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Loading dashboard…</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Sales today" value={formatMoney(summary.totals.today, currency)} sub={`${summary.salesCount.today} orders`} />
        <KpiCard label="Sales this week" value={formatMoney(summary.totals.week, currency)} sub={`${summary.salesCount.week} orders`} />
        <KpiCard label="Sales this month" value={formatMoney(summary.totals.month, currency)} sub={`${summary.salesCount.month} orders`} />
        <KpiCard label="Low stock items" value={summary.lowStockProducts.length.toString()} sub="below threshold" tone={summary.lowStockProducts.length > 0 ? 'warn' : 'normal'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-slate-800 mb-3">Recent sales</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-slate-500">No sales yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 text-xs uppercase">
                <tr>
                  <th className="py-2">When</th>
                  <th>Items</th>
                  <th>Method</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => (
                  <tr key={s._id}>
                    <td className="py-2 text-slate-600">{formatDate(s.createdAt)}</td>
                    <td className="text-slate-700">
                      {s.items.map((it) => `${it.productName} ×${it.quantity}`).join(', ')}
                    </td>
                    <td>
                      <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="text-right font-medium">{formatMoney(s.totalAmount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-3">Payment methods</h2>
          {summary.paymentMethodBreakdown.length === 0 ? (
            <p className="text-sm text-slate-500">No data.</p>
          ) : (
            <ul className="space-y-2">
              {summary.paymentMethodBreakdown.map((p) => (
                <li key={p.method} className="flex justify-between text-sm">
                  <span className="text-slate-600">{p.method}</span>
                  <span className="font-medium">
                    {formatMoney(p.total, currency)} <span className="text-slate-400">({p.count})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-3">Top products this month</h2>
          {summary.topProducts.length === 0 ? (
            <p className="text-sm text-slate-500">No sales yet.</p>
          ) : (
            <ul className="space-y-2">
              {summary.topProducts.map((p) => (
                <li key={p.productId} className="flex justify-between text-sm">
                  <span className="text-slate-700">{p.productName}</span>
                  <span className="font-medium">
                    {formatMoney(p.revenue, currency)} <span className="text-slate-400">· {p.units}u</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-3">Low stock alerts</h2>
          {summary.lowStockProducts.length === 0 ? (
            <p className="text-sm text-slate-500">All stocked.</p>
          ) : (
            <ul className="space-y-2">
              {summary.lowStockProducts.map((p) => (
                <li key={p._id} className="flex justify-between text-sm">
                  <span className="text-slate-700">
                    {p.name} <span className="text-slate-400">({p.sku})</span>
                  </span>
                  <span className="font-medium text-amber-600">
                    {p.currentStock} / {p.lowStockThreshold}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'normal' | 'warn' }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone === 'warn' ? 'text-amber-600' : 'text-slate-900'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
