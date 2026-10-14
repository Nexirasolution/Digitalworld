import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema(
  {
    color: { type: String, default: '' },
    colorHex: { type: String, default: '#000000' },
    images: [{ type: String }],
    price: { type: Number, required: true },
    compareAtPrice: { type: Number, default: 0 },
    // Holds sizes for apparel, pack sizes for food, configurations for electronics.
    // The label shown in the UI comes from lib/productTypes.js.
    sizes: [
      {
        size: { type: String, required: true },
        stock: { type: Number, default: 0 },
        sku: { type: String },
      },
    ],
  },
  { _id: true }
);

const AddonOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    sku: { type: String, default: '' },
  },
  { _id: true }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },

    // NEW — set server-side from the category. Existing docs read as 'apparel'.
    productType: { type: String, enum: ['apparel', 'electronics', 'food', 'general'], default: 'apparel', index: true },
    // NEW — type-specific fields (brand, warrantyMonths, foodType, fssaiLicense, ...)
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    // NEW — free-form spec table, e.g. [{ key: 'Battery', value: '5000 mAh' }]
    specs: [{ _id: false, key: String, value: String }],

    // Which seller (Admin doc, role: 'seller') owns this product; null = superadmin.
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },

    fabric: { type: String, default: '' },
    tags: [{ type: String }],
    variants: [VariantSchema],
    sizeChart: [{ type: String }],
    sleeveOptions: [{ type: String, enum: ['Full Sleeve', 'Half Sleeve', 'Elbow Sleeve', 'Sleeveless'] }],
    zipOptions: [{ type: String, enum: ['With Zip', 'Without Zip'] }],
    pantOptions: [AddonOptionSchema],
    shawlOptions: [AddonOptionSchema],
    isReadyToShip: { type: Boolean, default: false },
    basePrice: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isBestSeller: { type: Boolean, default: false },
    isTopSeller: { type: Boolean, default: false },
    isActiveSeller: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    soldCount: { type: Number, default: 0 },
    seoTitle: String,
    seoDescription: String,
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ seller: 1 });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);