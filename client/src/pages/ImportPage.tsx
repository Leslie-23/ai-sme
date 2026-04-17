import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';
import {
  AttachedFile,
  AttachmentChips,
  FileAttach,
  formatAttachmentsForPrompt,
} from '../components/FileAttach';

type PaymentMethod = 'CASH' | 'MOMO' | 'CARD' | 'TRANSFER';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface ImportProduct {
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  currentStock: number;
  lowStockThreshold: number;
}
interface ImportSale {
  items: { sku: string; quantity: number }[];
  paymentMethod: PaymentMethod;
  createdAt?: string;
}
interface ImportPayment {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  createdAt?: string;
}
interface ImportExpense {
  amount: number;
  category: string;
  description?: string;
  createdAt?: string;
}

interface Buckets {
  products: ImportProduct[];
  sales: ImportSale[];
  payments: ImportPayment[];
  expenses: ImportExpense[];
}

interface ExtractResponse {
  reply: string;
  records: Buckets;
  done: boolean;
  modelUsed: string;
}

interface ApplyAutoResponse {
  products: { inserted: number; updated?: number; matched?: number };
  sales: { inserted: number };
  payments: { inserted: number };
  expenses: { inserted: number };
}

const emptyBuckets = (): Buckets => ({
  products: [],
  sales: [],
  payments: [],
  expenses: [],
});

const bucketTotal = (b: Buckets) =>
  b.products.length + b.sales.length + b.payments.length + b.expenses.length;

const INTRO =
  "Hi! I'm your universal import assistant. Paste anything — a product catalog, a list of sales, receipts, deposits, expenses — or attach a CSV / text file. I'll classify each row into products, sales, payments, or expenses automatically and queue them on the right for you to review before saving.";

