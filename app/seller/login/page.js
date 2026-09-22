'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';

export default function SellerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed.');
        setLoading(false);
        return;
      }

      const { role, status } = data.admin;

      if (role === 'superadmin') {
        router.push('/admin/dashboard');
        return;
      }

      if (status === 'pending') {
        setNotice('Your account is still pending approval. You can log in, but you cannot add products or manage orders yet.');
        setLoading(false);
        return;
      }

      // approved seller
      router.push('/seller/dashboard');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: PAPER }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-[15px] font-normal tracking-[2px] uppercase" style={{ color: INK }}>
            Seller Login
          </h1>
          <div className="mt-2 mx-auto" style={{ width: '32px', height: '2px', background: GOLD }} />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] tracking-[1.5px] uppercase mb-1.5" style={{ color: INK_SOFT }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={{ border: `1px solid ${LINE}`, color: INK }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-[1.5px] uppercase mb-1.5" style={{ color: INK_SOFT }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={{ border: `1px solid ${LINE}`, color: INK }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-[13px]" style={{ color: '#B3261E' }}>
              {error}
            </div>
          )}
          {notice && (
            <div className="text-[13px] px-3 py-2.5" style={{ color: INK, background: '#FBF3D9' }}>
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 text-[13px] font-normal tracking-[1.5px] uppercase transition-opacity"
            style={{ background: INK, color: PAPER, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center flex flex-col gap-1.5">
          <Link href="/seller/register" className="text-[12px]" style={{ color: INK_SOFT }}>
            New seller? Register here
          </Link>
          <Link href="/" className="text-[12px]" style={{ color: INK_SOFT }}>
            ← Back to store
          </Link>
        </div>
      </div>
    </div>
  );
}