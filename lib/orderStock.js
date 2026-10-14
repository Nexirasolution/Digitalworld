import mongoose from 'mongoose';
import Product from '@/models/Product';
import Combo from '@/models/Combo';
import { OrderError } from '@/lib/orderErrors';

export class StockError extends OrderError {}

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const soldOut = (op) => new StockError(`${op.label || 'An item'} is out of stock`);

/*
 * Stock operations (produced by buildOrderItemsAndTotals as `stockUpdateItems`):
 *   { type: 'size',       productId, variantId, size, qty, label }
 *   { type: 'variantAny', productId, variantId, qty, label }   // any size of a variant
 *   { type: 'pant' | 'shawl', productId, optionId, qty, label }
 *   { type: 'packStock',  comboId, packSize, qty, label }       // only when pack.stock != null
 *   { type: 'colorStock', comboId, colorName, qty, label }      // only when colour.stock != null
 *
 * Every decrement is a single conditional update ("only if stock >= qty"), so two
 * shoppers can never take the last unit twice, even when checking out at once.
 */

async function decrement(op) {
  const qty = op.qty;
  let r;

  switch (op.type) {
    case 'size':
      r = await Product.updateOne(
        {
          _id: oid(op.productId),
          variants: {
            $elemMatch: {
              _id: oid(op.variantId),
              sizes: { $elemMatch: { size: op.size, stock: { $gte: qty } } },
            },
          },
        },
        { $inc: { 'variants.$[v].sizes.$[s].stock': -qty, soldCount: qty } },
        { arrayFilters: [{ 'v._id': oid(op.variantId) }, { 's.size': op.size }] }
      );
      if (r.modifiedCount !== 1) throw soldOut(op);
      return;

    case 'pant':
    case 'shawl': {
      const field = op.type === 'pant' ? 'pantOptions' : 'shawlOptions';
      r = await Product.updateOne(
        { _id: oid(op.productId), [field]: { $elemMatch: { _id: oid(op.optionId), stock: { $gte: qty } } } },
        { $inc: { [`${field}.$[o].stock`]: -qty } },
        { arrayFilters: [{ 'o._id': oid(op.optionId) }] }
      );
      if (r.modifiedCount !== 1) throw soldOut(op);
      return;
    }

    case 'packStock':
      // matches when stock is null (unlimited) OR enough; $inc only touches finite stock
      r = await Combo.updateOne(
        {
          _id: oid(op.comboId),
          packOptions: { $elemMatch: { size: op.packSize, $or: [{ stock: null }, { stock: { $gte: qty } }] } },
        },
        { $inc: { 'packOptions.$[p].stock': -qty } },
        { arrayFilters: [{ 'p.size': op.packSize, 'p.stock': { $ne: null, $gte: qty } }] }
      );
      if (r.matchedCount !== 1) throw soldOut(op);
      return;

    case 'colorStock':
      r = await Combo.updateOne(
        {
          _id: oid(op.comboId),
          colors: { $elemMatch: { name: op.colorName, $or: [{ stock: null }, { stock: { $gte: qty } }] } },
        },
        { $inc: { 'colors.$[c].stock': -qty } },
        { arrayFilters: [{ 'c.name': op.colorName, 'c.stock': { $ne: null, $gte: qty } }] }
      );
      if (r.matchedCount !== 1) throw soldOut(op);
      return;

    default:
      throw new Error(`Unknown stock operation: ${op.type}`);
  }
}

async function increment(op) {
  const qty = op.qty;

  switch (op.type) {
    case 'size':
      await Product.updateOne(
        { _id: oid(op.productId) },
        { $inc: { 'variants.$[v].sizes.$[s].stock': qty, soldCount: -qty } },
        { arrayFilters: [{ 'v._id': oid(op.variantId) }, { 's.size': op.size }] }
      );
      return;

    case 'pant':
    case 'shawl': {
      const field = op.type === 'pant' ? 'pantOptions' : 'shawlOptions';
      await Product.updateOne(
        { _id: oid(op.productId) },
        { $inc: { [`${field}.$[o].stock`]: qty } },
        { arrayFilters: [{ 'o._id': oid(op.optionId) }] }
      );
      return;
    }

    case 'packStock':
      await Combo.updateOne(
        { _id: oid(op.comboId) },
        { $inc: { 'packOptions.$[p].stock': qty } },
        { arrayFilters: [{ 'p.size': op.packSize, 'p.stock': { $ne: null } }] }
      );
      return;

    case 'colorStock':
      await Combo.updateOne(
        { _id: oid(op.comboId) },
        { $inc: { 'colors.$[c].stock': qty } },
        { arrayFilters: [{ 'c.name': op.colorName, 'c.stock': { $ne: null } }] }
      );
      return;

    default:
      return; // variantAny is never stored as applied — it is expanded into 'size' ops
  }
}

// "Any size" colours: take pieces from whichever sizes of the variant still have stock.
async function allocateAnySize(op) {
  const product = await Product.findById(op.productId).select('variants').lean();
  const variant = product?.variants?.find((v) => String(v._id) === String(op.variantId));
  if (!variant) throw soldOut(op);

  let remaining = op.qty;
  const done = [];
  try {
    for (const s of variant.sizes || []) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Math.max(Number(s.stock) || 0, 0));
      if (take <= 0) continue;
      const sub = {
        type: 'size',
        productId: op.productId,
        variantId: op.variantId,
        size: s.size,
        qty: take,
        label: op.label,
      };
      try {
        await decrement(sub);
      } catch (err) {
        if (err instanceof StockError) continue; // someone else took it — try the next size
        throw err;
      }
      done.push(sub);
      remaining -= take;
    }
    if (remaining > 0) throw soldOut(op);
    return done;
  } catch (err) {
    await restoreStock(done);
    throw err;
  }
}

/**
 * Reserves (decrements) stock for every op. If any op fails, everything already
 * taken is put back and a StockError (an OrderError) is thrown.
 * Returns the list of concrete ops that were applied — store it on the order
 * (e.g. order.stockOps) so cancellations can call restoreStock(order.stockOps).
 */
export async function reserveStock(ops) {
  const applied = [];
  try {
    for (const op of ops || []) {
      if (op.type === 'variantAny') {
        applied.push(...(await allocateAnySize(op)));
      } else {
        await decrement(op);
        applied.push(op);
      }
    }
    return applied;
  } catch (err) {
    await restoreStock(applied).catch((e) => console.error('Stock rollback failed:', e));
    throw err;
  }
}

/** Puts stock back (failed payment, cancelled / returned order, rollback). */
export async function restoreStock(ops) {
  for (const op of [...(ops || [])].reverse()) {
    await increment(op);
  }
}