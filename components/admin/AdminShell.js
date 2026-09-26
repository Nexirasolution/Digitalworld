'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ListTree, ShoppingCart, Boxes, Image as ImageIcon,
  Clapperboard, Star, Ticket, Layers, FileBarChart, Settings as SettingsIcon,
  Menu, X, LogOut, Users
} from 'lucide-react';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const GOLD_WASH = '#F6EFD9';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';

// Superadmin nav — full site control, under /admin/*
const ADMIN_NAV = [
  { href: '/admin',            label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/sellers',    label: 'Sellers',       icon: Users },
  { href: '/admin/products',   label: 'Products',      icon: Package },
  { href: '/admin/categories', label: 'Categories',    icon: ListTree },
  { href: '/admin/orders',     label: 'Orders',        icon: ShoppingCart },
  { href: '/admin/inventory',  label: 'Inventory',     icon: Boxes },
  { href: '/admin/combos',     label: 'Combo Offers',  icon: Layers },
  { href: '/admin/banners',    label: 'Banners',       icon: ImageIcon },
  // { href: '/admin/reels',      label: 'Shop by Reels', icon: Clapperboard },
  { href: '/admin/reviews',    label: 'Reviews',       icon: Star },
  // { href: '/admin/coupons',    label: 'Coupons',       icon: Ticket },
  // { href: '/admin/reports',    label: 'Sales Reports', icon: FileBarChart },
  { href: '/admin/settings',   label: 'Settings',      icon: SettingsIcon },
];

// Seller nav — scoped to their own business, under /seller/*
const SELLER_NAV = [
  { href: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/products',  label: 'My Products', icon: Package },
  { href: '/seller/orders',    label: 'My Orders',   icon: ShoppingCart },
  { href: '/seller/settings',  label: 'Settings',    icon: SettingsIcon },
];

export default function AdminShell({ admin, navSet = 'admin', children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const nav = navSet === 'seller' ? SELLER_NAV : ADMIN_NAV;
  const panelLabel = navSet === 'seller' ? 'Seller Panel' : 'Admin Panel';
  const homeHref = navSet === 'seller' ? '/seller/dashboard' : '/admin';

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/seller/login');
  }

  return (
    <div className="min-h-screen flex" style={{ background: PAPER }}>
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static z-50 inset-y-0 left-0 w-64 transform transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: PAPER, borderRight: `1px solid ${LINE}` }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex flex-col leading-tight">
            <Link href={homeHref} className="font-medium text-base" style={{ color: INK }}>
              J
            </Link>
            <span className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: INK_SOFT }}>
              {panelLabel}
            </span>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} style={{ color: INK_SOFT }}>
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100vh-65px)]">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== homeHref && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  borderRadius: '4px',
                  background: active ? INK : 'transparent',
                  color: active ? GOLD : INK_SOFT,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = GOLD_WASH;
                    e.currentTarget.style.color = INK;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = INK_SOFT;
                  }
                }}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}

          <div className="my-3" style={{ height: '1px', background: LINE }} />

          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium w-full transition-colors"
            style={{ borderRadius: '4px', color: INK_SOFT }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = GOLD_WASH;
              e.currentTarget.style.color = INK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = INK_SOFT;
            }}
          >
            <LogOut size={17} /> Logout
          </button>
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
          style={{ background: PAPER, borderBottom: `1px solid ${LINE}` }}
        >
          <button onClick={() => setOpen(true)} style={{ color: INK }}>
            <Menu size={22} />
          </button>
          <span className="font-medium text-base" style={{ color: INK }}>
            JR Fashion {navSet === 'seller' ? 'Seller' : 'Admin'}
          </span>
        </header>

        <main className="p-4 sm:p-6 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}