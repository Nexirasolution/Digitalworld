import mongoose from 'mongoose';
import Product from '@/models/Product';
import Combo from '@/models/Combo';
import Coupon from '@/models/Coupon';
import Settings from '@/models/Settings';
import { genCouponCheck } from '@/lib/utils';
import { calculateShipping } from '@/lib/shipping';
import { OrderError } from '@/lib/orderErrors';

// Keep the old import path working: `import { OrderError } from '.../orderPricing'`
export { OrderError };

const idStr = (v) => String(v ?? '');
const pick = (...parts) => parts.filter(Boolean).join(', ');
const stockOf = (n) => Math.max(Number(n) || 0, 0);
const safeVariant = (product, id) =>
  product && id && mongoose.isValidObjectId(id) ? product.variants.id(id) : null;

/*
 * Cart item shapes this expects
 *   regular : { productId, variantId, size, qty, sleeveType?, zipType?, pantOption?, shawlOption? }
 *   bundle  : { isCombo: true, comboId, qty }
 *   colour pack : { isCombo: true, comboId, packSize, colors, qty }
 *       packSize = pieces in the chosen pack, qty = number of packs,
 *       colors   = [{ name, qty }]  (qty values must add up to packSize)
 *                  or ['Red','Red','Blue'] — one entry per piece
 *
 * Pure read-only pricing + validation. Does NOT touch stock or coupon usage —
 * safe to call twice (Razorpay amount, then final order creation).
 * Stock is taken afterwards with reserveStock(stockUpdateItems) from orderStock.js.
 */
export async function buildOrderItemsAndTotals(items, couponCode) {
  if (!Array.isArray(items) || !items.length) throw new OrderError('Your cart is empty');

  let subtotal = 0;
  const orderItems = [];
  const stockUpdateItems = [];

  const productCache = new Map();
  const getProduct = async (id) => {
    const key = idStr(id);
    if (!productCache.has(key)) {
      productCache.set(key, mongoose.isValidObjectId(key) ? await Product.findById(key) : null);
    }
    return productCache.get(key);
  };

  for (const item of items) {
    const qty = Math.floor(Number(item.qty));
    if (!Number.isFinite(qty) || qty < 1) throw new OrderError('Invalid quantity in your cart');

    // ---------------- combos ----------------
    if (item.isCombo === true && item.comboId) {
      if (!mongoose.isValidObjectId(item.comboId)) throw new OrderError('This combo is no longer available');
      const combo = await Combo.findById(item.comboId);
      if (!combo || !combo.isActive) throw new OrderError('This combo is no longer available');

      const built =
        combo.type === 'color-pack'
          ? await buildColorPackLine(combo, item, qty, getProduct)
          : await buildBundleLine(combo, qty, getProduct);

      subtotal += built.lineTotal;
      orderItems.push(built.orderItem);
      stockUpdateItems.push(...built.ops);
      continue;
    }

    // ---------------- regular products ----------------
    if (!mongoose.isValidObjectId(item.productId) || !mongoose.isValidObjectId(item.variantId)) continue;

    const product = await getProduct(item.productId);
    if (!product) continue;
    const variant = product.variants.id(item.variantId);
    if (!variant) continue;
    const sizeEntry = variant.sizes.find((s) => s.size === item.size);
    if (!sizeEntry || sizeEntry.stock < qty) {
      throw new OrderError(`${product.name} (${pick(variant.color, item.size)}) is out of stock`);
    }

    const sleeveType = item.sleeveType || '';
    const zipType = item.zipType || '';
    if (product.sleeveOptions?.length && (!sleeveType || !product.sleeveOptions.includes(sleeveType))) {
      throw new OrderError(`${product.name} — please select a valid sleeve type`);
    }
    if (product.zipOptions?.length && (!zipType || !product.zipOptions.includes(zipType))) {
      throw new OrderError(`${product.name} — please select a valid zip type`);
    }

    let pantOption = null;
    if (item.pantOption?.id) {
      const opt = product.pantOptions?.id(item.pantOption.id);
      if (!opt) throw new OrderError(`${product.name} — selected pant option is no longer available`);
      if (opt.stock < qty) throw new OrderError(`${product.name} — ${opt.name} (pant) is out of stock`);
      pantOption = opt;
    }

    let shawlOption = null;
    if (item.shawlOption?.id) {
      const opt = product.shawlOptions?.id(item.shawlOption.id);
      if (!opt) throw new OrderError(`${product.name} — selected shawl option is no longer available`);
      if (opt.stock < qty) throw new OrderError(`${product.name} — ${opt.name} (shawl) is out of stock`);
      shawlOption = opt;
    }

    const unitPrice = variant.price + (pantOption?.price || 0) + (shawlOption?.price || 0);
    subtotal += unitPrice * qty;

    orderItems.push({
      product: product._id,
      // Snapshot of the owning seller — routes the line into that seller's dashboard.
      seller: product.seller || null,
      name: product.name,
      sku: sizeEntry.sku || product.sku || '',
      image: variant.images?.[0] || '',
      color: variant.color,
      size: item.size,
      sleeveType,
      zipType,
      pantOption: pantOption
        ? { optionId: pantOption._id, name: pantOption.name, image: pantOption.image || '', price: pantOption.price, sku: pantOption.sku || '' }
        : null,
      shawlOption: shawlOption
        ? { optionId: shawlOption._id, name: shawlOption.name, image: shawlOption.image || '', price: shawlOption.price, sku: shawlOption.sku || '' }
        : null,
      price: unitPrice,
      qty,
    });

    const label = `${product.name} (${pick(variant.color, item.size)})`;
    stockUpdateItems.push({ type: 'size', productId: product._id, variantId: variant._id, size: item.size, qty, label });
    if (pantOption) {
      stockUpdateItems.push({ type: 'pant', productId: product._id, optionId: pantOption._id, qty, label: `${product.name} — ${pantOption.name} (pant)` });
    }
    if (shawlOption) {
      stockUpdateItems.push({ type: 'shawl', productId: product._id, optionId: shawlOption._id, qty, label: `${product.name} — ${shawlOption.name} (shawl)` });
    }
  }

  if (!orderItems.length) throw new OrderError('No valid items in cart');

  // ---------------- coupon ----------------
  let discount = 0;
  let appliedCoupon = '';
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: genCouponCheck(couponCode), isActive: true });
    if (coupon && subtotal >= (coupon.minOrderValue || 0)) {
      if (!coupon.expiresAt || coupon.expiresAt > new Date()) {
        if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
          discount = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
          if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
          discount = Math.min(discount, subtotal); // never let the total go negative
          appliedCoupon = coupon.code;
        }
      }
    }
  }

  const settings = await Settings.findOne({ key: 'global' }).lean();
  const totalQty = orderItems.reduce((sum, i) => sum + (i.qty || 0), 0);
  const discountedSubtotal = subtotal - discount;
  const { shippingCost: shippingFee } = calculateShipping(settings, { subtotal: discountedSubtotal, totalQty });
  const total = Math.round(discountedSubtotal + shippingFee);

  return { orderItems, stockUpdateItems, subtotal, discount, appliedCoupon, shippingFee, total };
}

