'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [meRes, statsRes] = await Promise.all([
        fetch('/api/admin/me'),
        fetch('/api/admin/stats'),
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
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ color: INK_SOFT }}>Loading...</div>;
  }

  const pendingCount = stats?.sellers.pending ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10" style={{ background: PAPER }}>
      <h1 className="text-[18px] tracking-[1.5px] uppercase mb-8" style={{ color: INK }}>
        Superadmin Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-4 mb-10">
        <StatCard label="Pending Sellers" value={stats?.sellers.pending ?? '—'} highlight={pendingCount > 0} />
        <StatCard label="Approved Sellers" value={stats?.sellers.approved ?? '—'} />
        <StatCard label="Total Products" value={stats?.totalProducts ?? '—'} />
        <StatCard label="Total Orders" value={stats?.totalOrders ?? '—'} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <DashLink
          href="/admin/sellers"
          title="Manage Sellers"
          badge={pendingCount > 0 ? pendingCount : null}
        />
        <DashLink href="/seller/products" title="All Products" />
        <DashLink href="/seller/orders" title="All Orders" />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div
      className="p-5"
      style={{ border: highlight ? `1px solid ${GOLD}` : `1px solid ${LINE}` }}
    >
      <div className="text-[11px] tracking-[1.5px] uppercase mb-2" style={{ color: INK_SOFT }}>{label}</div>
      <div className="text-[22px]" style={{ color: INK }}>{value}</div>
    </div>
  );
}

function DashLink({ href, title, badge }) {
  return (
    <Link
      href={href}
      className="p-5 block text-[13px] tracking-wide uppercase transition-colors relative"
      style={{ border: `1px solid ${LINE}`, color: INK }}
    >
      <div className="flex items-center justify-between">
        {title}
        {badge != null && (
          <span
            className="text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
            style={{ background: GOLD, color: INK }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <div className="mt-2" style={{ width: '20px', height: '2px', background: GOLD }} />
    </Link>
  );
}