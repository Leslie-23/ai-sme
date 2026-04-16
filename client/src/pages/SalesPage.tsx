import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMoney } from '../lib/format';

interface Product {
  _id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
}

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Sale {
  _id: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
}

type Method = 'CASH' | 'MOMO' | 'CARD' | 'TRANSFER';

interface CartLine {
  productId: string;
  quantity: number;
}

export function SalesPage() {
  const { business } = useAuth();
  const currency = business?.currency || 'USD';
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<Method>('CASH');
  const [sales, setSales] = useState<Sale[]>([]);
  const [filter, setFilter] = useState<{ from?: string; to?: string; paymentMethod?: Method | '' }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const [ps, ss] = await Promise.all([
      api<Product[]>('/inventory'),
      api<Sale[]>('/sales', {
        query: {
          from: filter.from ? new Date(filter.from).toISOString() : undefined,
          to: filter.to ? new Date(filter.to).toISOString() : undefined,
          paymentMethod: filter.paymentMethod || undefined,
          limit: '50',
        },
      }),
    ]);
    setProducts(ps);
    setSales(ss);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [filter.from, filter.to, filter.paymentMethod]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 12);
  }, [products, search]);

  const productMap = useMemo(() => new Map(products.map((p) => [p._id, p])), [products]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, line) => {
      const p = productMap.get(line.productId);
      return sum + (p ? p.unitPrice * line.quantity : 0);
    }, 0);
  }, [cart, productMap]);

  function addToCart(productId: string) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) return prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { productId, quantity: 1 }];
    });
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) setCart((prev) => prev.filter((l) => l.productId !== productId));
    else setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l)));
  }

  async function submitSale(e: FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      await api('/sales', {
        method: 'POST',
        body: { items: cart, paymentMethod: method },
      });
      setCart([]);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-slate-800 mb-3">New sale</h2>
          <input
            className="input mb-3"
            placeholder="Search products by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {filteredProducts.map((p) => (
              <button
                key={p._id}
                className="rounded-md border border-slate-200 bg-slate-50 hover:bg-white p-3 text-left"
                onClick={() => addToCart(p._id)}
                disabled={p.currentStock <= 0}
              >
                <div className="text-sm font-medium text-slate-800 truncate">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {formatMoney(p.unitPrice, currency)} · stock {p.currentStock}
                </div>
              </button>
            ))}
          </div>
          <form onSubmit={submitSale} className="space-y-3">
            {cart.length === 0 ? (
              <p className="text-sm text-slate-500">Add products to start a sale.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((line) => {
                  const p = productMap.get(line.productId)!;
                  return (
                    <div key={line.productId} className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-slate-500">{formatMoney(p.unitPrice, currency)}</div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        className="input w-20"
                        value={line.quantity}
                        onChange={(e) => updateQty(line.productId, parseInt(e.target.value || '0', 10))}
                      />
                      <div className="w-24 text-right text-sm font-medium">
                        {formatMoney(p.unitPrice * line.quantity, currency)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <select
                className="input w-40"
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
              >
                <option value="CASH">Cash</option>
                <option value="MOMO">Mobile money</option>
                <option value="CARD">Card</option>
                <option value="TRANSFER">Transfer</option>
              </select>
              <div className="text-lg font-bold">{formatMoney(cartTotal, currency)}</div>
              <button type="submit" className="btn-primary" disabled={submitting || cart.length === 0}>
                {submitting ? 'Saving…' : 'Record sale'}
              </button>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </form>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-3">Filters</h2>
          <div className="space-y-3">
            <div>
              <label className="label">From</label>
              <input
                type="date"
                className="input mt-1"
                value={filter.from || ''}
                onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value || undefined }))}
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                className="input mt-1"
                value={filter.to || ''}
                onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value || undefined }))}
              />
            </div>
            <div>
              <label className="label">Payment method</label>
              <select
                className="input mt-1"
                value={filter.paymentMethod || ''}
                onChange={(e) =>
                  setFilter((f) => ({ ...f, paymentMethod: (e.target.value as Method) || '' }))
                }
              >
                <option value="">All</option>
                <option value="CASH">Cash</option>
                <option value="MOMO">Mobile money</option>
                <option value="CARD">Card</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-3">Sales history</h2>
        {sales.length === 0 ? (
          <p className="text-sm text-slate-500">No sales for the selected filters.</p>
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
                    {s.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                  </td>
                  <td>
                    <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">
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
    </div>
  );
}
