'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';
const RED = '#B3261E';
const GOLD = '#C9A227';

const input = 'w-full px-3 py-2 text-sm outline-none';
const inputStyle = { border: `1px solid ${LINE}`, color: INK, background: PAPER };

const emptyItem = () => ({ product: '', variantId: '', size: '', qty: 1 });
const emptyColor = () => ({ name: '', hex: '#000000', variantId: '', size: '', stock: '' });
const emptyPack = () => ({ size: '', price: '', originalPrice: '', stock: '' });
const emptyChartRow = () => ({ size: '', chest: '', waist: '', length: '' });

const OPTION_LABELS = { apparel: 'Size', electronics: 'Option', food: 'Pack size', general: 'Option' };
const optLabel = (p) => OPTION_LABELS[p?.productType] || 'Size';
const TYPE_NAMES = { apparel: 'Apparel', electronics: 'Electronics', food: 'Food', general: 'General' };

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || '';
const variantLabel = (v, i) =>
  (v.color || (v.sizes?.length === 1 ? v.sizes[0].size : `Variant ${i + 1}`)) + (v.price ? ` · ₹${v.price}` : '');
const sizeStockOf = (variant, size) => variant?.sizes?.find((s) => s.size === size)?.stock ?? 0;
const productLabel = (p) =>
  `${p.name}${p.sku ? ` (${p.sku})` : ''}${p.productType && p.productType !== 'apparel' ? ` · ${TYPE_NAMES[p.productType] || p.productType}` : ''}`;

/**
 * Shared by the admin panel and the seller panel.
 *   mode        'admin' | 'seller'  — picks the API + product list
 *   comboId     set when editing
 *   initialCombo raw combo (ids or populated docs both work)
 *   onSaved     optional callback(combo); without it the form redirects to /seller/combos
 *   onCancel    optional, shows a Cancel button
 */
