import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Admin from '@/models/Admin';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { requireSuperAdmin } from '@/lib/apiAuth';

export const GET = requireSuperAdmin(async () => {
  await dbConnect();

  const [pendingSellers, approvedSellers, rejectedSellers, totalProducts, totalOrders, revenueAgg] =
    await Promise.all([
      Admin.countDocuments({ role: 'seller', status: 'pending' }),
      Admin.countDocuments({ role: 'seller', status: 'approved' }),
      Admin.countDocuments({ role: 'seller', status: 'rejected' }),
      Product.countDocuments({}),
      Order.countDocuments({}),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

  return NextResponse.json({
    sellers: { pending: pendingSellers, approved: approvedSellers, rejected: rejectedSellers },
    totalProducts,
    totalOrders,
    totalRevenue: revenueAgg[0]?.total || 0,
  });
});