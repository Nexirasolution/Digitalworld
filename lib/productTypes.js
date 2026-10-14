// Single source of truth for "what kind of product is this?".
// Used by the forms (what to render) AND the API routes (what to validate/keep).
// To add a new kind of product (books, cosmetics, ...), add one entry here and
// add its key to the enums in models/Product.js and models/Category.js.

export const PRODUCT_TYPES = {
  apparel: {
    label: 'Apparel / Dresses',
    hasColor: true,
    showFabric: true,
    showSizeChart: true,
    showSleeveZip: true,   // sleeveOptions + zipOptions
    showAddons: true,      // pantOptions + shawlOptions
    sizeLabel: 'Sizes & Stock',
    sizePlaceholder: 'Size (e.g. M, 38, Free Size)',
    defaultSize: '',       // '' = admin must type a size
    fields: [],
    specs: false,
  },
  electronics: {
    label: 'Electronics',
    hasColor: true,
    showFabric: false,
    showSizeChart: false,
    showSleeveZip: false,
    showAddons: false,
    sizeLabel: 'Configurations & Stock',
    sizePlaceholder: 'Option (e.g. 8GB/128GB, 65W)',
    defaultSize: 'Standard',
    fields: [
      { key: 'brand', label: 'Brand', required: true },
      { key: 'modelNumber', label: 'Model number' },
      { key: 'warrantyMonths', label: 'Warranty (months)', type: 'number' },
      { key: 'boxContents', label: 'In the box', type: 'textarea' },
    ],
    specs: true, // free-form rows: "Battery" -> "5000 mAh"
  },
  food: {
    label: 'Food & Snacks',
    hasColor: false,
    showFabric: false,
    showSizeChart: false,
    showSleeveZip: false,
    showAddons: false,
    sizeLabel: 'Pack sizes & Stock',
    sizePlaceholder: 'Pack (e.g. 250g, 1kg, Box of 6)',
    defaultSize: 'Standard',
    fields: [
      { key: 'foodType', label: 'Food type', type: 'select', options: ['Veg', 'Non-Veg', 'Vegan'], required: true },
      { key: 'ingredients', label: 'Ingredients', type: 'textarea' },
      { key: 'allergens', label: 'Allergens (e.g. nuts, gluten)' },
      { key: 'shelfLifeDays', label: 'Shelf life (days)', type: 'number' },
      { key: 'storage', label: 'Storage instructions' },
      { key: 'fssaiLicense', label: 'FSSAI licence no.', required: true },
    ],
    specs: false,
  },
  general: {
    label: 'General',
    hasColor: true,
    showFabric: false,
    showSizeChart: false,
    showSleeveZip: false,
    showAddons: false,
    sizeLabel: 'Options & Stock',
    sizePlaceholder: 'Option (e.g. Small, 500ml)',
    defaultSize: 'Standard',
    fields: [{ key: 'brand', label: 'Brand' }],
    specs: true,
  },
};

export const PRODUCT_TYPE_KEYS = Object.keys(PRODUCT_TYPES);

export function getType(key) {
  return PRODUCT_TYPES[key] || PRODUCT_TYPES.apparel; // legacy categories behave as before
}

// Server-side: a category's type (subcategories are kept in sync with their
// parent by the categories API, but fall back to the parent just in case).
export function resolveProductType(cat) {
  return cat?.productType || cat?.parent?.productType || 'apparel';
}

// Server-side: drop fields that don't belong to this type, normalise variants,
// validate required attributes. Returns { body } or { error }.
export function sanitizeByType(body, typeKey) {
  const t = getType(typeKey);
  const out = { ...body, productType: typeKey };

  if (!t.showSleeveZip) { out.sleeveOptions = []; out.zipOptions = []; }
  if (!t.showAddons) { out.pantOptions = []; out.shawlOptions = []; }
  if (!t.showFabric) out.fabric = '';
  if (!t.showSizeChart) out.sizeChart = [];

  if (Array.isArray(out.variants)) {
    for (const v of out.variants) {
      if (!Number.isFinite(Number(v.price)) || Number(v.price) <= 0) {
        return { error: 'Every variant needs a price greater than 0' };
      }
    }
    out.variants = out.variants.map((v) => {
      let sizes = (v.sizes || [])
        .map((s) => ({ ...s, size: String(s.size || '').trim(), stock: Number(s.stock) || 0 }))
        .filter((s) => s.size);
      if (!sizes.length && t.defaultSize) {
        sizes = [{ size: t.defaultSize, stock: Number(v.sizes?.[0]?.stock) || 0 }];
      }
      return {
        ...v,
        ...(t.hasColor ? {} : { color: '', colorHex: '#000000' }),
        sizes,
      };
    });
    if (out.variants.some((v) => v.sizes.length === 0)) {
      return { error: `Each variant needs at least one entry under "${t.sizeLabel.replace(' & Stock', '')}"` };
    }
  }

  const attrs = {};
  for (const f of t.fields) {
    const raw = body.attributes?.[f.key];
    const val = raw === undefined || raw === null ? '' : String(raw).trim();
    if (f.required && !val) return { error: `${f.label} is required for ${t.label.toLowerCase()}` };
    if (f.type === 'select' && val && !f.options.includes(val)) return { error: `Invalid ${f.label}` };
    if (val) attrs[f.key] = val;
  }
  out.attributes = attrs;

  out.specs = t.specs
    ? (Array.isArray(body.specs) ? body.specs : [])
        .map((s) => ({ key: String(s.key || '').trim(), value: String(s.value || '').trim() }))
        .filter((s) => s.key && s.value)
    : [];

  return { body: out };
}