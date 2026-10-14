import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Combo from '@/models/Combo';
import { requireAdmin } from '@/lib/apiAuth';
import { buildComboData } from '@/lib/comboValidation';

const notFound = () => NextResponse.json({ error: 'Combo not found' }, { status: 404 });
const forbidden = () => NextResponse.json({ error: 'Only the store admin can do this' }, { status: 403 });

export const PUT = requireAdmin(async (req, { params }, admin) => {
  if (admin.role !== 'superadmin') return forbidden();
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();
    await dbConnect();

    const combo = await Combo.findById(id);
    if (!combo) return notFound();

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    // Same validation as create: findByIdAndUpdate skips it, which used to let an
    // edit save a combo with no colours / packs / price.
    const { data, error } = await buildComboData(body, admin);
    if (error) return NextResponse.json({ error }, { status: 400 });

    combo.set(data); // slug is never changed
    await combo.save();
    return NextResponse.json({ combo });
  } catch (err) {
    console.error('PUT /api/combos/[id] error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update combo' }, { status: 500 });
  }
});

// Quick show / hide without re-validating the whole combo.
export const PATCH = requireAdmin(async (req, { params }, admin) => {
  if (admin.role !== 'superadmin') return forbidden();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return notFound();
  await dbConnect();

  const body = await req.json().catch(() => null);
  if (typeof body?.isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive (true/false) is required' }, { status: 400 });
  }
  const res = await Combo.updateOne({ _id: id }, { $set: { isActive: body.isActive } });
  if (!res.matchedCount) return notFound();
  return NextResponse.json({ success: true, isActive: body.isActive });
});

export const DELETE = requireAdmin(async (req, { params }, admin) => {
  if (admin.role !== 'superadmin') return forbidden();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return notFound();
  await dbConnect();

  const deleted = await Combo.findByIdAndDelete(id);
  if (!deleted) return notFound();
  return NextResponse.json({ success: true });
});