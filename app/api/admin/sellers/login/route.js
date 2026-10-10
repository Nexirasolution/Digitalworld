import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { signAdminToken, setAdminCookie } from '@/lib/auth';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    await dbConnect();

    const seller = await Admin.findOne({
      email: email.toLowerCase().trim(),
      role: 'seller',
    });

    // Same message for "not found" and "wrong password" to avoid leaking which emails exist
    if (!seller) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, seller.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (seller.status === 'rejected') {
      return NextResponse.json(
        {
          error: 'Your seller application was rejected.',
          reason: seller.rejectionReason || undefined,
        },
        { status: 403 }
      );
    }

    const token = signAdminToken(seller);

    const res = NextResponse.json({
      ok: true,
      admin: {
        id: seller._id,
        name: seller.name,
        email: seller.email,
        role: seller.role,
        status: seller.status,
      },
    });
    setAdminCookie(res, token);
    return res;
  } catch (err) {
    console.error('Seller login error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}