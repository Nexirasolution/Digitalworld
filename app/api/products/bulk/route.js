import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import slugify from 'slugify';
import { requireApprovedSeller } from '@/lib/apiAuth';
import { resolveProductType, sanitizeByType } from '@/lib/productTypes';

export const POST = requireApprovedSeller(async (req, ctx, admin) => {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      category,
      skuPrefix,
      description = '',
      fabric = '',
      price,
      compareAtPrice = 0,
      sizes = [],
      images = [],
      tags = [],
      isReadyToShip = false,
      sizeChart = [],
      sleeveOptions = [],
      zipOptions = [],
      attributes = {},   // NEW — type-specific fields shared by the whole batch
      specs = [],        // NEW
    } = body;

    if (!category) return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    if (!skuPrefix?.trim()) return NextResponse.json({ error: 'SKU code is required' }, { status: 400 });
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }
    if (!price || Number(price) <= 0) {
      return NextResponse.json({ error: 'Price is required' }, { status: 400 });
    }
    const sizeEntries = (sizes || [])
      .filter((s) => s.size)
      .map((s) => ({ size: s.size, stock: Number(s.stock) || 0 }));
    if (sizeEntries.length === 0) {
      return NextResponse.json({ error: 'At least one size/option with stock is required' }, { status: 400 });
    }

    const cat = await Category.findById(category).populate('parent', 'productType');
    if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    // Strip anything that doesn't belong to this category's product type.
    const ALLOWED_SLEEVE = ['Full Sleeve', 'Half Sleeve', 'Elbow Sleeve', 'Sleeveless'];
    const ALLOWED_ZIP = ['With Zip', 'Without Zip'];
    const typeKey = resolveProductType(cat);
    const { body: clean, error: typeError } = sanitizeByType(
      {
        fabric,
        attributes,
        specs,
        sizeChart: Array.isArray(sizeChart) ? sizeChart.filter(Boolean) : (sizeChart ? [sizeChart] : []),
        sleeveOptions: Array.isArray(sleeveOptions) ? sleeveOptions.filter((s) => ALLOWED_SLEEVE.includes(s)) : [],
        zipOptions: Array.isArray(zipOptions) ? zipOptions.filter((z) => ALLOWED_ZIP.includes(z)) : [],
        variants: [{ price: Number(price), sizes: sizeEntries }],
      },
      typeKey
    );
    if (typeError) return NextResponse.json({ error: typeError }, { status: 400 });
    const finalSizes = clean.variants[0].sizes;

    const titleCode = (cat.name || 'PRODUCT').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!titleCode) {
      return NextResponse.json({ error: 'Category name must contain letters/numbers to generate a title' }, { status: 400 });
    }

    const skuCode = skuPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!skuCode) return NextResponse.json({ error: 'SKU code must contain letters/numbers' }, { status: 400 });

    const existingTitles = await Product.find({
      category: cat._id,
      name: { $regex: `^${titleCode}\\d+$`, $options: 'i' },
    }).select('name');

    let maxTitleNum = 0;
    const titleNumRe = new RegExp(`^${titleCode}(\\d+)$`, 'i');
    for (const p of existingTitles) {
      const match = p.name.match(titleNumRe);
      if (match) maxTitleNum = Math.max(maxTitleNum, parseInt(match[1], 10));
    }

    const existingSkus = await Product.find({ sku: { $regex: `^${skuCode}\\d+$`, $options: 'i' } }).select('sku');

    let maxSkuNum = 0;
    const skuNumRe = new RegExp(`^${skuCode}(\\d+)$`, 'i');
    for (const p of existingSkus) {
      const match = p.sku?.match(skuNumRe);
      if (match) maxSkuNum = Math.max(maxSkuNum, parseInt(match[1], 10));
    }

    const seller = admin.role === 'seller' ? admin.id : null;
    const created = [];
    const errors = [];

    for (let i = 0; i < images.length; i++) {
      const titleNum = maxTitleNum + i + 1;
      const name = `${titleCode}${String(titleNum).padStart(3, '0')}`;
      const slug = slugify(name, { lower: true });

      const skuNum = maxSkuNum + i + 1;
      const sku = `${skuCode}${String(skuNum).padStart(3, '0')}`;

      try {
        const slugTaken = await Product.findOne({ slug });
        if (slugTaken) {
          errors.push({ name, error: 'A product with this generated name/slug already exists — skipped' });
          continue;
        }
        const skuTaken = await Product.findOne({ sku });
        if (skuTaken) {
          errors.push({ name, error: `Generated SKU ${sku} already exists — skipped` });
          continue;
        }

        const variant = {
          color: '',
          colorHex: '#000000',
          images: [images[i]],
          price: Number(price),
          compareAtPrice: Number(compareAtPrice) || 0,
          sizes: finalSizes.map((s) => ({ ...s })),
        };

        const product = await Product.create({
          name,
          slug,
          sku,
          description,
          category: cat._id,
          seller,
          productType: typeKey,
          attributes: clean.attributes,
          specs: clean.specs,
          fabric: clean.fabric,
          tags,
          variants: [variant],
          basePrice: Number(price),
          isReadyToShip: !!isReadyToShip,
          sizeChart: clean.sizeChart,
          sleeveOptions: clean.sleeveOptions,
          zipOptions: clean.zipOptions,
        });

        created.push({ id: product._id, name: product.name, sku: product.sku });
      } catch (err) {
        errors.push({ name, error: err.message });
      }
    }

    return NextResponse.json({ createdCount: created.length, created, errors }, { status: created.length ? 201 : 400 });
  } catch (err) {
    console.error('POST /api/products/bulk error:', err);
    return NextResponse.json({ error: err.message || 'Bulk upload failed' }, { status: 500 });
  }
});