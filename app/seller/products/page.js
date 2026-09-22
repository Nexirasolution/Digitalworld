'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';

export default function SellerProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(p = page, q = search) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (q) params.set('search', q);
    const res = await fetch(`/api/seller/products?${params}`);
    if (res.status === 401) {
      router.push('/seller/login');
      return;
    }
    const data = await res.json();
    setProducts(data.products || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  useEffect(() => { load(1, ''); }, []); // eslint-disable-line

  async function onDelete(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to delete.');
      return;
    }
    load(page, search);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10" style={{ background: PAPER }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[18px] tracking-[1.5px] uppercase" style={{ color: INK }}>My Products</h1>
        
         <a href="/seller/products/new"
          className="text-[12px] tracking-[1.5px] uppercase px-4 py-2"
          style={{ background: INK, color: PAPER }}
        >
          Add Product
        </a>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); setPage(1); load(1, search); }}
        className="mb-6"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full max-w-sm px-3 py-2 text-sm outline-none"
          style={{ border: `1px solid ${LINE}`, color: INK }}
        />
      </form>

      {error && <div className="text-[13px] mb-4" style={{ color: '#B3261E' }}>{error}</div>}

      {loading ? (
        <div style={{ color: INK_SOFT }}>Loading...</div>
      ) : products.length === 0 ? (
        <div style={{ color: INK_SOFT }}>No products yet.</div>
      ) : (
        <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${LINE}` }}>
              <th className="text-left py-2" style={{ color: INK_SOFT }}>Name</th>
              <th className="text-left py-2" style={{ color: INK_SOFT }}>SKU</th>
              <th className="text-left py-2" style={{ color: INK_SOFT }}>Category</th>
              <th className="text-left py-2" style={{ color: INK_SOFT }}>Price</th>
              <th className="text-left py-2" style={{ color: INK_SOFT }}>Stock</th>
              <th className="text-right py-2" style={{ color: INK_SOFT }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = (p.variants || []).reduce(
                (sum, v) => sum + (v.sizes || []).reduce((s, sz) => s + (sz.stock || 0), 0),
                0
              );
              return (
                <tr key={p._id} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td className="py-2.5" style={{ color: INK }}>{p.name}</td>
                  <td className="py-2.5" style={{ color: INK_SOFT }}>{p.sku}</td>
                  <td className="py-2.5" style={{ color: INK_SOFT }}>{p.category?.name || '—'}</td>
                  <td className="py-2.5" style={{ color: INK }}>₹{p.basePrice}</td>
                  <td className="py-2.5" style={{ color: stock === 0 ? '#B3261E' : INK }}>{stock}</td>
                  <td className="py-2.5 text-right">
                    <a href={`/seller/products/${p._id}/edit`} className="mr-4 underline" style={{ color: INK }}>
                      Edit
                    </a>
                    <button onClick={() => onDelete(p._id)} style={{ color: '#B3261E' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {total > 20 && (
        <div className="mt-6 flex gap-2 text-[12px]" style={{ color: INK_SOFT }}>
          {Array.from({ length: Math.ceil(total / 20) }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setPage(i + 1); load(i + 1, search); }}
              style={{ color: page === i + 1 ? INK : INK_SOFT, textDecoration: page === i + 1 ? 'underline' : 'none' }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}