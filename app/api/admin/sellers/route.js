import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { requireSuperAdmin } from '@/lib/apiAuth';

export const GET = requireSuperAdmin(async (req) => {
  await dbConnect();
  const status = req.nextUrl.searchParams.get('status');
  const filter = { role: 'seller' };
  if (status) filter.status = status;
  const sellers = await Admin.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();
  return NextResponse.json({ sellers });
});