import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMoney } from '../lib/format';
import { ChatPanel } from '../components/ChatPanel';

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
    Promise.all([
      api<DashboardSummary>('/dashboard/summary'),
      api<Sale[]>('/sales', { query: { limit: '6' } }),
    ])
      .then(([s, recent]) => {
        setSummary(s);
        setSales(recent);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-neutral-500 text-sm">Loading…</div>;
  if (error) return <div className="text-red-600 text-sm">Error: {error}</div>;
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-neutral-200 [&>*]:border-r [&>*]:border-b [&>*]:border-neutral-200 [&>*:nth-child(2n)]:border-r-0 lg:[&>*]:border-b-0 lg:[&>*:nth-child(2n)]:border-r lg:[&>*:last-child]:border-r-0">
        <KpiCard
          label="Revenue today"
          value={formatMoney(summary.totals.today, currency)}
          sub={`${summary.salesCount.today} orders`}
        />
        <KpiCard
          label="This week"
          value={formatMoney(summary.totals.week, currency)}
          sub={`${summary.salesCount.week} orders`}
        />
        <KpiCard
          label="This month"
          value={formatMoney(summary.totals.month, currency)}
          sub={`${summary.salesCount.month} orders`}
        />
        <KpiCard
          label="Net profit (month)"
          value={formatMoney(summary.netProfitMonth, currency)}
          sub={`${formatMoney(summary.expensesMonth, currency)} expenses`}
          tone={summary.netProfitMonth < 0 ? 'warn' : 'normal'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ChatPanel sessionId="dashboard" heightClass="h-[70vh] xl:h-[560px]" />
        </div>

        <div className="space-y-6">
          <Panel title="Low stock" badge={summary.lowStockProducts.length.toString()}>
            {summary.lowStockProducts.length === 0 ? (
              <Empty text="All stocked." />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {summary.lowStockProducts.slice(0, 6).map((p) => (
                  <li key={p._id} className="flex justify-between py-2 text-sm">
                    <span className="text-neutral-800 truncate pr-2">{p.name}</span>
                    <span className="font-semibold text-neutral-900 tabular-nums">
                      {p.currentStock}
                      <span className="text-neutral-400"> / {p.lowStockThreshold}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Top products">
            {summary.topProducts.length === 0 ? (
              <Empty text="No sales yet." />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {summary.topProducts.map((p) => (
                  <li key={p.productId} className="flex justify-between py-2 text-sm">
                    <span className="text-neutral-800 truncate pr-2">{p.productName}</span>
                    <span className="font-semibold text-neutral-900 tabular-nums">
                      {formatMoney(p.revenue, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel title="Recent sales">
            {sales.length === 0 ? (
              <Empty text="No sales yet." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 text-[11px] uppercase tracking-wider border-b border-neutral-200">
                    <th className="py-2 font-medium">When</th>
                    <th className="py-2 font-medium">Items</th>
                    <th className="py-2 font-medium">Method</th>
                    <th className="py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {sales.map((s) => (
                    <tr key={s._id}>
                      <td className="py-2.5 text-neutral-600 whitespace-nowrap">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="py-2.5 text-neutral-800 max-w-xs truncate">
                        {s.items.map((it) => `${it.productName} ×${it.quantity}`).join(', ')}
                      </td>
                      <td className="py-2.5">
                        <span className="chip">{s.paymentMethod}</span>
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">
                        {formatMoney(s.totalAmount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
        <Panel title="Payment methods">
          {summary.paymentMethodBreakdown.length === 0 ? (
            <Empty text="No data." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {summary.paymentMethodBreakdown.map((p) => (
                <li key={p.method} className="flex justify-between py-2 text-sm">
                  <span className="text-neutral-700">{p.method}</span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(p.total, currency)}
                    <span className="text-neutral-400 text-xs ml-1">({p.count})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'normal' | 'warn';
}) {
  return (
    <div className="p-5">
      <div className="label">{label}</div>
      <div
        className={`text-2xl font-semibold mt-2 tabular-nums tracking-tight ${
          tone === 'warn' ? 'text-amber-700' : 'text-neutral-900'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}

function Panel({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
        <div className="section-title">{title}</div>
        {badge && <span className="chip">{badge}</span>}
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-neutral-500 py-2">{text}</p>;
}
