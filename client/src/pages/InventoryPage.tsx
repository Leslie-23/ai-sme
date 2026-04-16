import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  currentStock: number;
  lowStockThreshold: number;
}

export function InventoryPage() {
  const { business } = useAuth();
  const currency = business?.currency || 'USD';
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: '',
    costPrice: '',
    currentStock: '',
  });
  const [adjust, setAdjust] = useState<{
    productId: string;
    quantityDelta: string;
    type: 'RESTOCK' | 'ADJUSTMENT';
    note: string;
  }>({ productId: '', quantityDelta: '', type: 'RESTOCK', note: '' });

  async function refresh() {
    const list = await api<Product[]>('/inventory');
    setProducts(list);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api('/products', {
        method: 'POST',
        body: {
          name: newProduct.name,
          sku: newProduct.sku,
          category: newProduct.category || undefined,
          unitPrice: parseFloat(newProduct.unitPrice),
          costPrice: newProduct.costPrice ? parseFloat(newProduct.costPrice) : 0,
          currentStock: newProduct.currentStock ? parseInt(newProduct.currentStock, 10) : 0,
        },
      });
      setNewProduct({ name: '', sku: '', category: '', unitPrice: '', costPrice: '', currentStock: '' });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create product');
    }
  }

  async function onAdjust(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api('/inventory/adjust', {
        method: 'POST',
        body: {
          productId: adjust.productId,
          quantityDelta: parseInt(adjust.quantityDelta, 10),
          type: adjust.type,
          note: adjust.note || undefined,
        },
      });
      setAdjust({ productId: '', quantityDelta: '', type: 'RESTOCK', note: '' });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to adjust stock');
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this product?')) return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={onCreate} className="card">
          <div className="px-5 py-3 border-b border-neutral-200 section-title">Add product</div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Name</label>
                <input className="input mt-1.5" value={newProduct.name} required onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
              </div>
              <div>
                <label className="label">SKU</label>
                <input className="input mt-1.5" value={newProduct.sku} required onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} />
              </div>
              <div>
                <label className="label">Category</label>
                <input className="input mt-1.5" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
              </div>
              <div>
                <label className="label">Unit price</label>
                <input type="number" step="0.01" min="0" className="input mt-1.5" value={newProduct.unitPrice} required onChange={(e) => setNewProduct({ ...newProduct, unitPrice: e.target.value })} />
              </div>
              <div>
                <label className="label">Cost price</label>
                <input type="number" step="0.01" min="0" className="input mt-1.5" value={newProduct.costPrice} onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Initial stock</label>
                <input type="number" min="0" className="input mt-1.5" value={newProduct.currentStock} onChange={(e) => setNewProduct({ ...newProduct, currentStock: e.target.value })} />
              </div>
            </div>
            <button className="btn-primary w-full">Add product</button>
          </div>
        </form>

        <form onSubmit={onAdjust} className="card">
          <div className="px-5 py-3 border-b border-neutral-200 section-title">Restock / adjust stock</div>
          <div className="p-5 space-y-4">
            <div>
              <label className="label">Product</label>
              <select className="input mt-1.5" value={adjust.productId} required onChange={(e) => setAdjust({ ...adjust, productId: e.target.value })}>
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku}) — stock {p.currentStock}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Quantity delta</label>
                <input type="number" className="input mt-1.5" value={adjust.quantityDelta} required onChange={(e) => setAdjust({ ...adjust, quantityDelta: e.target.value })} />
                <p className="text-xs text-neutral-500 mt-1.5">Positive to add, negative to remove.</p>
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input mt-1.5" value={adjust.type} onChange={(e) => setAdjust({ ...adjust, type: e.target.value as 'RESTOCK' | 'ADJUSTMENT' })}>
                  <option value="RESTOCK">Restock</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Note</label>
              <input className="input mt-1.5" value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} />
            </div>
            <button className="btn-primary w-full">Apply</button>
          </div>
        </form>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <div className="card">
        <div className="px-5 py-3 border-b border-neutral-200 section-title">Products</div>
        <div className="overflow-x-auto">
          {products.length === 0 ? (
            <p className="text-sm text-neutral-500 p-5">No products yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 text-[11px] uppercase tracking-wider border-b border-neutral-200">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="py-2.5 font-medium">SKU</th>
                  <th className="py-2.5 font-medium">Category</th>
                  <th className="py-2.5 font-medium text-right">Price</th>
                  <th className="py-2.5 font-medium text-right">Stock</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-neutral-50">
                    <td className="px-5 py-2.5 font-medium">{p.name}</td>
                    <td className="py-2.5 text-neutral-600">{p.sku}</td>
                    <td className="py-2.5 text-neutral-600">{p.category}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatMoney(p.unitPrice, currency)}</td>
                    <td
                      className={`py-2.5 text-right font-semibold tabular-nums ${
                        p.currentStock < p.lowStockThreshold ? 'text-amber-700' : ''
                      }`}
                    >
                      {p.currentStock}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        className="text-xs text-neutral-500 hover:text-red-600 underline underline-offset-4"
                        onClick={() => onDelete(p._id)}
                      >
                        Delete
                      </button>
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
