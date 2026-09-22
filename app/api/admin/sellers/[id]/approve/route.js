import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { requireSuperAdmin } from '@/lib/apiAuth';

export const POST = requireSuperAdmin(async (req, { params }, superadmin) => {
  await dbConnect();
  const seller = await Admin.findById(params.id);
  if (!seller || seller.role !== 'seller') {
    return NextResponse.json({ error: 'Seller not found.' }, { status: 404 });
  }
  seller.status = 'approved';
  seller.rejectionReason = '';
  seller.approvedAt = new Date();
  seller.approvedBy = superadmin.id;
  await seller.save();
  return NextResponse.json({ ok: true, seller: { id: seller._id, email: seller.email, status: seller.status } });
});