import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { requireAdmin } from '@/lib/apiAuth';

export const GET = requireAdmin(async (req, ctx, admin) => {
  await dbConnect();
  const me = await Admin.findById(admin.id).select('-passwordHash');
  if (!me) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  return NextResponse.json({ admin: me });
});

export const PUT = requireAdmin(async (req, ctx, admin) => {
  try {
    await dbConnect();
    const body = await req.json();
    const { name, businessName, businessPhone, businessAddress, gstNumber, currentPassword, newPassword } = body;

    const me = await Admin.findById(admin.id);
    if (!me) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

    if (name !== undefined) me.name = name.trim();
    if (businessName !== undefined) me.businessName = businessName.trim();
    if (businessPhone !== undefined) me.businessPhone = businessPhone.trim();
    if (businessAddress !== undefined) me.businessAddress = businessAddress.trim();
    if (gstNumber !== undefined) me.gstNumber = gstNumber.trim();

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password.' }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, me.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
      }
      me.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await me.save();

    const { passwordHash, ...safe } = me.toObject();
    return NextResponse.json({ ok: true, admin: safe });
  } catch (err) {
    console.error('PUT /api/seller/settings error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 });
  }
});