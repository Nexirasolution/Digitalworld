import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { requireAdmin } from '@/lib/apiAuth';
import { PRODUCT_TYPE_KEYS } from '@/lib/productTypes';

function getFilter(id) {
  return mongoose.isValidObjectId(id) ? { _id: id } : { slug: id };
}

// GET /api/categories/[id]
//   category      — with `parent` populated (name/slug) for breadcrumbs
//   subcategories — direct children
export async function GET(req, { params }) {
  await dbConnect();
  const category = await Category.findOne(getFilter(params.id)).populate('parent', 'name slug');
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

  const subcategories = await Category.find({ parent: category._id, isActive: true }).sort({ sortOrder: 1, name: 1 });

  return NextResponse.json({ category, subcategories });
}

export const PUT = requireAdmin(async (req, { params }) => {
  await dbConnect();
  const body = await req.json();
  if ('parent' in body) body.parent = body.parent || null;

  const existing = await Category.findOne(getFilter(params.id));
  if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

  // Work out the product type this category will have after the update.
  const parentId = 'parent' in body ? body.parent : existing.parent;
  let nextType = body.productType || existing.productType || 'apparel';
  if (parentId) {
    const parent = await Category.findById(parentId).select('productType');
    if (parent) nextType = parent.productType || 'apparel';
  }
  if (!PRODUCT_TYPE_KEYS.includes(nextType)) {
    return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
  }

  // Changing the type under existing products would leave them with fields that
  // no longer match, so block it until the category is empty.
  const typeChanged = nextType !== (existing.productType || 'apparel');
  if (typeChanged) {
    const childIds = (await Category.find({ parent: existing._id }).select('_id')).map((c) => c._id);
    const inUse = await Product.countDocuments({ category: { $in: [existing._id, ...childIds] } });
    if (inUse > 0) {
      return NextResponse.json(
        { error: `Can't change product type: ${inUse} product(s) already use this category. Move or delete them first.` },
        { status: 409 }
      );
    }
  }

  body.productType = nextType;
  const category = await Category.findOneAndUpdate(getFilter(params.id), body, { new: true });

  // Keep subcategories in sync with their parent.
  if (typeChanged) await Category.updateMany({ parent: category._id }, { productType: nextType });

  return NextResponse.json({ category });
});

export const DELETE = requireAdmin(async (req, { params }) => {
  await dbConnect();
  await Category.findOneAndDelete(getFilter(params.id));
  return NextResponse.json({ success: true });
});