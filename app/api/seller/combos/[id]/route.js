import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Combo from '@/models/Combo';
import { requireAdmin, requireApprovedSeller } from '@/lib/apiAuth';
import { buildComboData, ownsCombo } from '@/lib/comboValidation';

async function loadOwned(id, admin) {
  if (!mongoose.isValidObjectId(id)) {
    return { res: NextResponse.json({ error: 'Combo not found' }, { status: 404 }) };
  }
  const combo = await Combo.findById(id);
  if (!combo) return { res: NextResponse.json({ error: 'Combo not found' }, { status: 404 }) };
  if (!ownsCombo(admin, combo)) {
    return { res: NextResponse.json({ error: 'You do not have permission to access this combo.' }, { status: 403 }) };
  }
  return { combo };
}

// Raw (un-populated) combo — the edit form expects plain ids.
export const GET = requireAdmin(async (req, { params }, admin) => {
  await dbConnect();
  const { id } = await params;
  const { combo, res } = await loadOwned(id, admin);
  if (res) return res;
  return NextResponse.json({ combo });
});

export const PUT = requireApprovedSeller(async (req, { params }, admin) => {
  try {
    await dbConnect();
    const { id } = await params;
    const { combo, res } = await loadOwned(id, admin);
    if (res) return res;

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const { data, error } = await buildComboData(body, admin);
    if (error) return NextResponse.json({ error }, { status: 400 });

    combo.set(data); // slug is never changed
    await combo.save();
    return NextResponse.json({ combo });
  } catch (err) {
    console.error('PUT /api/seller/combos/[id] error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update combo' }, { status: 500 });
  }
});

// Quick show / hide.
export const PATCH = requireApprovedSeller(async (req, { params }, admin) => {
  await dbConnect();
  const { id } = await params;
  const { combo, res } = await loadOwned(id, admin);
  if (res) return res;

  const body = await req.json().catch(() => null);
  if (typeof body?.isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive (true/false) is required' }, { status: 400 });
  }
  await Combo.updateOne({ _id: combo._id }, { $set: { isActive: body.isActive } });
  return NextResponse.json({ success: true, isActive: body.isActive });
});

export const DELETE = requireApprovedSeller(async (req, { params }, admin) => {
  await dbConnect();
  const { id } = await params;
  const { combo, res } = await loadOwned(id, admin);
  if (res) return res;
  await combo.deleteOne();
  return NextResponse.json({ success: true });
});