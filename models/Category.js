import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },

    // NEW: decides which fields the product forms show for products in this
    // category. Subcategories are kept equal to their parent by the API.
    // Existing categories default to 'apparel', so nothing changes for them.
    productType: { type: String, enum: ['apparel', 'electronics', 'food', 'general'], default: 'apparel' },

    // Size / option / pack-size choices used by the bulk uploader and filters,
    // e.g. S,M,L,XL for apparel or 250g,500g,1kg for snacks.
    sizes: [{ type: String }],

    // Fallback size chart images (apparel only in practice).
    sizeChart: [{ type: String }],

    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    seoTitle: String,
    seoDescription: String,
  },
  { timestamps: true }
);

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);