// ======================= multi-product bundle =======================
async function buildBundleLine(combo, qty, getProduct) {
  if (!combo.products?.length || !(combo.comboPrice > 0)) {
    throw new OrderError(`Combo "${combo.name}" is not set up correctly`);
  }

  const needs = new Map(); // one entry per SKU, so duplicate lines share a stock check
  const parts = [];
  const owners = new Set();

  for (const line of combo.products) {
    const product = await getProduct(line.product);
    const variant = safeVariant(product, line.variantId);
    const sizeEntry = variant?.sizes.find((s) => s.size === line.size);
    if (!product || product.isActive === false || !variant || !sizeEntry) {
      throw new OrderError(`Combo "${combo.name}" is no longer available`);
    }

    const perCombo = Math.max(Math.floor(Number(line.qty)) || 1, 1);
    const key = `${product._id}:${variant._id}:${line.size}`;
    const label = `${product.name} (${pick(variant.color, line.size)})`;

    const need = needs.get(key) || {
      productId: product._id,
      variantId: variant._id,
      size: line.size,
      qty: 0,
      stock: stockOf(sizeEntry.stock),
      label,
    };
    need.qty += perCombo * qty;
    needs.set(key, need);

    parts.push({
      name: product.name,
      color: variant.color || '',
      size: line.size,
      qty: perCombo,
      sku: sizeEntry.sku || product.sku || '',
    });
    owners.add(idStr(product.seller));
  }

  const ops = [];
  for (const n of needs.values()) {
    if (n.stock < n.qty) throw new OrderError(`Combo "${combo.name}" — ${n.label} is out of stock`);
    ops.push({
      type: 'size',
      productId: n.productId,
      variantId: n.variantId,
      size: n.size,
      qty: n.qty,
      label: `Combo "${combo.name}" — ${n.label}`,
    });
  }

  // Combos are single-owner (enforced on save). Older combos: fall back to the products' owner.
  const onlyOwner = owners.size === 1 ? [...owners][0] : '';
  const seller = combo.seller || (onlyOwner ? onlyOwner : null);

  const summary = parts
    .map((p) => `${p.name} (${pick(p.color, p.size)})${p.qty > 1 ? ` x${p.qty}` : ''}`)
    .join(' + ');

  return {
    lineTotal: combo.comboPrice * qty,
    ops,
    orderItem: {
      product: null,
      comboId: combo._id,
      seller,
      name: combo.name,
      sku: combo.sku || '',
      image: combo.images?.[0] || '',
      color: summary, // readable pick-list for packing; full detail is in comboItems
      size: '',
      sleeveType: '',
      zipType: '',
      pantOption: null,
      shawlOption: null,
      price: combo.comboPrice,
      qty,
      isCombo: true,
      comboItems: parts, // add `comboItems: Mixed` to the Order item schema to persist this
    },
  };
}

