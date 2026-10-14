import mongoose from 'mongoose';

const { Schema } = mongoose;

// One line of a multi-product bundle = one exact SKU (product + variant + size)
// and how many units of it go into ONE combo. Stock is tracked per size, so
// variantId and size are mandatory — without them stock can't be checked or reduced.
const ProductLineSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: String, required: true },
    size: { type: String, required: true },
    qty: { type: Number, default: 1, min: 1 }, // units of this SKU per combo
  },
  { _id: false }
);

const ColorOptionSchema = new Schema(
  {
    name: { type: String, required: true },
    hex: { type: String, default: '' },
    variantId: { type: String, default: '' }, // link to baseProduct variant => live stock
    size: { type: String, default: '' },      // '' = any size of that variant
    stock: { type: Number, default: null },   // optional extra cap for this colour; null = no cap
  },
  { _id: false }
);

const PackOptionSchema = new Schema(
  {
    size: { type: Number, required: true }, // pieces in this pack (5, 10, ...)
    price: { type: Number, required: true },
    originalPrice: { type: Number, default: 0 },
    stock: { type: Number, default: null }, // packs available to sell; null = unlimited
  },
  { _id: false }
);

const SizeChartRowSchema = new Schema(
  {
    size: { type: String, required: true },
    chest: { type: String, default: '' },
    waist: { type: String, default: '' },
    length: { type: String, default: '' },
  },
  { _id: false }
);

const ComboSchema = new Schema(
  {
    type: { type: String, enum: ['multi-product', 'color-pack'], default: 'multi-product' },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, default: '', trim: true },
    images: [{ type: String }],
    description: { type: String, default: '' },

    // Owner of the products inside (Admin doc, role 'seller'). null = store-owned.
    // Set server-side from the products, never from the client.
    seller: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },

    // multi-product
    products: [ProductLineSchema],
    comboPrice: { type: Number, default: 0 },
    originalPrice: { type: Number, default: 0 },

    // color-pack
    baseProduct: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    colors: [ColorOptionSchema],
    packOptions: [PackOptionSchema],
    sizeChart: [SizeChartRowSchema],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ComboSchema.index({ seller: 1 });
ComboSchema.index({ isActive: 1, createdAt: -1 });

// Last line of defence for any code path that bypasses buildComboData.
ComboSchema.pre('validate', function (next) {
  if (this.type === 'color-pack') {
    if (!this.baseProduct) return next(new Error('A base product is required for a colour pack'));
    if (!this.colors?.length) return next(new Error('Add at least one colour'));
    if (!this.packOptions?.length) return next(new Error('Add at least one pack option'));
  } else {
    if (!this.products?.length) return next(new Error('A combo needs at least one product'));
    if (!(this.comboPrice > 0)) return next(new Error('Combo price is required'));
  }
  next();
});

// Dev only: Next.js hot reload keeps Mongoose's model registry alive, so force a
// recompile to pick up schema edits. In production the model is compiled once.
if (process.env.NODE_ENV !== 'production' && mongoose.models.Combo) {
  delete mongoose.models.Combo;
}

export default mongoose.models.Combo || mongoose.model('Combo', ComboSchema);