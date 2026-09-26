import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import { requireAdmin, ownsProduct } from '@/lib/apiAuth';

function getFilter(id) {
  return mongoose.isValidObjectId(id) ? { _id: id } : { slug: id };
}

// Seller-facing single product fetch for the edit form. Unlike the public
// GET /api/products/[id], this returns the product regardless of isActive
// status, and enforces ownership — a seller can only load their own
// products; a superadmin can load any.
export const GET = requireAdmin(async (req, { params }, admin) => {
  await dbConnect();

  const product = await Product.findOne(getFilter(params.id)).populate('category', 'name slug parent');
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  if (!ownsProduct(admin, product)) {
    return NextResponse.json({ error: 'You do not have permission to view this product.' }, { status: 403 });
  }

  return NextResponse.json({ product });
});