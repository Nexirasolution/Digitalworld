'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const [meRes, statsRes, sellersRes] = await Promise.all([
      fetch('/api/admin/me'),
      fetch('/api/admin/stats'),
      fetch('/api/admin/sellers?status=pending'),
    ]);

    if (!meRes.ok) {
      router.push('/seller/login');
      return;
    }
    const me = await meRes.json();
    if (me.admin.role !== 'superadmin') {
      router.push('/seller/dashboard');
      return;
    }

    if (statsRes.ok) setStats(await statsRes.json());
    if (sellersRes.ok) setPendingSellers((await sellersRes.json()).sellers);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  async function approve(id) {
    const res = await fetch(`/api/admin/sellers/${id}/approve`, { method: 'POST' });
    if (res.ok) loadAll();
  }

  async function reject(id) {
    const reason = prompt('Reason for rejection (optional):') || '';
    const res = await fetch(`/api/admin/sellers/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) loadAll();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ color: INK_SOFT }}>Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10" style={{ background: PAPER }}>
      <h1 className="text-[18px] tracking-[1.5px] uppercase mb-8" style={{ color: INK }}>
        Superadmin Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-4 mb-10">
        <StatCard label="Pending Sellers" value={stats?.sellers.pending ?? '—'} />
        <StatCard label="Approved Sellers" value={stats?.sellers.approved ?? '—'} />
        <StatCard label="Total Products" value={stats?.totalProducts ?? '—'} />
        <StatCard label="Total Orders" value={stats?.totalOrders ?? '—'} />
      </div>

      <h2 className="text-[14px] tracking-[1.5px] uppercase mb-4" style={{ color: INK }}>
        Pending Seller Approvals
      </h2>

      {pendingSellers.length === 0 ? (
        <div className="text-[13px]" style={{ color: INK_SOFT }}>No sellers awaiting approval.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {pendingSellers.map((s) => (
            <div key={s._id} className="p-4 flex items-center justify-between" style={{ border: `1px solid ${LINE}` }}>
              <div>
                <div className="text-[13px]" style={{ color: INK }}>{s.businessName || s.name}</div>
                <div className="text-[12px]" style={{ color: INK_SOFT }}>
                  {s.email} · {s.businessPhone || 'no phone given'}
                </div>
                {s.businessAddress && (
                  <div className="text-[12px]" style={{ color: INK_SOFT }}>{s.businessAddress}</div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approve(s._id)}
                  className="text-[12px] tracking-[1px] uppercase px-4 py-2"
                  style={{ background: INK, color: PAPER }}
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(s._id)}
                  className="text-[12px] tracking-[1px] uppercase px-4 py-2"
                  style={{ border: `1px solid ${LINE}`, color: '#B3261E' }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex gap-6 text-[13px]">
        <a href="/seller/products" className="underline" style={{ color: INK }}>All Products</a>
        <a href="/seller/orders" className="underline" style={{ color: INK }}>All Orders</a>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-5" style={{ border: `1px solid ${LINE}` }}>
      <div className="text-[11px] tracking-[1.5px] uppercase mb-2" style={{ color: INK_SOFT }}>{label}</div>
      <div className="text-[22px]" style={{ color: INK }}>{value}</div>
    </div>
  );
}