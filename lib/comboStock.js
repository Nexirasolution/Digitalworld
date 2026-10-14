// Pure helpers (no DB access) — safe to use in server components, API routes
// and client components. They expect combos whose products / baseProduct are
// POPULATED with at least: name, variants, isActive.

const sid = (v) => String(v && typeof v === 'object' && v._id ? v._id : v ?? '');
const isNil = (v) => v === null || v === undefined || v === '';
const populated = (v) => (v && typeof v === 'object' && !Array.isArray(v) && v.variants ? v : null);

// What the per-variant entries are called for each product type
// (see lib/productTypes.js): sizes, configurations, pack sizes, options.
const OPTION_LABELS = { apparel: 'Size', electronics: 'Option', food: 'Pack size', general: 'Option' };
export const optionLabel = (productType) => OPTION_LABELS[productType] || 'Size';

export function findVariant(product, variantId) {
  if (!product || !variantId) return null;
  return (product.variants || []).find((v) => sid(v._id) === String(variantId)) || null;
}

export function sizeStock(variant, size) {
  const entry = variant?.sizes?.find((s) => s.size === size);
  return Math.max(Number(entry?.stock) || 0, 0);
}

export function variantStock(variant) {
  return (variant?.sizes || []).reduce((sum, s) => sum + Math.max(Number(s.stock) || 0, 0), 0);
}

// ---------- multi-product bundle ----------
// available = how many whole combos can be sold right now.
export function bundleAvailability(combo) {
  const lines = [];
  const totals = new Map(); // same SKU used on two lines shares one stock pool

  for (const l of combo.products || []) {
    const product = populated(l.product);
    const variant = findVariant(product, l.variantId);
    const qty = Math.max(Math.floor(Number(l.qty)) || 1, 1);
    const key = `${sid(product?._id)}:${l.variantId}:${l.size}`;
    totals.set(key, (totals.get(key) || 0) + qty);

    const usable = !!product && product.isActive !== false && !!variant;
    lines.push({
      key,
      name: product?.name || 'Product unavailable',
      color: variant?.color || '',
      colorHex: variant?.colorHex || '',
      size: l.size || '',
      sizeLabel: optionLabel(product?.productType),
      qty,
      stock: usable ? sizeStock(variant, l.size) : 0,
      usable,
    });
  }

  for (const line of lines) line.possible = Math.floor(line.stock / totals.get(line.key));
  const available = lines.length ? Math.min(...lines.map((l) => l.possible)) : 0;
  return { lines, available, inStock: available > 0 };
}

// ---------- colour pack ----------
// A colour's sellable pieces = min(its own stock cap, linked variant stock).
// A pack's available count = min(pack stock, floor(total pieces / pack size)).
// `null` always means "unlimited".
export function colorPackAvailability(combo) {
  const base = populated(combo.baseProduct);
  const baseActive = !!base && base.isActive !== false;

  const colors = (combo.colors || []).map((c) => {
    const own = isNil(c.stock) ? null : Math.max(Number(c.stock) || 0, 0);
    let linked = null;
    if (c.variantId) {
      const v = baseActive ? findVariant(base, c.variantId) : null;
      linked = v ? (c.size ? sizeStock(v, c.size) : variantStock(v)) : 0;
    }
    const caps = [own, linked].filter((x) => x !== null);
    return { name: c.name, hex: c.hex, pieces: caps.length ? Math.min(...caps) : null };
  });

  const anyUnlimited = colors.some((c) => c.pieces === null);
  const totalPieces = anyUnlimited ? null : colors.reduce((s, c) => s + c.pieces, 0);

  const packs = (combo.packOptions || []).map((p) => {
    const own = isNil(p.stock) ? null : Math.max(Number(p.stock) || 0, 0);
    const byPieces = totalPieces === null ? null : Math.floor(totalPieces / p.size);
    const caps = [own, byPieces].filter((x) => x !== null);
    const available = caps.length ? Math.min(...caps) : null;
    return {
      size: p.size,
      price: p.price,
      originalPrice: p.originalPrice || 0,
      available,
      inStock: available === null || available > 0,
    };
  });

  const inStock = packs.some((p) => p.inStock);
  const finite = packs.every((p) => p.available !== null);
  return {
    colors,
    packs,
    inStock,
    available: !inStock ? 0 : finite ? Math.max(...packs.map((p) => p.available)) : null,
  };
}

export function comboAvailability(combo) {
  return combo.type === 'color-pack' ? colorPackAvailability(combo) : bundleAvailability(combo);
}

// For list APIs: adds `stockInfo` and (optionally) swaps populated docs back to
// plain ids so the response stays small and doesn't expose every variant's stock.
export function withStockInfo(combo, { depopulate = false } = {}) {
  const info = comboAvailability(combo);
  const out = { ...combo, stockInfo: { inStock: info.inStock, available: info.available } };
  if (depopulate) {
    out.products = (combo.products || []).map((l) => ({ ...l, product: l.product?._id || l.product }));
    out.baseProduct = combo.baseProduct?._id || combo.baseProduct || null;
  }
  return out;
}