export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Combo from '@/models/Combo';
import { requireAdmin } from '@/lib/apiAuth';
import { buildComboData, createCombo } from '@/lib/comboValidation';
import { withStockInfo } from '@/lib/comboStock';

const withProducts = (q) =>
  q
    .populate('products.product', 'name slug variants isActive')
    .populate('baseProduct', 'name slug variants isActive')
    .lean();

// Everything (including hidden combos) — admin only. Sellers get their own via /api/seller/combos.
const adminList = requireAdmin(async (req, ctx, admin) => {
  await dbConnect();
  const query = admin.role === 'superadmin' ? {} : { seller: admin.id };
  const combos = await withProducts(Combo.find(query).sort({ createdAt: -1 }).limit(200));
  return NextResponse.json({ combos: combos.map((c) => withStockInfo(c, { depopulate: true })) });
});

export async function GET(req, ctx) {
  const { searchParams } = new URL(req.url);

  // `?all=true` used to be public and leaked hidden combos — it now needs a login.
  if (searchParams.get('all')) return adminList(req, ctx);

  await dbConnect();
  const combos = await withProducts(Combo.find({ isActive: true }).sort({ createdAt: -1 }));
  return NextResponse.json({ combos: combos.map((c) => withStockInfo(c)) });
}

export const POST = requireAdmin(async (req, ctx, admin) => {
  if (admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Sellers create combos from the seller panel' }, { status: 403 });
  }
  try {
    await dbConnect();
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const { data, error } = await buildComboData(body, admin);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const combo = await createCombo(data);
    return NextResponse.json({ combo }, { status: 201 });
  } catch (err) {
    console.error('POST /api/combos error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create combo' }, { status: 500 });
  }
});