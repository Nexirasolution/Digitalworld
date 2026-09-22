'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';

export default function SellerSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/seller/settings');
      if (res.status === 401) {
        router.push('/seller/login');
        return;
      }
      const data = await res.json();
      setForm(data.admin);
    })();
  }, [router]);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const body = {
      name: form.name,
      businessName: form.businessName,
      businessPhone: form.businessPhone,
      businessAddress: form.businessAddress,
      gstNumber: form.gstNumber,
    };
    if (passwords.newPassword) {
      body.currentPassword = passwords.currentPassword;
      body.newPassword = passwords.newPassword;
    }

    const res = await fetch('/api/seller/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Failed to save.');
      return;
    }
    setMessage('Saved.');
    setPasswords({ currentPassword: '', newPassword: '' });
  }

  if (!form) return <div className="min-h-screen flex items-center justify-center" style={{ color: INK_SOFT }}>Loading...</div>;

  return (
    <div className="max-w-lg mx-auto px-6 py-10" style={{ background: PAPER }}>
      <h1 className="text-[18px] tracking-[1.5px] uppercase mb-6" style={{ color: INK }}>Settings</h1>

      <form onSubmit={onSave} className="flex flex-col gap-4">
        {[
          ['name', 'Your Name'],
          ['businessName', 'Business Name'],
          ['businessPhone', 'Business Phone'],
          ['businessAddress', 'Business Address'],
          ['gstNumber', 'GST Number'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="block text-[11px] tracking-[1.5px] uppercase mb-1.5" style={{ color: INK_SOFT }}>
              {label}
            </label>
            <input
              value={form[key] || ''}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={{ border: `1px solid ${LINE}`, color: INK }}
            />
          </div>
        ))}

        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
          <div className="text-[12px] tracking-[1.5px] uppercase mb-3" style={{ color: INK_SOFT }}>
            Change Password (optional)
          </div>
          <input
            type="password"
            placeholder="Current password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
            className="w-full px-3 py-2.5 text-sm outline-none mb-3"
            style={{ border: `1px solid ${LINE}`, color: INK }}
          />
          <input
            type="password"
            placeholder="New password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            className="w-full px-3 py-2.5 text-sm outline-none"
            style={{ border: `1px solid ${LINE}`, color: INK }}
          />
        </div>

        {error && <div className="text-[13px]" style={{ color: '#B3261E' }}>{error}</div>}
        {message && <div className="text-[13px]" style={{ color: '#1B8A3E' }}>{message}</div>}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 py-3 text-[13px] tracking-[1.5px] uppercase"
          style={{ background: INK, color: PAPER, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}