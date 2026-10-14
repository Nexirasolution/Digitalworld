export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Category from '@/models/Category';
import slugify from 'slugify';
import { requireAdmin } from '@/lib/apiAuth';
import { PRODUCT_TYPE_KEYS } from '@/lib/productTypes';

// GET /api/categories
//   categories — flat sorted list (now includes `productType` on each)
//   topLevel   — parent-less categories each with a `subcategories` array
export async function GET() {
  await dbConnect();
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });

  const byParent = {};
  for (const c of categories) {
    const key = c.parent ? String(c.parent) : 'root';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  }

  const topLevel = (byParent.root || []).map((c) => ({
    ...c.toObject(),
    subcategories: byParent[String(c._id)] || [],
  }));

  return NextResponse.json({ categories, topLevel });
}

export const POST = requireAdmin(async (req) => {
  await dbConnect();
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

  const slug = body.slug ? slugify(body.slug, { lower: true }) : slugify(body.name, { lower: true });
  const exists = await Category.findOne({ slug });
  if (exists) return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });

  // A subcategory always uses its parent's product type; a main category uses
  // whatever the admin picked (default: apparel).
  let productType = body.productType || 'apparel';
  if (body.parent) {
    const parent = await Category.findById(body.parent).select('productType');
    if (!parent) return NextResponse.json({ error: 'Parent category not found' }, { status: 400 });
    productType = parent.productType || 'apparel';
  }
  if (!PRODUCT_TYPE_KEYS.includes(productType)) {
    return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
  }

  const category = await Category.create({ ...body, slug, parent: body.parent || null, productType });
  return NextResponse.json({ category }, { status: 201 });
});