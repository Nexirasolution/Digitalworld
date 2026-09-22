import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { requireAdmin } from '@/lib/apiAuth';

export const GET = requireAdmin(async (req, ctx, admin) => {
  await dbConnect();

  const productFilter = admin.role === 'superadmin' ? {} : { seller: admin.id };
  const orderFilter = admin.role === 'superadmin' ? {} : { 'items.seller': admin.id };

  const [totalProducts, totalOrders, orders] = await Promise.all([
    Product.countDocuments(productFilter),
    Order.countDocuments(orderFilter),
    Order.find(orderFilter).select('items').lean(),
  ]);

  let revenue = 0;
  for (const o of orders) {
    for (const it of o.items) {
      if (admin.role === 'superadmin' || (it.seller && String(it.seller) === String(admin.id))) {
        revenue += (it.price || 0) * (it.qty || 0);
      }
    }
  }

  return NextResponse.json({ totalProducts, totalOrders, revenue });
});