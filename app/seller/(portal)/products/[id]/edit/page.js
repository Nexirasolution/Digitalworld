'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/seller/ProductForm';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const RED = '#B3261E';
const PAPER = '#FFFFFF';

export default function EditSellerProductPage({ params }) {
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/seller/products/${params.id}`);
      if (res.status === 401) {
        router.push('/seller/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load product.');
        setLoading(false);
        return;
      }
      setProduct(data.product);
      setLoading(false);
    })();
  }, [params.id, router]);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-6 py-10" style={{ color: INK_SOFT }}>Loading...</div>;
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="px-4 py-3 text-[13px]" style={{ background: '#FCE8E6', color: RED }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10" style={{ background: PAPER }}>
      <h1 className="text-[18px] tracking-[1.5px] uppercase mb-6" style={{ color: INK }}>
        Edit Product
      </h1>
      <ProductForm productId={params.id} initialProduct={product} />
    </div>
  );
}