export default function ComboForm({ mode = 'seller', comboId, initialCombo, onSaved, onCancel }) {
  const router = useRouter();
  const isEdit = !!comboId;
  const c = initialCombo;
  const api = mode === 'admin' ? '/api/combos' : '/api/seller/combos';
  const productsUrl = mode === 'admin' ? '/api/products?limit=200' : '/api/seller/products?limit=200';

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    type: c?.type || 'multi-product',
    name: c?.name || '',
    description: c?.description || '',
    images: c?.images?.length ? c.images : c?.image ? [c.image] : [],
    comboPrice: c?.comboPrice || '',
    originalPrice: c?.originalPrice || '',
    isActive: c ? c.isActive !== false : true,
    baseProduct: idOf(c?.baseProduct),
  });
  const [items, setItems] = useState(
    c?.products?.length
      ? c.products.map((p) => ({
          product: idOf(p.product),
          variantId: p.variantId || '',
          size: p.size || '',
          qty: p.qty || 1,
        }))
      : [emptyItem(), emptyItem()]
  );
  const [colors, setColors] = useState(
    c?.colors?.length
      ? c.colors.map((x) => ({ name: x.name, hex: x.hex || '#000000', variantId: x.variantId || '', size: x.size || '', stock: x.stock ?? '' }))
      : []
  );
  const [packs, setPacks] = useState(
    c?.packOptions?.length
      ? c.packOptions.map((p) => ({ size: p.size, price: p.price, originalPrice: p.originalPrice || '', stock: p.stock ?? '' }))
      : [emptyPack()]
  );
  const [chart, setChart] = useState(
    c?.sizeChart?.length ? c.sizeChart.map((r) => ({ ...emptyChartRow(), ...r })) : []
  );

  useEffect(() => {
    let alive = true;
    fetch(productsUrl)
      .then((r) => r.json())
      .then((d) => alive && setProducts(d.products || []))
      .catch(() => alive && setError('Could not load products. Refresh and try again.'))
      .finally(() => alive && setProductsLoading(false));
    return () => { alive = false; };
  }, [productsUrl]);

  const prodById = (id) => products.find((p) => p._id === id);
  const upd = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setAt = (setter) => (i, patch) => setter((list) => list.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeAt = (setter) => (i) => setter((list) => list.filter((_, idx) => idx !== i));
  const setItem = setAt(setItems);
  const setColor = setAt(setColors);
  const setPack = setAt(setPacks);
  const setRow = setAt(setChart);

  // ---------- bundle helpers ----------
  function onItemProduct(i, id) {
    const v = prodById(id)?.variants?.length === 1 ? prodById(id).variants[0] : null;
    setItem(i, { product: id, variantId: v?._id || '', size: v?.sizes?.length === 1 ? v.sizes[0].size : '' });
  }
  function onItemVariant(i, variantId) {
    const v = prodById(items[i].product)?.variants?.find((x) => x._id === variantId);
    setItem(i, { variantId, size: v?.sizes?.length === 1 ? v.sizes[0].size : '' });
  }

  const lineInfo = items.map((it) => {
    const p = prodById(it.product);
    const variant = p?.variants?.find((v) => v._id === it.variantId);
    const qty = Math.max(Number(it.qty) || 1, 1);
    const stock = variant && it.size ? sizeStockOf(variant, it.size) : null;
    return { p, variant, qty, stock, price: variant?.price ?? p?.basePrice ?? 0 };
  });
  const itemsTotal = lineInfo.reduce((sum, l) => sum + (l.p ? l.price * l.qty : 0), 0);
  const known = lineInfo.filter((l) => l.stock !== null);
  const sellable = known.length ? Math.min(...known.map((l) => Math.floor(l.stock / l.qty))) : null;
  const comboPriceNum = Number(form.comboPrice) || 0;

  // ---------- colour-pack helpers ----------
  const base = prodById(form.baseProduct);
  const baseHasColors = !base || (base.variants || []).some((v) => v.color);
  const baseIsApparel = !base || !base.productType || base.productType === 'apparel';
  const entryWord = baseHasColors ? 'Colour' : 'Option';
  function importColors(p = base) {
    if (!p) return;
    const hasColors = (p.variants || []).some((v) => v.color);
    setColors(
      hasColors
        ? (p.variants || []).map((v, i) => ({
            name: v.color || `Variant ${i + 1}`,
            hex: v.colorHex || '#000000',
            variantId: v._id,
            size: v.sizes?.length === 1 ? v.sizes[0].size : '',
            stock: '',
          }))
        : // no colours on this product (food, many electronics): one entry per option
          (p.variants || []).flatMap((v) =>
            (v.sizes || []).map((sz) => ({ name: sz.size, hex: '', variantId: v._id, size: sz.size, stock: '' }))
          )
    );
  }
  function onBaseChange(id) {
    upd('baseProduct', id);
    const p = prodById(id);
    if (p && colors.every((x) => !x.name)) importColors(p);
  }
  function onColorVariant(i, variantId) {
    const v = base?.variants?.find((x) => x._id === variantId);
    setColor(i, { variantId, size: v?.sizes?.length === 1 ? v.sizes[0].size : '' });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      type: form.type,
      name: form.name,
      description: form.description,
      images: form.images,
      isActive: form.isActive,
      ...(form.type === 'multi-product'
        ? {
            products: items.map((it) => ({
              product: it.product,
              variantId: it.variantId,
              size: it.size,
              qty: Number(it.qty) || 1,
            })),
            comboPrice: Number(form.comboPrice) || 0,
            originalPrice: Number(form.originalPrice) || 0,
          }
        : {
            baseProduct: form.baseProduct,
            colors,
            packOptions: packs,
            sizeChart: chart,
          }),
    };

    try {
      const res = await fetch(isEdit ? `${api}/${comboId}` : api, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to save combo.');
        setSaving(false);
        return;
      }
      if (onSaved) {
        onSaved(data.combo);
        setSaving(false);
      } else {
        router.push('/seller/combos');
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  const multi = form.type === 'multi-product';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8 max-w-3xl">
      {error && (
        <div className="px-4 py-3 text-[13px]" role="alert" style={{ background: '#FCE8E6', color: RED }}>{error}</div>
      )}

      {/* Type */}
      <Section title="Combo type">
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            ['multi-product', 'Product bundle', 'Different products (or several of one) sold together at one price.'],
            ['color-pack', 'Multi-pack', 'One product sold in packs (e.g. 5 or 10 pieces), customers pick the colours or options.'],
          ].map(([value, label, hint]) => (
            <label
              key={value}
              className="p-3 cursor-pointer"
              style={{ border: `1px solid ${form.type === value ? INK : LINE}` }}
            >
              <span className="flex items-center gap-2 text-[13px]" style={{ color: INK }}>
                <input type="radio" name="type" checked={form.type === value} onChange={() => upd('type', value)} disabled={isEdit} />
                {label}
              </span>
              <span className="block text-[11px] mt-1" style={{ color: INK_SOFT }}>{hint}</span>
            </label>
          ))}
        </div>
        {isEdit && <p className="text-[11px] mt-2" style={{ color: INK_SOFT }}>The type can&apos;t be changed after the combo is created.</p>}
      </Section>

      <Section title="Basic details">
        <Field label="Combo name">
          <input className={input} style={inputStyle} required maxLength={120} value={form.name} onChange={(e) => upd('name', e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className={input} style={inputStyle} rows={3} value={form.description} onChange={(e) => upd('description', e.target.value)} />
        </Field>
        <Field label="Images">
          <ImageUploader value={form.images} onChange={(v) => upd('images', v)} />
        </Field>
        <label className="flex items-center gap-2 text-[13px]" style={{ color: INK }}>
          <input type="checkbox" checked={form.isActive} onChange={(e) => upd('isActive', e.target.checked)} />
          Active (visible on site)
        </label>
      </Section>

      {productsLoading && <p className="text-[12px]" style={{ color: INK_SOFT }}>Loading products…</p>}

      {/* ---------- product bundle ---------- */}
      {multi && (
        <>
          <Section title="Products in this combo">
            <p className="text-[11px] mb-3" style={{ color: INK_SOFT }}>
              Each line is one exact variant and size / option / pack size, and the quantity of it in <b>one</b> combo.
              You can mix product types (e.g. a snack box with a gadget). Stock is checked and reduced from that
              entry every time the combo sells.
              {mode === 'seller' ? ' Only your own products appear here.' : ' All products must belong to the same seller.'}
            </p>

            {items.map((it, i) => {
              const { p, variant, qty, stock } = lineInfo[i];
              const missing = it.product && !productsLoading && !p;
              return (
                <div key={i} className="p-3 mb-3" style={{ border: `1px solid ${LINE}` }}>
                  <div className="grid sm:grid-cols-4 gap-2 items-start">
                    <select className={`${input} sm:col-span-2`} style={inputStyle} required value={it.product} onChange={(e) => onItemProduct(i, e.target.value)}>
                      <option value="">Select product…</option>
                      {products.map((x) => <option key={x._id} value={x._id}>{productLabel(x)}</option>)}
                    </select>
                    <select className={input} style={inputStyle} required disabled={!p} value={it.variantId} onChange={(e) => onItemVariant(i, e.target.value)}>
                      <option value="">{p ? 'Variant…' : '—'}</option>
                      {(p?.variants || []).map((v, vi) => <option key={v._id} value={v._id}>{variantLabel(v, vi)}</option>)}
                    </select>
                    <select className={input} style={inputStyle} required disabled={!variant} value={it.size} onChange={(e) => setItem(i, { size: e.target.value })}>
                      <option value="">{variant ? `${optLabel(p)}…` : '—'}</option>
                      {(variant?.sizes || []).map((s) => <option key={s.size} value={s.size}>{s.size} ({s.stock ?? 0} in stock)</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[12px]" style={{ color: INK_SOFT }}>
                    <label className="flex items-center gap-1">
                      Qty per combo
                      <input type="number" min="1" max="50" className="w-16 px-2 py-1 text-sm outline-none" style={inputStyle} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} />
                    </label>
                    {stock !== null && (
                      <span style={{ color: stock < qty ? RED : INK_SOFT }}>
                        {stock < qty ? `Only ${stock} in stock — not enough for one combo` : `${stock} in stock → ${Math.floor(stock / qty)} combos`}
                      </span>
                    )}
                    {missing && <span style={{ color: RED }}>This product isn&apos;t in your list (inactive or removed).</span>}
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeAt(setItems)(i)} className="ml-auto" style={{ color: RED }}>Remove</button>
                    )}
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => setItems((l) => [...l, emptyItem()])} className="text-[12px] underline" style={{ color: INK }}>
              + Add product
            </button>
            {sellable !== null && (
              <p className="text-[12px] mt-3" style={{ color: sellable > 0 ? INK : RED }}>
                {sellable > 0 ? `Right now you can sell ${sellable} of this combo.` : 'This combo is currently out of stock.'}
              </p>
            )}
          </Section>

          <Section title="Pricing">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Combo price (₹)">
                <input type="number" min="1" className={input} style={inputStyle} required value={form.comboPrice} onChange={(e) => upd('comboPrice', e.target.value)} />
              </Field>
              <Field label="Original price (₹, optional)">
                <input type="number" min="0" className={input} style={inputStyle} value={form.originalPrice} onChange={(e) => upd('originalPrice', e.target.value)} />
              </Field>
            </div>
            {itemsTotal > 0 && (
              <p className="text-[11px]" style={{ color: INK_SOFT }}>
                The selected items add up to ₹{itemsTotal}
                {comboPriceNum > 0 && itemsTotal > comboPriceNum ? ` — customers save ₹${itemsTotal - comboPriceNum}.` : '.'}{' '}
                <button type="button" className="underline" onClick={() => upd('originalPrice', itemsTotal)}>Use as original price</button>
                {' '}(left blank, this is filled in automatically).
              </p>
            )}
          </Section>
        </>
      )}

      {/* ---------- colour pack ---------- */}
      {!multi && (
        <>
          <Section title="Base product">
            <select className={input} style={inputStyle} required value={form.baseProduct} onChange={(e) => onBaseChange(e.target.value)}>
              <option value="">Select product…</option>
              {products.map((x) => <option key={x._id} value={x._id}>{productLabel(x)}</option>)}
            </select>
          </Section>

          <Section title={`${entryWord}s`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px]" style={{ color: INK_SOFT }}>
                Link each entry to a variant of the product so its stock is checked and reduced. An entry with no link needs its own stock number.
              </p>
              {base && (
                <button type="button" onClick={() => importColors()} className="text-[12px] underline shrink-0 ml-3" style={{ color: INK }}>
                  Import from product
                </button>
              )}
            </div>
            {colors.map((x, i) => {
              const variant = base?.variants?.find((v) => v._id === x.variantId);
              const live = variant ? (x.size ? sizeStockOf(variant, x.size) : (variant.sizes || []).reduce((s, z) => s + (z.stock || 0), 0)) : null;
              return (
                <div key={i} className="p-3 mb-3" style={{ border: `1px solid ${LINE}` }}>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
                    <input className={`${input} sm:col-span-2`} style={inputStyle} placeholder={`${entryWord} name`} value={x.name} onChange={(e) => setColor(i, { name: e.target.value })} />
                    <input type="color" aria-label="Colour swatch" hidden={!baseHasColors} className="w-full h-[38px]" style={{ border: `1px solid ${LINE}` }} value={x.hex || '#000000'} onChange={(e) => setColor(i, { hex: e.target.value })} />
                    <select className={input} style={inputStyle} value={x.variantId} onChange={(e) => onColorVariant(i, e.target.value)}>
                      <option value="">No variant link</option>
                      {(base?.variants || []).map((v, vi) => <option key={v._id} value={v._id}>{variantLabel(v, vi)}</option>)}
                    </select>
                    <select className={input} style={inputStyle} value={x.size} disabled={!variant} onChange={(e) => setColor(i, { size: e.target.value })}>
                      <option value="">Any {optLabel(base).toLowerCase()}</option>
                      {(variant?.sizes || []).map((s) => <option key={s.size} value={s.size}>{s.size} ({s.stock ?? 0})</option>)}
                    </select>
                    <div className="flex gap-2 items-center">
                      <input type="number" min="0" className={input} style={inputStyle} placeholder="Extra cap" title="Optional: limit how many pieces of this colour can be sold" value={x.stock} onChange={(e) => setColor(i, { stock: e.target.value })} />
                      <button type="button" onClick={() => removeAt(setColors)(i)} style={{ color: RED }} className="text-[12px]" aria-label="Remove colour">×</button>
                    </div>
                  </div>
                  {live !== null && <p className="text-[11px] mt-1" style={{ color: INK_SOFT }}>Live stock from the product: {live} pieces</p>}
                  {!x.variantId && x.name && x.stock === '' && <p className="text-[11px] mt-1" style={{ color: RED }}>Link a variant or enter a stock number.</p>}
                </div>
              );
            })}
            <button type="button" onClick={() => setColors((l) => [...l, emptyColor()])} className="text-[12px] underline" style={{ color: INK }}>
              + Add {entryWord.toLowerCase()}
            </button>
          </Section>

          <Section title="Pack options">
            <p className="text-[11px] mb-2" style={{ color: INK_SOFT }}>
              Pieces per pack and the price of that pack. Leave stock blank for unlimited packs (colour stock still applies).
            </p>
            {packs.map((p, i) => (
              <div key={i} className="p-3 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center" style={{ border: `1px solid ${LINE}` }}>
                <input type="number" min="1" className={input} style={inputStyle} placeholder="Pieces (e.g. 5)" value={p.size} onChange={(e) => setPack(i, { size: e.target.value })} />
                <input type="number" min="1" className={input} style={inputStyle} placeholder="Pack price ₹" value={p.price} onChange={(e) => setPack(i, { price: e.target.value })} />
                <input type="number" min="0" className={input} style={inputStyle} placeholder="Original price ₹" value={p.originalPrice} onChange={(e) => setPack(i, { originalPrice: e.target.value })} />
                <div className="flex gap-2 items-center">
                  <input type="number" min="0" className={input} style={inputStyle} placeholder="Packs in stock" value={p.stock} onChange={(e) => setPack(i, { stock: e.target.value })} />
                  {packs.length > 1 && (
                    <button type="button" onClick={() => removeAt(setPacks)(i)} style={{ color: RED }} className="text-[12px]" aria-label="Remove pack option">×</button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setPacks((l) => [...l, emptyPack()])} className="text-[12px] underline" style={{ color: INK }}>
              + Add pack option
            </button>
          </Section>

          {baseIsApparel && (
          <Section title="Size chart (optional)">
            {chart.map((r, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-center">
                {['size', 'chest', 'waist', 'length'].map((k) => (
                  <input key={k} className={input} style={inputStyle} placeholder={k[0].toUpperCase() + k.slice(1)} value={r[k]} onChange={(e) => setRow(i, { [k]: e.target.value })} />
                ))}
                <button type="button" onClick={() => removeAt(setChart)(i)} style={{ color: RED }} className="text-[12px]" aria-label="Remove row">×</button>
              </div>
            ))}
            <button type="button" onClick={() => setChart((l) => [...l, emptyChartRow()])} className="text-[12px] underline" style={{ color: INK }}>
              + Add row
            </button>
          </Section>
          )}
        </>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 text-[13px] tracking-[1.5px] uppercase"
          style={{ background: INK, color: PAPER, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Combo'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-6 py-3 text-[13px] tracking-[1.5px] uppercase" style={{ border: `1px solid ${INK}`, color: INK }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/* ---------- helpers ---------- */

// `value` is an ARRAY of URLs. (The old comma-joined string broke any URL containing a comma.)
function ImageUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pasted, setPasted] = useState('');
  const urls = value || [];

  async function onFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    setUploadError('');
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'combos');
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploaded.push(data.url);
      } catch (err) {
        setUploadError(`${file.name}: ${err.message}`);
      }
    }
    if (uploaded.length) onChange([...urls, ...uploaded]);
    setUploading(false);
  }

  function addPasted() {
    const url = pasted.trim();
    if (!url) return;
    onChange([...urls, url]);
    setPasted('');
  }

  const makeCover = (i) => onChange([urls[i], ...urls.filter((_, idx) => idx !== i)]);

  return (
    <div>
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {urls.map((url, i) => (
            <div key={url + i} className="relative" style={{ width: 80, height: 80, border: `1px solid ${i === 0 ? GOLD : LINE}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, idx) => idx !== i))}
                className="absolute top-0 right-0 w-5 h-5 text-[12px] leading-none"
                style={{ background: INK, color: PAPER }}
                aria-label="Remove image"
              >×</button>
              {i === 0 ? (
                <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center py-0.5" style={{ background: GOLD, color: INK }}>Cover</span>
              ) : (
                <button type="button" onClick={() => makeCover(i)} className="absolute bottom-0 left-0 right-0 text-[9px] text-center py-0.5" style={{ background: 'rgba(0,0,0,.65)', color: PAPER }}>
                  Make cover
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <label
        className="inline-block px-3 py-2 text-[12px] tracking-[1px] uppercase cursor-pointer"
        style={{ border: `1px solid ${INK}`, color: INK, opacity: uploading ? 0.6 : 1 }}
      >
        {uploading ? 'Uploading...' : 'Upload Images'}
        <input type="file" accept="image/*" multiple onChange={onFiles} disabled={uploading} className="hidden" />
      </label>
      <div className="flex gap-2 mt-2">
        <input
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPasted(); } }}
          className="flex-1 px-3 py-2 text-sm outline-none"
          style={inputStyle}
          placeholder="or paste one image URL"
        />
        <button type="button" onClick={addPasted} className="px-3 text-[12px] uppercase" style={{ border: `1px solid ${INK}`, color: INK }}>Add</button>
      </div>
      {uploadError && <p className="text-[12px] mt-1" style={{ color: RED }}>{uploadError}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-[13px] tracking-[1.5px] uppercase mb-3" style={{ color: INK }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] tracking-[1px] uppercase mb-1" style={{ color: INK_SOFT }}>{label}</label>
      {children}
    </div>
  );
}