import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Order from '@/models/Order';
import { requireAdmin } from '@/lib/apiAuth';

export const GET = requireAdmin(async (req, ctx, admin) => {
  await dbConnect();
  const { searchParams } = new URL(req.url);

  const query = admin.role === 'superadmin' ? {} : { 'items.seller': admin.id };

  const status = searchParams.get('status');
  if (status) query.status = status;

  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 20);

  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(query),
  ]);

  // For a non-superadmin, only show that seller's own line items and a
  // recomputed subtotal for just those items — a mixed-seller order never
  // exposes another seller's products or pricing.
  const shaped = orders.map((o) => {
    if (admin.role === 'superadmin') return o;
    const myItems = o.items.filter((it) => it.seller && String(it.seller) === String(admin.id));
    const mySubtotal = myItems.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 0), 0);
    return { ...o, items: myItems, mySubtotal, otherSellerItemsCount: o.items.length - myItems.length };
  });

  return NextResponse.json({ orders: shaped, total, page, pages: Math.ceil(total / limit) });
});