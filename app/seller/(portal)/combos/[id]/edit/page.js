'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ComboForm from '@/components/seller/ComboForm';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const RED = '#B3261E';
const PAPER = '#FFFFFF';

export default function EditSellerComboPage({ params }) {
  const router = useRouter();
  const [combo, setCombo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/seller/combos/${params.id}`);
        if (res.status === 401) {
          router.push('/seller/login');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) setError(data.error || 'Failed to load combo.');
        else setCombo(data.combo);
      } catch {
        if (alive) setError('Failed to load combo. Check your connection and try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [params.id, router]);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-6 py-10" style={{ color: INK_SOFT }}>Loading...</div>;
  }

  if (error || !combo) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="px-4 py-3 text-[13px]" role="alert" style={{ background: '#FCE8E6', color: RED }}>
          {error || 'Combo not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10" style={{ background: PAPER }}>
      <h1 className="text-[18px] tracking-[1.5px] uppercase mb-6" style={{ color: INK }}>Edit Combo</h1>
      <ComboForm comboId={params.id} initialCombo={combo} />
    </div>
  );
}