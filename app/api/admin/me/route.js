import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const GET = requireAdmin(async (req, ctx, admin) => {
  return NextResponse.json({ admin: { id: admin.id, email: admin.email, role: admin.role } });
});