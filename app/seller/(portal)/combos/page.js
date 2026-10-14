'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';
const RED = '#B3261E';
const PER_PAGE = 20;

function summary(c) {
  if (c.type === 'color-pack') {
    const packs = (c.packOptions || []).map((p) => `${p.size}pc ₹${p.price}`).join(', ');
    return `${c.colors?.length || 0} colours · ${packs || 'no packs'}`;
  }
  const units = (c.products || []).reduce((s, l) => s + (l.qty || 1), 0);
  return `${c.products?.length || 0} products (${units} items) · ₹${c.comboPrice}`;
}

function stockCell(c) {
  const s = c.stockInfo;
  if (!s) return { text: '—', color: INK_SOFT };
  if (!s.inStock) return { text: 'Out of stock', color: RED };
  if (s.available === null) return { text: 'In stock', color: INK };
  return { text: `${s.available} available`, color: s.available <= 3 ? RED : INK };
}

export default function SellerCombosPage() {
  const router = useRouter();
  const [combos, setCombos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p, q) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PER_PAGE) });
      if (q) params.set('search', q);
      const res = await fetch(`/api/seller/combos?${params}`);
      if (res.status === 401) {
        router.push('/seller/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load combos.');
      setCombos(data.combos || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(1, ''); }, [load]);

  function goTo(p, q = search) {
    setPage(p);
    load(p, q);
  }

  async function onDelete(id) {
    if (!confirm('Delete this combo? This cannot be undone.')) return;
    setError('');
    const res = await fetch(`/api/seller/combos/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || 'Failed to delete.');
    // stay on the page unless it just became empty
    goTo(combos.length === 1 && page > 1 ? page - 1 : page);
  }

  async function onToggle(c) {
    setError('');
    const res = await fetch(`/api/seller/combos/${c._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || 'Failed to update.');
    goTo(page);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10" style={{ background: PAPER }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[18px] tracking-[1.5px] uppercase" style={{ color: INK }}>My Combos</h1>
        <Link
          href="/seller/combos/new"
          className="text-[12px] tracking-[1.5px] uppercase px-4 py-2"
          style={{ background: INK, color: PAPER }}
        >
          Add Combo
        </Link>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); goTo(1, search); }} className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full max-w-sm px-3 py-2 text-sm outline-none"
          style={{ border: `1px solid ${LINE}`, color: INK }}
        />
      </form>

      {error && <div className="text-[13px] mb-4" role="alert" style={{ color: RED }}>{error}</div>}

      {loading ? (
        <div style={{ color: INK_SOFT }}>Loading...</div>
      ) : combos.length === 0 ? (
        <div style={{ color: INK_SOFT }}>{search ? 'No combos match your search.' : 'No combos yet.'}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                {['Name', 'Type', 'Details', 'Stock', 'Status'].map((h) => (
                  <th key={h} className="text-left py-2 pr-4" style={{ color: INK_SOFT }}>{h}</th>
                ))}
                <th className="text-right py-2" style={{ color: INK_SOFT }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((c) => {
                const stock = stockCell(c);
                return (
                  <tr key={c._id} style={{ borderBottom: `1px solid ${LINE}` }}>
                    <td className="py-2.5 pr-4" style={{ color: INK }}>{c.name}</td>
                    <td className="py-2.5 pr-4" style={{ color: INK_SOFT }}>{c.type === 'color-pack' ? 'Colour pack' : 'Bundle'}</td>
                    <td className="py-2.5 pr-4" style={{ color: INK_SOFT }}>{summary(c)}</td>
                    <td className="py-2.5 pr-4" style={{ color: stock.color }}>{stock.text}</td>
                    <td className="py-2.5 pr-4" style={{ color: c.isActive ? INK : RED }}>{c.isActive ? 'Active' : 'Hidden'}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <Link href={`/seller/combos/${c._id}/edit`} className="mr-4 underline" style={{ color: INK }}>Edit</Link>
                      <button onClick={() => onToggle(c)} className="mr-4 underline" style={{ color: INK }}>{c.isActive ? 'Hide' : 'Show'}</button>
                      <button onClick={() => onDelete(c._id)} style={{ color: RED }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > PER_PAGE && (
        <div className="mt-6 flex gap-2 text-[12px]" style={{ color: INK_SOFT }}>
          {Array.from({ length: Math.ceil(total / PER_PAGE) }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i + 1)}
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