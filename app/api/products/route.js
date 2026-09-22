export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import slugify from 'slugify';
import { requireApprovedSeller } from '@/lib/apiAuth';
import { generateSku } from '@/lib/sku';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const query = { isActive: true };

    const categorySlug = searchParams.get('category');
    if (categorySlug) {
      const cat = await Category.findOne({ slug: categorySlug });
      if (!cat) return NextResponse.json({ products: [], total: 0 });

      if (cat.parent) {
        query.category = cat._id;
      } else {
        const subcats = await Category.find({ parent: cat._id }).select('_id');
        const categoryIds = [cat._id, ...subcats.map((c) => c._id)];
        query.category = { $in: categoryIds };
      }
    }

    const size = searchParams.get('size');
    if (size) query['variants.sizes.size'] = size;

    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }

    const flag = searchParams.get('flag');
    if (flag === 'bestseller') query.isBestSeller = true;
    if (flag === 'topseller') query.isTopSeller = true;
    if (flag === 'active') query.isActiveSeller = true;
    if (flag === 'featured') query.isFeatured = true;

    if (flag === 'newarrival') {
      const cutoff30 = new Date();
      cutoff30.setDate(cutoff30.getDate() - 30);
      const cutoff90 = new Date();
      cutoff90.setDate(cutoff90.getDate() - 90);

      const [count30, count90] = await Promise.all([
        Product.countDocuments({ ...query, createdAt: { $gte: cutoff30 } }),
        Product.countDocuments({ ...query, createdAt: { $gte: cutoff90 } }),
      ]);

      if (count30 > 0) query.createdAt = { $gte: cutoff30 };
      else if (count90 > 0) query.createdAt = { $gte: cutoff90 };
    }

    const sort = searchParams.get('sort') || 'newest';
    const sortMap = {
      newest: { createdAt: -1 },
      priceLow: { basePrice: 1 },
      priceHigh: { basePrice: -1 },
      popular: { soldCount: -1 },
      rating: { rating: -1 }
    };

    const limitParam = searchParams.get('limit');
    const fetchAll = limitParam === 'all';
    const page = Number(searchParams.get('page') || 1);
    const limit = Number(limitParam || 24);

    let productsQuery = Product.find(query)
      .populate('category', 'name slug type sizeChart')
      .sort(sortMap[sort] || sortMap.newest);

    if (!fetchAll) productsQuery = productsQuery.skip((page - 1) * limit).limit(limit);

    const [products, total] = await Promise.all([productsQuery, Product.countDocuments(query)]);

    return NextResponse.json({
      products,
      total,
      page: fetchAll ? 1 : page,
      pages: fetchAll ? 1 : Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('GET /api/products error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export const POST = requireApprovedSeller(async (req, ctx, admin) => {
  try {
    await dbConnect();
    const body = await req.json();
    if (!body.name || !body.category) {
      return NextResponse.json({ error: 'Product name and category are required' }, { status: 400 });
    }

    const sku = await generateSku(body.category);
    const slug = body.slug ? slugify(body.slug, { lower: true }) : slugify(body.name, { lower: true });
    const exists = await Product.findOne({ slug });
    if (exists) return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 });

    const basePrice = body.variants?.length
      ? Math.min(...body.variants.map((v) => v.price))
      : body.basePrice || 0;

    // Ownership: a seller can only ever create products under their own
    // account, regardless of what (if anything) the client sends as `seller`.
    // A superadmin creating a product directly leaves it unowned (null).
    const seller = admin.role === 'seller' ? admin.id : (body.seller || null);

    const product = await Product.create({ ...body, slug, sku, basePrice, seller });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error('POST /api/products error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create product' }, { status: 500 });
  }
});