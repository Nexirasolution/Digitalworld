import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/lib/mongodb';
import Admin from '@/models/Admin';

export async function POST(req) {
  try {
    const { name, email, password, businessName, businessPhone, businessAddress, gstNumber } = await req.json();

    if (!email || !password || !businessName) {
      return NextResponse.json(
        { error: 'Email, password, and business name are required.' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    await dbConnect();

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Admin.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const seller = await Admin.create({
      name: name?.trim() || 'Seller',
      email: normalizedEmail,
      passwordHash,
      role: 'seller',
      status: 'pending',
      businessName: businessName.trim(),
      businessPhone: businessPhone?.trim() || '',
      businessAddress: businessAddress?.trim() || '',
      gstNumber: gstNumber?.trim() || '',
    });

    // Do NOT log them in here — they need superadmin approval first.
    return NextResponse.json({
      ok: true,
      message: 'Registration submitted. You will be able to log in once your business is approved.',
      seller: { id: seller._id, email: seller.email, status: seller.status },
    });
  } catch (err) {
    console.error('Seller registration error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}