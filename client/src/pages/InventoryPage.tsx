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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={onCreate} className="card space-y-3">
          <h2 className="font-semibold text-slate-800">Add product</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Name</label>
              <input className="input mt-1" value={newProduct.name} required onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
            </div>
            <div>
              <label className="label">SKU</label>
              <input className="input mt-1" value={newProduct.sku} required onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input mt-1" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
            </div>
            <div>
              <label className="label">Unit price</label>
              <input type="number" step="0.01" min="0" className="input mt-1" value={newProduct.unitPrice} required onChange={(e) => setNewProduct({ ...newProduct, unitPrice: e.target.value })} />
            </div>
            <div>
              <label className="label">Cost price</label>
              <input type="number" step="0.01" min="0" className="input mt-1" value={newProduct.costPrice} onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })} />
            </div>
            <div>
              <label className="label">Initial stock</label>
              <input type="number" min="0" className="input mt-1" value={newProduct.currentStock} onChange={(e) => setNewProduct({ ...newProduct, currentStock: e.target.value })} />
            </div>
          </div>
          <button className="btn-primary">Add product</button>
        </form>

        <form onSubmit={onAdjust} className="card space-y-3">
          <h2 className="font-semibold text-slate-800">Restock / adjust stock</h2>
          <div>
            <label className="label">Product</label>
            <select className="input mt-1" value={adjust.productId} required onChange={(e) => setAdjust({ ...adjust, productId: e.target.value })}>
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
              <input type="number" className="input mt-1" value={adjust.quantityDelta} required onChange={(e) => setAdjust({ ...adjust, quantityDelta: e.target.value })} />
              <p className="text-xs text-slate-500 mt-1">Positive to add, negative to remove.</p>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input mt-1" value={adjust.type} onChange={(e) => setAdjust({ ...adjust, type: e.target.value as 'RESTOCK' | 'ADJUSTMENT' })}>
                <option value="RESTOCK">Restock</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Note</label>
            <input className="input mt-1" value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} />
          </div>
          <button className="btn-primary">Apply</button>
        </form>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-3">Products</h2>
        {products.length === 0 ? (
          <p className="text-sm text-slate-500">No products yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 text-xs uppercase">
              <tr>
                <th className="py-2">Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th className="text-right">Price</th>
                <th className="text-right">Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p._id}>
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="text-slate-600">{p.sku}</td>
                  <td className="text-slate-600">{p.category}</td>
                  <td className="text-right">{formatMoney(p.unitPrice, currency)}</td>
                  <td className={`text-right font-medium ${p.currentStock < p.lowStockThreshold ? 'text-amber-600' : ''}`}>
                    {p.currentStock}
                  </td>
                  <td className="text-right">
                    <button className="text-xs text-red-600 hover:underline" onClick={() => onDelete(p._id)}>
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
  );
}
