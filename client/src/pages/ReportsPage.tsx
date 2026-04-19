import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDate } from '../lib/format';

interface ReportStats {
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

interface ReportResponse {
  stats: ReportStats;
  report: string;
  modelUsed: string;
  generatedAt: string;
}

export function ReportsPage() {
  const { business } = useAuth();
  const currency = business?.currency || 'USD';
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await api<ReportResponse>('/reports');
      setData(r);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading && !data) return <div className="text-neutral-500 text-sm">Building report…</div>;
  if (error && !data) {
    return (
      <div className="space-y-3">
        <div className="text-red-600 text-sm">Error: {error}</div>
        <button type="button" onClick={load} className="btn-ghost !px-3 !py-1.5 !border !border-neutral-200 text-sm">
          Retry
        </button>
      </div>
    );
  }
  if (!data) return null;

  const { stats, report, modelUsed, generatedAt } = data;
  const trend = stats.recentTrend;
  const trendTone =
    trend.changePct == null ? 'neutral' : trend.changePct >= 0 ? 'good' : 'bad';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">All-time report</div>
          <div className="text-xs text-neutral-500 mt-1">
            Generated {formatDate(generatedAt)} · Model {modelUsed}
            {stats.firstActivity ? ` · Since ${formatDate(stats.firstActivity).split(',')[0]}` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="btn-ghost !px-3 !py-1.5 !border !border-neutral-200 text-sm disabled:opacity-50"
        >
          {loading ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-neutral-200 [&>*]:border-r [&>*]:border-b [&>*]:border-neutral-200 [&>*:nth-child(2n)]:border-r-0 lg:[&>*]:border-b-0 lg:[&>*:nth-child(2n)]:border-r lg:[&>*:last-child]:border-r-0">
        <Kpi label="Total revenue" value={formatMoney(stats.totals.revenue, currency)} sub={`${stats.totals.orders} orders`} />
        <Kpi label="Avg order value" value={formatMoney(stats.totals.averageOrderValue, currency)} sub={`${stats.totals.productsInCatalog} products`} />
        <Kpi
          label="Net profit"
          value={formatMoney(stats.totals.netProfit, currency)}
          sub={`${formatMoney(stats.totals.expenses, currency)} expenses`}
          tone={stats.totals.netProfit < 0 ? 'warn' : 'normal'}
        />
        <Kpi
          label="Last 30 days"
          value={formatMoney(trend.last30Revenue, currency)}
          sub={
            trend.changePct == null
              ? 'no prior 30d data'
              : `${trend.changePct >= 0 ? '+' : ''}${trend.changePct.toFixed(1)}% vs prior 30d`
          }
          tone={trendTone === 'bad' ? 'warn' : 'normal'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
            <div className="section-title">AI insights</div>
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">{modelUsed}</span>
          </div>
          <div className="p-5 text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
            {report}
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="Payment mix">
            {stats.paymentMix.length === 0 ? (
              <Empty text="No sales yet." />
            ) : (
              <ul className="divide-y divide-neutral-100">
                {stats.paymentMix.map((p) => (
                  <li key={p.method} className="flex justify-between py-2 text-sm">
                    <span className="text-neutral-800 capitalize truncate pr-2">{p.method}</span>
                    <span className="tabular-nums text-neutral-900">
                      {formatMoney(p.total, currency)}
                      <span className="text-neutral-400"> · {p.pct.toFixed(0)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Best month">
            {stats.bestMonth ? (
              <div className="py-2">
                <div className="text-xl font-semibold text-neutral-900 tabular-nums">
                  {formatMoney(stats.bestMonth.revenue, currency)}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">{stats.bestMonth.month}</div>
              </div>
            ) : (
              <Empty text="No monthly data yet." />
            )}
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Top products">
          {stats.topProducts.length === 0 ? (
            <Empty text="No product sales yet." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stats.topProducts.map((p) => (
                <li key={p.productName} className="flex justify-between py-2 text-sm">
                  <span className="text-neutral-800 truncate pr-2">{p.productName}</span>
                  <span className="tabular-nums text-neutral-900">
                    {formatMoney(p.revenue, currency)}
                    <span className="text-neutral-400"> · {p.units}u</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Expense breakdown">
          {stats.expenseBreakdown.length === 0 ? (
            <Empty text="No expenses logged." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stats.expenseBreakdown.map((e) => (
                <li key={e.category} className="flex justify-between py-2 text-sm">
                  <span className="text-neutral-800 capitalize truncate pr-2">{e.category}</span>
                  <span className="tabular-nums text-neutral-900">
                    {formatMoney(e.total, currency)}
                    <span className="text-neutral-400"> · {e.pct.toFixed(0)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Low stock" badge={stats.lowStock.length.toString()}>
          {stats.lowStock.length === 0 ? (
            <Empty text="All stocked." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stats.lowStock.slice(0, 8).map((p) => (
                <li key={p.sku || p.name} className="flex justify-between py-2 text-sm">
                  <span className="text-neutral-800 truncate pr-2">{p.name}</span>
                  <span className="tabular-nums text-neutral-900">
                    {p.currentStock}
                    <span className="text-neutral-400"> / {p.threshold}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Revenue by day of week">
          <div className="grid grid-cols-7 gap-2 py-2">
            {stats.dayOfWeek.map((d) => {
              const max = Math.max(...stats.dayOfWeek.map((x) => x.revenue), 1);
              const h = Math.max(4, Math.round((d.revenue / max) * 80));
              return (
                <div key={d.day} className="flex flex-col items-center gap-1">
                  <div className="w-full h-20 flex items-end">
                    <div
                      className="w-full bg-neutral-900"
                      style={{ height: `${h}px` }}
                      title={`${formatMoney(d.revenue, currency)} · ${d.orders} orders`}
                    />
                  </div>
                  <div className="text-[10px] text-neutral-500">{d.day}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {stats.monthly.length > 0 && (
        <Panel title="Monthly trend">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-neutral-500">
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4 font-medium">Month</th>
                  <th className="text-right py-2 pr-4 font-medium">Revenue</th>
                  <th className="text-right py-2 pr-4 font-medium">Orders</th>
                  <th className="text-right py-2 font-medium">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthly.map((m) => (
                  <tr key={m.month} className="border-b border-neutral-100 last:border-b-0">
                    <td className="py-2 pr-4 text-neutral-800">{m.month}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(m.revenue, currency)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{m.orders}</td>
                    <td className="py-2 text-right tabular-nums text-neutral-600">{formatMoney(m.expenses, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = 'normal',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'normal' | 'warn';
}) {
  return (
    <div className="p-4 md:p-5">
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div
        className={`mt-2 text-xl md:text-2xl font-semibold tabular-nums ${
          tone === 'warn' ? 'text-amber-700' : 'text-neutral-900'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-neutral-500 mt-1 truncate">{sub}</div>}
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
    <div className="card p-0">
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <div className="section-title">{title}</div>
        {badge && <span className="chip">{badge}</span>}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-4 text-xs text-neutral-500">{text}</div>;
}
