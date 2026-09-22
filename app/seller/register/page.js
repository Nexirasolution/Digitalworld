'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';

const FIELDS = [
  { name: 'name', label: 'Your Name', type: 'text', required: false, placeholder: 'Full name' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
  { name: 'password', label: 'Password', type: 'password', required: true, placeholder: 'At least 6 characters' },
  { name: 'businessName', label: 'Business Name', type: 'text', required: true, placeholder: 'Your shop / brand name' },
  { name: 'businessPhone', label: 'Business Phone', type: 'tel', required: false, placeholder: '10-digit number' },
  { name: 'businessAddress', label: 'Business Address', type: 'text', required: false, placeholder: 'City, State' },
  { name: 'gstNumber', label: 'GST Number (optional)', type: 'text', required: false, placeholder: '' },
];

export default function SellerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: PAPER }}>
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4" style={{ width: '32px', height: '2px', background: GOLD }} />
          <h1 className="text-[15px] font-normal tracking-[1.5px] uppercase mb-3" style={{ color: INK }}>
            Application Submitted
          </h1>
          <p className="text-[13px] leading-relaxed mb-6" style={{ color: INK_SOFT }}>
            Thanks for registering. Your business will be reviewed by our team.
            You&apos;ll be able to log in and start adding products once your
            account is approved.
          </p>
          <Link
            href="/seller/login"
            className="inline-block py-3 px-6 text-[13px] tracking-[1.5px] uppercase"
            style={{ background: INK, color: PAPER }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: PAPER }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-[15px] font-normal tracking-[2px] uppercase" style={{ color: INK }}>
            Become a Seller
          </h1>
          <div className="mt-2 mx-auto" style={{ width: '32px', height: '2px', background: GOLD }} />
          <p className="mt-3 text-[12px]" style={{ color: INK_SOFT }}>
            Submit your business details for approval.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="block text-[11px] tracking-[1.5px] uppercase mb-1.5" style={{ color: INK_SOFT }}>
                {f.label}
              </label>
              <input
                type={f.type}
                required={f.required}
                value={form[f.name] || ''}
                onChange={(e) => update(f.name, e.target.value)}
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={{ border: `1px solid ${LINE}`, color: INK }}
                placeholder={f.placeholder}
              />
            </div>
          ))}

          {error && (
            <div className="text-[13px]" style={{ color: '#B3261E' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 text-[13px] font-normal tracking-[1.5px] uppercase transition-opacity"
            style={{ background: INK, color: PAPER, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>

        <div className="mt-6 text-center flex flex-col gap-1.5">
          <Link href="/seller/login" className="text-[12px]" style={{ color: INK_SOFT }}>
            Already registered? Log in
          </Link>
          <Link href="/" className="text-[12px]" style={{ color: INK_SOFT }}>
            ← Back to store
          </Link>
        </div>
      </div>
    </div>
  );
}