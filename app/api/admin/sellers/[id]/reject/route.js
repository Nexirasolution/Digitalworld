import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { requireSuperAdmin } from '@/lib/apiAuth';

export const POST = requireSuperAdmin(async (req, { params }) => {
  await dbConnect();
  const { reason } = await req.json().catch(() => ({}));
  const seller = await Admin.findById(params.id);
  if (!seller || seller.role !== 'seller') {
    return NextResponse.json({ error: 'Seller not found.' }, { status: 404 });
  }
  seller.status = 'rejected';
  seller.rejectionReason = reason?.trim() || '';
  seller.approvedAt = null;
  seller.approvedBy = null;
  await seller.save();
  return NextResponse.json({ ok: true, seller: { id: seller._id, email: seller.email, status: seller.status } });
});