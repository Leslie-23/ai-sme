import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatMoney } from '../lib/format';

interface AdminAnalytics {
  totals: {
    businesses: number;
    products: number;
    sales: number;
    expenses: number;
    aiQuestions: number;
    feedback: number;
    positiveFeedback: number;
    setupLeads: number;
  };
  eventsLast30Days: { name: string; count: number }[];
  businesses: {
    id: string;
    name: string;
    businessType: string;
    plan: string;
    status: string;
    createdAt: string;
    products: number;
    sales: number;
    revenue: number;
    aiQuestions: number;
    feedback: number;
    usefulFeedback: number;
  }[];
}

export function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AdminAnalytics>('/admin/analytics')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-sm text-red-600">Error: {error}</div>;
  if (!data) return <div className="text-sm text-neutral-500">Loading analytics...</div>;

  const activationReady = data.businesses.filter((b) => b.products > 0 && b.sales > 0).length;
  const positiveRate =
    data.totals.feedback > 0
      ? Math.round((data.totals.positiveFeedback / data.totals.feedback) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="label">Internal pilot analytics</div>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          Activation, usage, and feedback
        </h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl">
          Use this page to see which pilot businesses are reaching first value, asking questions,
          generating feedback, and moving toward paid usage.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 bg-white border border-neutral-200 [&>*]:border-r [&>*]:border-b [&>*]:border-neutral-200 [&>*:nth-child(2n)]:border-r-0 lg:[&>*]:border-b-0 lg:[&>*:nth-child(2n)]:border-r lg:[&>*:last-child]:border-r-0">
        <Metric label="Businesses" value={data.totals.businesses.toString()} sub={`${activationReady} activated`} />
        <Metric label="Sales recorded" value={data.totals.sales.toString()} sub={`${data.totals.products} products`} />
        <Metric label="AI questions" value={data.totals.aiQuestions.toString()} sub="assistant usage" />
        <Metric label="Feedback" value={`${positiveRate}%`} sub={`${data.totals.feedback} total`} />
        <Metric label="Setup leads" value={data.totals.setupLeads.toString()} sub="assisted setup" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card">
          <div className="px-5 py-3 border-b border-neutral-200 section-title">Pilot businesses</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 text-[11px] uppercase tracking-wider border-b border-neutral-200">
                  <th className="px-5 py-2.5 font-medium">Business</th>
                  <th className="py-2.5 font-medium">Type</th>
                  <th className="py-2.5 font-medium text-right">Products</th>
                  <th className="py-2.5 font-medium text-right">Sales</th>
                  <th className="py-2.5 font-medium text-right">AI</th>
                  <th className="px-5 py-2.5 font-medium text-right">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-neutral-900">{b.name}</div>
                      <div className="text-[11px] text-neutral-500">
                        {b.plan} / {b.status} / {new Date(b.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-2.5 text-neutral-600">{b.businessType}</td>
                    <td className="py-2.5 text-right tabular-nums">{b.products}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {b.sales}
                      <div className="text-[11px] text-neutral-500">{formatMoney(b.revenue, 'USD')}</div>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{b.aiQuestions}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {b.usefulFeedback}/{b.feedback}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-3 border-b border-neutral-200 section-title">Events last 30 days</div>
          <ul className="divide-y divide-neutral-100 px-5 py-2">
            {data.eventsLast30Days.length === 0 ? (
              <li className="py-3 text-sm text-neutral-500">No events yet.</li>
            ) : (
              data.eventsLast30Days.map((e) => (
                <li key={e.name} className="py-2 flex justify-between gap-3 text-sm">
                  <span className="text-neutral-700 truncate">{e.name}</span>
                  <span className="font-semibold tabular-nums">{e.count}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-5">
      <div className="label">{label}</div>
      <div className="text-2xl font-semibold mt-2 tabular-nums tracking-tight">{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{sub}</div>
    </div>
  );
}
