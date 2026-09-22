import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import Review from '@/models/Review';
import { requireApprovedSeller, ownsProduct } from '@/lib/apiAuth';

function getFilter(id) {
  return mongoose.isValidObjectId(id) ? { _id: id } : { slug: id };
}

export async function GET(req, { params }) {
  await dbConnect();

  const product = await Product.findOne({
    ...getFilter(params.id),
    isActive: true,
  }).populate('category', 'name slug sizes type sizeChart');

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const reviews = await Review.find({ product: product._id, isApproved: true }).sort({ createdAt: -1 });

  const related = await Product.find({
    category: product.category._id,
    _id: { $ne: product._id },
    isActive: true,
  })
    .limit(8)
    .select('name slug basePrice variants rating')
    .populate('category', 'name slug type sizeChart');

  return NextResponse.json({ product, reviews, related });
}

export const PUT = requireApprovedSeller(async (req, { params }, admin) => {
  await dbConnect();
  const body = await req.json();

  const current = await Product.findOne(getFilter(params.id)).select('_id category sku seller');
  if (!current) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  if (!ownsProduct(admin, current)) {
    return NextResponse.json({ error: 'You do not have permission to edit this product.' }, { status: 403 });
  }

  delete body.sku;
  delete body.seller; // ownership can't be reassigned through this route

  if (body.variants?.length) {
    body.basePrice = Math.min(...body.variants.map((v) => v.price));
  }

  const product = await Product.findOneAndUpdate(getFilter(params.id), body, { new: true });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  return NextResponse.json({ product });
});

export const DELETE = requireApprovedSeller(async (req, { params }, admin) => {
  await dbConnect();

  const current = await Product.findOne(getFilter(params.id)).select('_id seller');
  if (!current) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  if (!ownsProduct(admin, current)) {
    return NextResponse.json({ error: 'You do not have permission to delete this product.' }, { status: 403 });
  }

  await Product.findOneAndDelete(getFilter(params.id));
  return NextResponse.json({ success: true });
});