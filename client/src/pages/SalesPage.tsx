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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card">
          <div className="px-5 py-3 border-b border-neutral-200 section-title">New sale</div>
          <div className="p-5 space-y-4">
            <input
              className="input"
              placeholder="Search products by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredProducts.map((p) => (
                <button
                  key={p._id}
                  className="border border-neutral-200 bg-white hover:border-neutral-900 p-3 text-left transition-colors disabled:opacity-40"
                  onClick={() => addToCart(p._id)}
                  disabled={p.currentStock <= 0}
                >
                  <div className="text-sm font-medium text-neutral-900 truncate">{p.name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {formatMoney(p.unitPrice, currency)} · stock {p.currentStock}
                  </div>
                </button>
              ))}
            </div>

            <form onSubmit={submitSale} className="space-y-3 pt-3 border-t border-neutral-200">
              {cart.length === 0 ? (
                <p className="text-sm text-neutral-500">Add products to start a sale.</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((line) => {
                    const p = productMap.get(line.productId)!;
                    return (
                      <div key={line.productId} className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-xs text-neutral-500">{formatMoney(p.unitPrice, currency)}</div>
                        </div>
                        <input
                          type="number"
                          min={0}
                          className="input w-20"
                          value={line.quantity}
                          onChange={(e) => updateQty(line.productId, parseInt(e.target.value || '0', 10))}
                        />
                        <div className="w-28 text-right text-sm font-semibold tabular-nums">
                          {formatMoney(p.unitPrice * line.quantity, currency)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-neutral-200">
                <select
                  className="input sm:w-40"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as Method)}
                >
                  <option value="CASH">Cash</option>
                  <option value="MOMO">Mobile money</option>
                  <option value="CARD">Card</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
                <div className="text-xl font-semibold tabular-nums">
                  {formatMoney(cartTotal, currency)}
                </div>
                <button
                  type="submit"
                  className="btn-primary w-full sm:w-auto"
                  disabled={submitting || cart.length === 0}
                >
                  {submitting ? 'Saving…' : 'Record sale'}
                </button>
              </div>
              {error && (
                <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-3 border-b border-neutral-200 section-title">Filters</div>
          <div className="p-5 space-y-4">
            <div>
              <label className="label">From</label>
              <input
                type="date"
                className="input mt-1.5"
                value={filter.from || ''}
                onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value || undefined }))}
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                className="input mt-1.5"
                value={filter.to || ''}
                onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value || undefined }))}
              />
            </div>
            <div>
              <label className="label">Payment method</label>
              <select
                className="input mt-1.5"
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
        <div className="px-5 py-3 border-b border-neutral-200 section-title">Sales history</div>
        <div className="overflow-x-auto">
          {sales.length === 0 ? (
            <p className="text-sm text-neutral-500 p-5">No sales for the selected filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 text-[11px] uppercase tracking-wider border-b border-neutral-200">
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="py-2.5 font-medium">Items</th>
                  <th className="py-2.5 font-medium">Method</th>
                  <th className="px-5 py-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sales.map((s) => (
                  <tr key={s._id} className="hover:bg-neutral-50">
                    <td className="px-5 py-2.5 text-neutral-600 whitespace-nowrap">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="py-2.5 text-neutral-800 max-w-lg truncate">
                      {s.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                    </td>
                    <td className="py-2.5">
                      <span className="chip">{s.paymentMethod}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums">
                      {formatMoney(s.totalAmount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
