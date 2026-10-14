export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Combo from '@/models/Combo';
import { requireAdmin, requireApprovedSeller } from '@/lib/apiAuth';
import { buildComboData, createCombo } from '@/lib/comboValidation';
import { withStockInfo } from '@/lib/comboStock';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Pending sellers can view their combos; only approved sellers can create.
export const GET = requireAdmin(async (req, ctx, admin) => {
  await dbConnect();
  const { searchParams } = new URL(req.url);

  const query = admin.role === 'superadmin' ? {} : { seller: admin.id };
  const search = (searchParams.get('search') || '').trim();
  if (search) query.name = { $regex: escapeRegex(search), $options: 'i' };

  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);

  const [combos, total] = await Promise.all([
    Combo.find(query)
      .populate('products.product', 'name variants isActive')
      .populate('baseProduct', 'name variants isActive')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Combo.countDocuments(query),
  ]);

  return NextResponse.json({
    combos: combos.map((c) => withStockInfo(c, { depopulate: true })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

export const POST = requireApprovedSeller(async (req, ctx, admin) => {
  try {
    await dbConnect();
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const { data, error } = await buildComboData(body, admin);
    if (error) return NextResponse.json({ error }, { status: 400 });

    // data.seller is derived from the products' owner (the seller themself here)
    const combo = await createCombo(data);
    return NextResponse.json({ combo }, { status: 201 });
  } catch (err) {
    console.error('POST /api/seller/combos error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create combo' }, { status: 500 });
  }
});