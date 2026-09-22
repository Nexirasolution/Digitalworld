import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Order from '@/models/Order';
import { requireApprovedSeller, ownsOrder } from '@/lib/apiAuth';

export async function GET(req, { params }) {
  await dbConnect();
  const order = await Order.findOne({ $or: [{ _id: params.id }, { orderNumber: params.id }] });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  return NextResponse.json({ order });
}

export const PUT = requireApprovedSeller(async (req, { params }, admin) => {
  await dbConnect();

  const existing = await Order.findById(params.id).select('items status');
  if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (!ownsOrder(admin, existing)) {
    return NextResponse.json(
      { error: 'You can only update orders made up entirely of your own products.' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const order = await Order.findByIdAndUpdate(params.id, body, { new: true });
  return NextResponse.json({ order });
});