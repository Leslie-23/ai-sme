import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMoney } from '../lib/format';
import { ChatPanel } from '../components/ChatPanel';
import { track } from '../lib/analytics';
import { SetupLeadModal } from '../components/SetupLeadModal';

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
  productCount: number;
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

interface DemoSeedStatus {
  running: boolean;
  progress: number;
  message: string;
  phase: string;
  updatedAt: string;
}

interface WorkspaceSnapshot {
  business: {
    name: string;
    currency: string;
    timezone: string;
    businessType: string;
    categories: string[];
    terminology: string;
  };
  products: Array<{ _id: string }>;
  sales: Array<{ _id: string }>;
  payments: Array<{ _id: string }>;
  expenses: Array<{ _id: string }>;
  inventoryLogs: Array<{ _id: string }>;
}

type ModalState =
  | { type: 'seed' }
  | { type: 'real'; snapshotAvailable: boolean }
  | null;

const REAL_BACKUP_KEY = 'ai_sme_real_workspace_snapshot';

export function DashboardPage() {
  const { business } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [seedStatus, setSeedStatus] = useState<DemoSeedStatus | null>(null);
  const [sampleShopReady, setSampleShopReady] = useState(() => localStorage.getItem('ai_sme_sample_shop') === '1');
  const [modal, setModal] = useState<ModalState>(null);
  const [setupLeadOpen, setSetupLeadOpen] = useState(false);
  const currency = business?.currency || 'USD';
  const showOnboardingChecklist = !sampleShopReady;

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

  useEffect(() => {
    if (!seedingDemo) return;
    let cancelled = false;

    const refreshStatus = async () => {
      try {
        const status = await api<DemoSeedStatus>('/demo/status');
        if (!cancelled) setSeedStatus(status);
      } catch {
        // The seed request is authoritative; this is just a live notice stream.
      }
    };

    void refreshStatus();
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 800);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [seedingDemo]);

  if (loading) return <div className="text-neutral-500 text-sm">Loading...</div>;
  if (error) return <div className="text-red-600 text-sm">Error: {error}</div>;
  if (!summary) return null;

  async function seedDemo() {
    setModal({ type: 'seed' });
  }

  async function runSeedDemo() {
    if (!sampleShopReady && !localStorage.getItem(REAL_BACKUP_KEY)) {
      await saveRealWorkspaceSnapshot();
    }
    setSeedStatus(null);
    setSeedingDemo(true);
    setError(null);
    try {
      await api('/demo/seed', { method: 'POST' });
      track('demo_seeded');
      localStorage.setItem('ai_sme_sample_shop', '1');
      setSampleShopReady(true);
      const [freshSummary, freshSales] = await Promise.all([
        api<DashboardSummary>('/dashboard/summary'),
        api<Sale[]>('/sales', { query: { limit: '6' } }),
      ]);
      setSummary(freshSummary);
      setSales(freshSales);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Demo setup failed');
    } finally {
      setSeedingDemo(false);
    }
  }

  async function clearSampleData() {
    setModal({ type: 'real', snapshotAvailable: Boolean(localStorage.getItem(REAL_BACKUP_KEY)) });
  }

  async function continueFormerData() {
    const raw = localStorage.getItem(REAL_BACKUP_KEY);
    if (!raw) {
      await startFreshBlank();
      return;
    }
    const snapshot = JSON.parse(raw) as WorkspaceSnapshot;
    setModal(null);
    setSeedStatus(null);
    setSeedingDemo(true);
    setError(null);
    try {
      await api('/demo/restore', { method: 'POST', body: { snapshot } });
      localStorage.removeItem('ai_sme_sample_shop');
      setSampleShopReady(false);
      const [freshSummary, freshSales] = await Promise.all([
        api<DashboardSummary>('/dashboard/summary'),
        api<Sale[]>('/sales', { query: { limit: '6' } }),
      ]);
      setSummary(freshSummary);
      setSales(freshSales);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not clear sample data');
    } finally {
      setSeedingDemo(false);
    }
  }

  async function startFreshBlank() {
    setModal(null);
    setSeedStatus(null);
    setSeedingDemo(true);
    setError(null);
    try {
      await api('/demo/clear', { method: 'POST' });
      localStorage.removeItem('ai_sme_sample_shop');
      const [freshSummary, freshSales] = await Promise.all([
        api<DashboardSummary>('/dashboard/summary'),
        api<Sale[]>('/sales', { query: { limit: '6' } }),
      ]);
      setSampleShopReady(false);
      setSummary(freshSummary);
      setSales(freshSales);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not clear sample data');
    } finally {
      setSeedingDemo(false);
    }
  }

  async function saveRealWorkspaceSnapshot() {
    try {
      const snapshot = await api<WorkspaceSnapshot>('/demo/snapshot');
      localStorage.setItem(REAL_BACKUP_KEY, JSON.stringify(snapshot));
    } catch {
      // If snapshot export fails, continue with seeding. The user can still use the app.
    }
  }

  async function openSetupModal() {
    setSetupLeadOpen(true);
  }

  function openRealModal() {
    setModal({ type: 'real', snapshotAvailable: Boolean(localStorage.getItem(REAL_BACKUP_KEY)) });
  }

  return (
    <div className="relative space-y-6">
      <div className={seedingDemo || modal ? 'blur-sm pointer-events-none select-none' : ''}>
        {sampleShopReady ? (
          <div className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Owner setup</div>
                <div className="text-sm text-neutral-600 mt-1">Sample shop loaded. Get keys or reseed.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/help/keys" className="btn-primary !px-3 !py-1.5 text-xs">
                  Get the keys
                </Link>
              <button type="button" onClick={seedDemo} disabled={seedingDemo} className="btn-secondary !px-3 !py-1.5 text-xs">
                {seedingDemo ? 'Preparing...' : 'Reseed sample shop'}
              </button>
            </div>
          </div>
          </div>
        ) : null}

        {showOnboardingChecklist && <OnboardingChecklist summary={summary} />}

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
            <ChatPanel sessionId="dashboard" heightClass="h-[70vh] xl:h-[560px]" showDateRange />
          </div>

          <div className="space-y-6">
            <AttentionPanel summary={summary} currency={currency} />

          <Panel title="Restock risks" badge={summary.lowStockProducts.length.toString()}>
            {summary.lowStockProducts.length === 0 ? (
              <Empty
                text={
                  summary.productCount === 0
                    ? 'Import products and opening stock to see restock risks.'
                    : 'All stocked. Review thresholds after a few more sales.'
                }
              />
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

          <Panel title="Fast sellers">
            {summary.topProducts.length === 0 ? (
              <Empty text="Record a few sales to reveal fast sellers and reorder signals." />
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
              <Empty text="Record recent sales or import a sales history to unlock owner insights." />
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
                        {s.items.map((it) => `${it.productName} x${it.quantity}`).join(', ')}
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
            <Empty text="Record sales with payment methods to see cash, card, transfer, or mobile-money mix." />
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

      <div className="fixed bottom-5 right-5 z-40">
        {sampleShopReady ? (
          <button
            type="button"
            onClick={openRealModal}
            className="btn-primary !px-3 !py-2 text-xs shadow-lg"
          >
            Try with real business
          </button>
        ) : (
          <button type="button" onClick={openSetupModal} className="btn-primary !px-3 !py-2 text-xs shadow-lg">
            Book assisted setup
          </button>
        )}
      </div>

      {seedingDemo && (
        <div className="modal-overlay z-50 !bg-white/70">
          <div className="modal-panel max-w-xl px-6 py-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Preparing sample shop</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">Loading demo data</div>
            <p className="mt-2 text-sm text-neutral-600">
              This seeds a year of activity, so the dashboard and reports look like a real business.
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-neutral-900">
                  {seedStatus?.message || 'Waiting for the first seed update...'}
                </span>
                <span className="text-xs text-neutral-500 tabular-nums">
                  {Math.max(1, Math.min(seedStatus?.progress || 0, 100))}%
                </span>
              </div>
              <div className="h-1.5 bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-neutral-900 transition-all duration-500"
                  style={{ width: `${Math.max(1, Math.min(seedStatus?.progress || 1, 100))}%` }}
                />
              </div>
              <div className="text-xs text-neutral-500">
                {seedStatus?.phase ? `Phase: ${seedStatus.phase}` : 'Phase: initializing'}
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay z-[60]">
          <div className="modal-panel max-w-lg px-6 py-5">
            {modal.type === 'seed' && (
              <>
                <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Sample workspace</div>
                <div className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">Load demo data?</div>
                <p className="mt-2 text-sm text-neutral-600">
                  This will replace the current workspace with the demo shop, including a year of sales, expenses, and stock movements.
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" className="btn-secondary !px-3 !py-1.5 text-sm" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary !px-3 !py-1.5 text-sm"
                    onClick={async () => {
                      setModal(null);
                      await runSeedDemo();
                    }}
                  >
                    Load sample shop
                  </button>
                </div>
              </>
            )}

            {modal.type === 'real' && (
              <>
                <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Real workspace</div>
                <div className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">Return to your live data?</div>
                <p className="mt-2 text-sm text-neutral-600">
                  We can restore the saved workspace from before the demo, or start the business fresh.
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" className="btn-secondary !px-3 !py-1.5 text-sm" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                  {modal.snapshotAvailable && (
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-1.5 text-sm"
                      onClick={continueFormerData}
                    >
                      Continue with former data
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-primary !px-3 !py-1.5 text-sm"
                    onClick={startFreshBlank}
                  >
                    Start afresh
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <SetupLeadModal open={setupLeadOpen} onClose={() => setSetupLeadOpen(false)} source="dashboard" />
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

function OnboardingChecklist({ summary }: { summary: DashboardSummary }) {
  const steps = [
    {
      label: 'Load products and opening stock',
      done: summary.productCount > 0,
      href: '/import',
      next: 'Import a product list or add the first product manually.',
    },
    {
      label: 'Record or import recent sales',
      done: summary.salesCount.month > 0,
      href: summary.productCount > 0 ? '/sales' : '/import',
      next: 'Add a sale so fast sellers and payment mix become visible.',
    },
    {
      label: 'Add monthly expenses',
      done: summary.expensesMonth > 0,
      href: '/import',
      next: 'Log rent, utilities, restocking costs, wages, or fees.',
    },
    {
      label: 'Ask the first owner question',
      done: summary.productCount > 0 && summary.salesCount.month > 0,
      href: '/chat',
      next: 'Ask what to restock, what sold fastest, or where profit is leaking.',
    },
    {
      label: 'Generate the owner report',
      done: summary.productCount > 0 && summary.salesCount.month > 0 && summary.expensesMonth > 0,
      href: '/reports',
      next: 'Create a weekly-style report once sales and expenses exist.',
    },
  ];
  const completed = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);
  if (completed === steps.length) return null;

  return (
    <div className="card p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="label">Pilot onboarding</div>
          <h2 className="text-lg font-semibold tracking-tight mt-1">
            Get this business to its first useful insight
          </h2>
          <p className="text-sm text-neutral-600 mt-2 max-w-2xl">
            Complete enough setup to show what sold, what is low, where profit is pressured,
            and what the owner should do next.
          </p>
        </div>
        <div className="text-sm font-semibold tabular-nums text-neutral-900">
          {completed}/{steps.length} complete
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-4">
        {steps.map((step, idx) => (
          <a
            key={step.label}
            href={step.href}
            onClick={() => track('onboarding_step_clicked', { step: step.label, done: step.done })}
            className={`border p-3 text-sm transition-colors ${
              step.done
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-neutral-200 bg-white hover:border-neutral-900'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">Step {idx + 1}</div>
            <div className="font-medium mt-1">{step.label}</div>
            <div className="text-xs text-neutral-500 mt-1">{step.done ? 'Completed' : step.next}</div>
          </a>
        ))}
      </div>
      {nextStep && (
        <div className="mt-4 text-sm text-neutral-600">
          Next: <a className="font-medium text-neutral-900 underline underline-offset-4" href={nextStep.href}>{nextStep.next}</a>
        </div>
      )}
    </div>
  );
}

function AttentionPanel({ summary, currency }: { summary: DashboardSummary; currency: string }) {
  const actions = buildOwnerActions(summary, currency);
  return (
    <Panel title="What needs attention" badge={actions.length.toString()}>
      <ul className="divide-y divide-neutral-100">
        {actions.map((a) => (
          <li key={a.title} className="py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-neutral-900">{a.title}</div>
                <div className="text-xs text-neutral-600 mt-1">{a.body}</div>
              </div>
              <span className={`chip shrink-0 ${a.tone === 'risk' ? '!border-amber-300 !text-amber-800' : ''}`}>
                {a.label}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function buildOwnerActions(summary: DashboardSummary, currency: string): {
  title: string;
  body: string;
  label: string;
  tone?: 'risk' | 'normal';
}[] {
  const actions: {
    title: string;
    body: string;
    label: string;
    tone?: 'risk' | 'normal';
  }[] = [];

  if (summary.productCount === 0) {
    actions.push({
      title: 'Load the product catalog',
      body: 'Products and opening stock are required before stock risks, fast sellers, and sale recording can work.',
      label: 'Setup',
      tone: 'risk',
    });
  }

  if (summary.salesCount.month === 0) {
    actions.push({
      title: 'Add recent sales',
      body: 'Record or import sales to reveal top products, payment mix, and weekly owner summaries.',
      label: 'Setup',
      tone: 'risk',
    });
  }

  if (summary.lowStockProducts.length > 0) {
    const names = summary.lowStockProducts.slice(0, 3).map((p) => p.name).join(', ');
    actions.push({
      title: 'Prepare a restock list',
      body: `${names}${summary.lowStockProducts.length > 3 ? ' and more' : ''} are below threshold.`,
      label: 'Stock',
      tone: 'risk',
    });
  }

  if (summary.topProducts.length > 0) {
    const top = summary.topProducts[0];
    actions.push({
      title: 'Protect the fast seller',
      body: `${top.productName} is leading this month. Check stock depth before the next busy period.`,
      label: 'Sales',
    });
  }

  if (summary.expensesMonth === 0) {
    actions.push({
      title: 'Add expenses to see real profit',
      body: 'Revenue alone can hide margin pressure. Add rent, payroll, restocking, delivery, and fees.',
      label: 'Profit',
    });
  } else if (summary.netProfitMonth < 0) {
    actions.push({
      title: 'Review expense pressure',
      body: `This month is negative after ${formatMoney(summary.expensesMonth, currency)} in expenses.`,
      label: 'Profit',
      tone: 'risk',
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: 'Generate the owner report',
      body: 'Sales, stock, and expense data are ready. Create a report and turn it into next-week actions.',
      label: 'Report',
    });
  }

  return actions.slice(0, 5);
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
