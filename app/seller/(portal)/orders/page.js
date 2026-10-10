'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';

const STATUS_OPTIONS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];

export default function SellerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  async function load(status = statusFilter) {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (status) params.set('status', status);
    const res = await fetch(`/api/seller/orders?${params}`);
    if (res.status === 401) {
      router.push('/seller/login');
      return;
    }
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function updateStatus(orderId, status) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Could not update order — it may include another seller\'s items.');
      return;
    }
    load();
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10" style={{ background: PAPER }}>
      <h1 className="text-[18px] tracking-[1.5px] uppercase mb-6" style={{ color: INK }}>My Orders</h1>

      <select
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value); load(e.target.value); }}
        className="mb-6 px-3 py-2 text-sm"
        style={{ border: `1px solid ${LINE}`, color: INK }}
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {loading ? (
        <div style={{ color: INK_SOFT }}>Loading...</div>
      ) : orders.length === 0 ? (
        <div style={{ color: INK_SOFT }}>No orders yet.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((o) => (
            <div key={o._id} className="p-4" style={{ border: `1px solid ${LINE}` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[13px]" style={{ color: INK }}>{o.orderNumber}</div>
                  <div className="text-[12px]" style={{ color: INK_SOFT }}>{o.customer?.name} — {o.customer?.phone}</div>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o._id, e.target.value)}
                  className="text-[12px] px-2 py-1"
                  style={{ border: `1px solid ${LINE}`, color: INK }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {o.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-[12px] py-1" style={{ color: INK_SOFT }}>
                  <span>{it.name} × {it.qty} {it.size ? `(${it.size})` : ''}</span>
                  <span>₹{(it.price || 0) * (it.qty || 0)}</span>
                </div>
              ))}

              {o.otherSellerItemsCount > 0 && (
                <div className="text-[11px] mt-2" style={{ color: INK_SOFT }}>
                  This order also contains {o.otherSellerItemsCount} item(s) from other sellers, not shown here.
                </div>
              )}

              <div className="flex justify-between mt-3 pt-3 text-[13px]" style={{ borderTop: `1px solid ${LINE}`, color: INK }}>
                <span>Your subtotal</span>
                <span>₹{o.mySubtotal}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}