export function ImportPage() {
  const { business } = useAuth();
  const currency = business?.currency || 'USD';
  const features = business?.features;

  const showPayments = features?.payments !== false;
  const showExpenses = features?.expenses !== false;

  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: crypto.randomUUID(), role: 'assistant', text: INTRO },
  ]);
  const [input, setInput] = useState('');
  const [attached, setAttached] = useState<AttachedFile[]>([]);
  const [pending, setPending] = useState<Buckets>(emptyBuckets);
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(
    () => ({
      products: pending.products.length,
      sales: pending.sales.length,
      payments: pending.payments.length,
      expenses: pending.expenses.length,
    }),
    [pending]
  );
  const total = counts.products + counts.sales + counts.payments + counts.expenses;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  function resetAll() {
    if (total > 0 || messages.some((m) => m.role === 'user')) {
      if (!confirm('Clear the current chat and queued records?')) return;
    }
    setMessages([{ id: crypto.randomUUID(), role: 'assistant', text: INTRO }]);
    setPending(emptyBuckets());
    setInput('');
    setAttached([]);
    setError(null);
    setStatus(null);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed && attached.length === 0) return;
    const fileLabels =
      attached.length > 0 ? `\n\n(attached: ${attached.map((a) => a.name).join(', ')})` : '';
    const displayText = (trimmed || '(files attached)') + fileLabels;
    const fullText = trimmed + formatAttachmentsForPrompt(attached);

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: 'user', text: displayText };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setAttached([]);
    setSending(true);
    setError(null);
    try {
      const res = await api<ExtractResponse>('/import/extract', {
        method: 'POST',
        body: {
          kind: 'auto',
          messages: history.map((m, i) =>
            i === history.length - 1 && m.role === 'user'
              ? { role: m.role, text: fullText || displayText }
              : { role: m.role, text: m.text }
          ),
          alreadyExtracted: counts,
        },
      });
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'assistant', text: res.reply },
      ]);
      setPending((prev) => mergeBuckets(prev, res.records));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Extraction failed');
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function removeFrom<K extends keyof Buckets>(bucket: K, idx: number) {
    setPending((prev) => ({
      ...prev,
      [bucket]: prev[bucket].filter((_, i) => i !== idx),
    }));
  }

  async function apply() {
    if (total === 0) return;
    setApplying(true);
    setError(null);
    setStatus(null);
    try {
      const res = await api<ApplyAutoResponse>('/import/apply', {
        method: 'POST',
        body: { kind: 'auto', records: pending },
      });
      const parts: string[] = [];
      if (res.products.inserted || res.products.updated) {
        parts.push(`${res.products.inserted} new / ${res.products.updated ?? 0} updated products`);
      }
      if (res.sales.inserted) parts.push(`${res.sales.inserted} sales`);
      if (res.payments.inserted) parts.push(`${res.payments.inserted} payments`);
      if (res.expenses.inserted) parts.push(`${res.expenses.inserted} expenses`);
      const summary = parts.length > 0 ? `Saved — ${parts.join(', ')}.` : 'Nothing saved.';
      setStatus(summary);
      setPending(emptyBuckets());
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `${summary} Anything else?`,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 xl:h-[calc(100vh-9rem)]">
      <div className="xl:col-span-3 card flex flex-col h-full min-h-[420px]">
        <div className="px-5 py-3 border-b border-neutral-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-title">Import assistant</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                AI auto-classifies into products · sales
                {showPayments ? ' · payments' : ''}
                {showExpenses ? ' · expenses' : ''}.
              </div>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="text-[11px] text-neutral-500 hover:text-neutral-900"
            >
              Reset
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 text-sm whitespace-pre-wrap border ${
                  m.role === 'user'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-900 border-neutral-200'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-500">
                <span className="inline-block animate-pulse">classifying…</span>
              </div>
            </div>
          )}
          {error && (
            <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200">
          <AttachmentChips
            attached={attached}
            onRemove={(n) => setAttached(attached.filter((f) => f.name !== n))}
          />
          <form onSubmit={onSubmit} className="p-3 flex gap-2">
            <FileAttach attached={attached} onChange={setAttached} disabled={sending} onError={setError} />
            <input
              className="input flex-1"
              placeholder="Paste, describe, or attach — AI figures out what it is"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={sending || (!input.trim() && attached.length === 0)}
            >
              Send
            </button>
          </form>
        </div>
      </div>

      <div className="xl:col-span-2 card flex flex-col h-full min-h-[420px]">
        <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <div className="section-title">Ready to save</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              Products upsert by SKU. Sales require known SKUs.
            </div>
          </div>
          <span className="chip">{total}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {total === 0 ? (
            <div className="p-5 text-sm text-neutral-500">
              Classified records will appear here, grouped by kind, once the assistant identifies them.
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {counts.products > 0 && (
                <BucketSection title="Products" count={counts.products}>
                  <ProductsTable
                    rows={pending.products}
                    currency={currency}
                    onRemove={(i) => removeFrom('products', i)}
                  />
                </BucketSection>
              )}
              {counts.sales > 0 && (
                <BucketSection title="Sales" count={counts.sales}>
                  <SalesTable rows={pending.sales} onRemove={(i) => removeFrom('sales', i)} />
                </BucketSection>
              )}
              {counts.payments > 0 && (
                <BucketSection title="Payments" count={counts.payments}>
                  <PaymentsTable
                    rows={pending.payments}
                    currency={currency}
                    onRemove={(i) => removeFrom('payments', i)}
                  />
                </BucketSection>
              )}
              {counts.expenses > 0 && (
                <BucketSection title="Expenses" count={counts.expenses}>
                  <ExpensesTable
                    rows={pending.expenses}
                    currency={currency}
                    onRemove={(i) => removeFrom('expenses', i)}
                  />
                </BucketSection>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 p-3 flex items-center justify-between gap-3">
          {status ? (
            <span className="text-xs text-green-700">{status}</span>
          ) : (
            <span className="text-xs text-neutral-500">
              {total > 0 ? `${total} queued across buckets` : 'Nothing to save yet'}
            </span>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={apply}
            disabled={applying || total === 0}
          >
            {applying ? 'Saving…' : `Save ${total || ''}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeBuckets(existing: Buckets, incoming: Buckets): Buckets {
  // Dedupe products by SKU (last write wins); append for other kinds
  const prodMap = new Map<string, ImportProduct>();
  for (const p of existing.products) prodMap.set(p.sku, p);
  for (const p of incoming.products) prodMap.set(p.sku, p);
  return {
    products: Array.from(prodMap.values()),
    sales: [...existing.sales, ...incoming.sales],
    payments: [...existing.payments, ...incoming.payments],
    expenses: [...existing.expenses, ...incoming.expenses],
  };
}

function BucketSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-600">
          {title}
        </span>
        <span className="chip">{count}</span>
      </div>
      {children}
    </div>
  );
}

function ProductsTable({
  rows,
  currency,
  onRemove,
}: {
  rows: ImportProduct[];
  currency: string;
  onRemove: (idx: number) => void;
}): JSX.Element {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-neutral-500 text-[10px] uppercase tracking-wider border-b border-neutral-200">
          <th className="px-4 py-2 font-medium">Name / SKU</th>
          <th className="py-2 font-medium text-right">Stock</th>
          <th className="py-2 font-medium text-right">Cost</th>
          <th className="py-2 font-medium text-right">Price</th>
          <th className="px-3 py-2 font-medium"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {rows.map((p, i) => (
          <tr key={`${p.sku}-${i}`} className="align-top">
            <td className="px-4 py-2">
              <div className="font-medium text-neutral-900 truncate max-w-[180px]">{p.name}</div>
              <div className="text-[10px] text-neutral-500">
                {p.sku} · {p.category}
              </div>
            </td>
            <td className="py-2 text-right tabular-nums">{p.currentStock}</td>
            <td className="py-2 text-right tabular-nums text-neutral-600">
              {formatMoney(p.costPrice, currency)}
            </td>
            <td className="py-2 text-right tabular-nums font-semibold">
              {formatMoney(p.unitPrice, currency)}
            </td>
            <td className="px-3 py-2 text-right">
              <RemoveBtn onClick={() => onRemove(i)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SalesTable({
  rows,
  onRemove,
}: {
  rows: ImportSale[];
  onRemove: (idx: number) => void;
}): JSX.Element {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-neutral-500 text-[10px] uppercase tracking-wider border-b border-neutral-200">
          <th className="px-4 py-2 font-medium">Items</th>
          <th className="py-2 font-medium">Method</th>
          <th className="py-2 font-medium">When</th>
          <th className="px-3 py-2 font-medium"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {rows.map((s, i) => (
          <tr key={i} className="align-top">
            <td className="px-4 py-2">
              {s.items.map((it, j) => (
                <div key={j} className="text-neutral-800">
                  {it.quantity}× <span className="font-mono text-[10px]">{it.sku}</span>
                </div>
              ))}
            </td>
            <td className="py-2 text-neutral-700">{s.paymentMethod}</td>
            <td className="py-2 text-neutral-500 text-[10px]">
              {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'now'}
            </td>
            <td className="px-3 py-2 text-right">
              <RemoveBtn onClick={() => onRemove(i)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PaymentsTable({
  rows,
  currency,
  onRemove,
}: {
  rows: ImportPayment[];
  currency: string;
  onRemove: (idx: number) => void;
}): JSX.Element {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-neutral-500 text-[10px] uppercase tracking-wider border-b border-neutral-200">
          <th className="px-4 py-2 font-medium">Amount</th>
          <th className="py-2 font-medium">Method</th>
          <th className="py-2 font-medium">Reference</th>
          <th className="py-2 font-medium">When</th>
          <th className="px-3 py-2 font-medium"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {rows.map((p, i) => (
          <tr key={i} className="align-top">
            <td className="px-4 py-2 tabular-nums font-semibold">
              {formatMoney(p.amount, currency)}
            </td>
            <td className="py-2 text-neutral-700">{p.method}</td>
            <td className="py-2 text-neutral-500 truncate max-w-[180px]">{p.reference || '—'}</td>
            <td className="py-2 text-neutral-500 text-[10px]">
              {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'now'}
            </td>
            <td className="px-3 py-2 text-right">
              <RemoveBtn onClick={() => onRemove(i)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExpensesTable({
  rows,
  currency,
  onRemove,
}: {
  rows: ImportExpense[];
  currency: string;
  onRemove: (idx: number) => void;
}): JSX.Element {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-neutral-500 text-[10px] uppercase tracking-wider border-b border-neutral-200">
          <th className="px-4 py-2 font-medium">Amount</th>
          <th className="py-2 font-medium">Category</th>
          <th className="py-2 font-medium">Description</th>
          <th className="py-2 font-medium">When</th>
          <th className="px-3 py-2 font-medium"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {rows.map((e, i) => (
          <tr key={i} className="align-top">
            <td className="px-4 py-2 tabular-nums font-semibold">
              {formatMoney(e.amount, currency)}
            </td>
            <td className="py-2 text-neutral-700">{e.category}</td>
            <td className="py-2 text-neutral-500 truncate max-w-[180px]">{e.description || '—'}</td>
            <td className="py-2 text-neutral-500 text-[10px]">
              {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : 'now'}
            </td>
            <td className="px-3 py-2 text-right">
              <RemoveBtn onClick={() => onRemove(i)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-neutral-400 hover:text-red-600 text-xs"
      aria-label="Remove"
    >
      ×
    </button>
  );
}
