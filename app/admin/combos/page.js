'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Pencil, Eye, EyeOff } from 'lucide-react';
import ComboForm from '@/components/combo/ComboForm';

function stockLabel(c) {
  const s = c.stockInfo;
  if (!s) return null;
  if (!s.inStock) return { text: 'Out of stock', bad: true };
  if (s.available === null) return { text: 'In stock', bad: false };
  return { text: `${s.available} available`, bad: s.available <= 3 };
}

export default function AdminCombosPage() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // combo being edited, or null for "new"

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/combos?all=true');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load combos');
      setCombos(data.combos || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setShowForm(true); }
  function openEdit(combo) { setEditing(combo); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function closeForm() { setShowForm(false); setEditing(null); }

  function onSaved() {
    toast.success(editing ? 'Combo updated' : 'Combo created');
    closeForm();
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this combo? This cannot be undone.')) return;
    const res = await fetch(`/api/combos/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || 'Failed to delete');
    toast.success('Combo deleted');
    load();
  }

  async function toggleActive(c) {
    const res = await fetch(`/api/combos/${c._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || 'Failed to update');
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-bold text-brand-magenta">Combo Offers</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1 text-sm">
          <Plus size={16} /> Add Combo
        </button>
      </div>

      {showForm && (
        <div className="card-soft p-5 mb-6">
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold">{editing ? 'Edit Combo' : 'New Combo'}</h2>
            <button type="button" onClick={closeForm} aria-label="Close"><X size={18} /></button>
          </div>
          <ComboForm
            key={editing?._id || 'new'}
            mode="admin"
            comboId={editing?._id}
            initialCombo={editing}
            onSaved={onSaved}
            onCancel={closeForm}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : combos.length === 0 ? (
        <p className="text-sm text-neutral-500">No combos yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map((c) => {
            const isPack = c.type === 'color-pack';
            const priceLabel = isPack
              ? c.packOptions?.length ? `From ₹${Math.min(...c.packOptions.map((p) => p.price))}` : '—'
              : `₹${c.comboPrice}`;
            const cover = c.images?.[0] || c.image;
            const stock = stockLabel(c);
            return (
              <div key={c._id} className="card-soft overflow-hidden" style={{ opacity: c.isActive ? 1 : 0.6 }}>
                <div className="h-32 bg-brand-cream">
                  {cover && <img src={cover} alt={c.name} className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{c.name}</p>
                    {isPack && <span className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-full">Color Pack</span>}
                    {!c.isActive && <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full">Hidden</span>}
                  </div>
                  <p className="text-brand-magenta font-semibold text-sm">{priceLabel}</p>
                  {stock && (
                    <p className={`text-xs mt-0.5 ${stock.bad ? 'text-red-600' : 'text-neutral-500'}`}>{stock.text}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => openEdit(c)} className="text-brand-ink/60 hover:text-brand-magenta" title="Edit"><Pencil size={16} /></button>
                    <button onClick={() => toggleActive(c)} className="text-brand-ink/60 hover:text-brand-magenta" title={c.isActive ? 'Hide' : 'Show'}>
                      {c.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => remove(c._id)} className="text-brand-magenta" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}