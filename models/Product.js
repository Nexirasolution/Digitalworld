import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema(
  {
    color: { type: String, default: '' },
    colorHex: { type: String, default: '#000000' },
    images: [{ type: String }],
    price: { type: Number, required: true },
    compareAtPrice: { type: Number, default: 0 },
    sizes: [
      {
        size: { type: String, required: true },
        stock: { type: Number, default: 0 },
        sku: { type: String }
      }
    ]
  },
  { _id: true }
);

const AddonOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    sku: { type: String, default: '' }
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

    // Which seller (Admin doc, role: 'seller') owns/added this product.
    // null = added directly by a superadmin, not tied to any seller.
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
    seoDescription: String
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ seller: 1 });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);