// ======================= colour pack =======================
function normalizeColorPicks(item) {
  const raw = item.colors ?? item.selectedColors ?? [];
  if (!Array.isArray(raw) || !raw.length) throw new OrderError('Choose the colours for your pack');
  const picks = new Map();
  for (const r of raw) {
    const name = typeof r === 'string' ? r : r?.name ?? r?.color;
    const n = typeof r === 'string' ? 1 : Math.floor(Number(r?.qty ?? r?.quantity ?? 1));
    if (!name || !Number.isFinite(n) || n < 1) throw new OrderError('Invalid colour selection');
    picks.set(name, (picks.get(name) || 0) + n);
  }
  return [...picks].map(([name, qty]) => ({ name, qty }));
}

async function buildColorPackLine(combo, item, qty, getProduct) {
  const base = await getProduct(combo.baseProduct);
  if (!base || base.isActive === false) throw new OrderError(`Combo "${combo.name}" is no longer available`);

  const packSize = Number(item.packSize);
  const pack = (combo.packOptions || []).find((p) => p.size === packSize);
  if (!pack) throw new OrderError(`Choose a pack size for "${combo.name}"`);
  if (!(pack.price > 0)) throw new OrderError(`Combo "${combo.name}" is not set up correctly`);
  if (pack.stock != null && pack.stock < qty) {
    throw new OrderError(`Combo "${combo.name}" — pack of ${packSize} is out of stock`);
  }

  const picks = normalizeColorPicks(item);
  const pieces = picks.reduce((s, p) => s + p.qty, 0);
  if (pieces !== packSize) throw new OrderError(`Choose exactly ${packSize} pieces for "${combo.name}"`);

  const ops = [];
  const sizeNeeds = new Map(); // variant+size  -> pieces needed (shared by several colours)
  const anyNeeds = new Map();  // variant (any size) -> pieces needed

  for (const pick of picks) {
    const color = (combo.colors || []).find((c) => c.name === pick.name);
    if (!color) throw new OrderError(`Colour "${pick.name}" is not available in "${combo.name}"`);

    const need = pick.qty * qty; // pieces of this colour in the whole order line
    const label = `Combo "${combo.name}" — ${color.name}`;

    if (color.stock != null) {
      if (color.stock < need) throw new OrderError(`${label} is out of stock`);
      ops.push({ type: 'colorStock', comboId: combo._id, colorName: color.name, qty: need, label });
    }

    if (color.variantId) {
      const variant = safeVariant(base, color.variantId);
      if (!variant) throw new OrderError(`${label} is no longer available`);

      if (color.size) {
        const entry = variant.sizes.find((s) => s.size === color.size);
        if (!entry) throw new OrderError(`${label} is no longer available`);
        const key = `${variant._id}:${color.size}`;
        const cur = sizeNeeds.get(key) || { variantId: variant._id, size: color.size, qty: 0, stock: stockOf(entry.stock), label };
        cur.qty += need;
        sizeNeeds.set(key, cur);
      } else {
        const key = idStr(variant._id);
        const total = variant.sizes.reduce((s, x) => s + stockOf(x.stock), 0);
        const cur = anyNeeds.get(key) || { variantId: variant._id, qty: 0, stock: total, label };
        cur.qty += need;
        anyNeeds.set(key, cur);
      }
    }
  }

  for (const n of sizeNeeds.values()) {
    if (n.stock < n.qty) throw new OrderError(`${n.label} is out of stock`);
    ops.push({ type: 'size', productId: base._id, variantId: n.variantId, size: n.size, qty: n.qty, label: n.label });
  }
  for (const n of anyNeeds.values()) {
    if (n.stock < n.qty) throw new OrderError(`${n.label} is out of stock`);
    ops.push({ type: 'variantAny', productId: base._id, variantId: n.variantId, qty: n.qty, label: n.label });
  }
  if (pack.stock != null) {
    ops.push({ type: 'packStock', comboId: combo._id, packSize, qty, label: `Combo "${combo.name}" — pack of ${packSize}` });
  }

  return {
    lineTotal: pack.price * qty,
    ops,
    orderItem: {
      product: null,
      comboId: combo._id,
      seller: combo.seller || base.seller || null,
      name: `${combo.name} — Pack of ${packSize}`,
      sku: combo.sku || '',
      image: combo.images?.[0] || '',
      color: picks.map((p) => `${p.name} x${p.qty}`).join(', '),
      size: `Pack of ${packSize}`,
      sleeveType: '',
      zipType: '',
      pantOption: null,
      shawlOption: null,
      price: pack.price, // price per pack
      qty,               // number of packs
      isCombo: true,
      comboPack: { size: packSize, colors: picks }, // add `comboPack: Mixed` to the Order item schema to persist this
    },
  };
}