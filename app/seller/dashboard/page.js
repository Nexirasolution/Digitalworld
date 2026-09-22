'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';

export default function SellerDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const meRes = await fetch('/api/admin/me');
      if (!meRes.ok) {
        router.push('/seller/login');
        return;
      }
      const meData = await meRes.json();
      setMe(meData.admin);

      const statsRes = await fetch('/api/seller/stats');
      if (statsRes.ok) setStats(await statsRes.json());
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ color: INK_SOFT }}>Loading...</div>;
  }

  const isPending = me?.role === 'seller' && me?.status === 'pending';
  const isRejected = me?.role === 'seller' && me?.status === 'rejected';

  return (
    <div className="max-w-5xl mx-auto px-6 py-10" style={{ background: PAPER }}>
      <h1 className="text-[18px] tracking-[1.5px] uppercase mb-1" style={{ color: INK }}>
        Seller Dashboard
      </h1>
      <p className="text-[13px] mb-8" style={{ color: INK_SOFT }}>
        Welcome back{me?.name ? `, ${me.name}` : ''}.
      </p>

      {isPending && (
        <div className="mb-8 px-4 py-3 text-[13px]" style={{ background: '#FBF3D9', color: INK }}>
          Your seller account is pending approval. You can view this dashboard, but you won&apos;t
          be able to add products or manage orders until a superadmin approves your business.
        </div>
      )}
      {isRejected && (
        <div className="mb-8 px-4 py-3 text-[13px]" style={{ background: '#FCE8E6', color: INK }}>
          Your application was rejected{me?.rejectionReason ? `: ${me.rejectionReason}` : '.'}
          Contact support if you believe this is a mistake.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-10">
        <StatCard label="Products" value={stats?.totalProducts ?? '—'} />
        <StatCard label="Orders" value={stats?.totalOrders ?? '—'} />
        <StatCard label="Revenue" value={stats ? `₹${stats.revenue.toLocaleString('en-IN')}` : '—'} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <DashLink href="/seller/products" title="Manage Inventory" disabled={isPending || isRejected} />
        <DashLink href="/seller/orders" title="My Orders" disabled={isPending || isRejected} />
        <DashLink href="/seller/settings" title="Settings" disabled={false} />
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

function DashLink({ href, title, disabled }) {
  if (disabled) {
    return (
      <div className="p-5 text-[13px] tracking-wide uppercase" style={{ border: `1px solid ${LINE}`, color: '#B3B3B3' }}>
        {title}
        <div className="text-[11px] normal-case mt-1" style={{ color: '#B3B3B3' }}>Locked until approved</div>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="p-5 block text-[13px] tracking-wide uppercase transition-colors"
      style={{ border: `1px solid ${LINE}`, color: INK }}
    >
      {title}
      <div className="mt-2" style={{ width: '20px', height: '2px', background: GOLD }} />
    </Link>
  );
}