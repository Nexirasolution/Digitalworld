'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';
const RED = '#B3261E';

const SLEEVE_OPTIONS = ['Full Sleeve', 'Half Sleeve', 'Elbow Sleeve', 'Sleeveless'];
const ZIP_OPTIONS = ['With Zip', 'Without Zip'];

function emptyVariant() {
  return { color: '', colorHex: '#000000', price: '', compareAtPrice: '', images: '', sizes: [{ size: '', stock: '' }] };
}
function emptyAddon() {
  return { name: '', image: '', price: '', stock: '', sku: '' };
}

export default function ProductForm({ productId, initialProduct }) {
  const router = useRouter();
  const isEdit = !!productId;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    fabric: '',
    tags: '',
    isReadyToShip: false,
    sizeChart: '',
    sleeveOptions: [],
    zipOptions: [],
  });
  const [variants, setVariants] = useState([emptyVariant()]);
  const [pantOptions, setPantOptions] = useState([]);
  const [shawlOptions, setShawlOptions] = useState([]);

  // Load category list — flattened with parent context for the <select>.
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.topLevel || []))
      .catch(() => {});
  }, []);

  // Populate form from an existing product (edit mode).
  useEffect(() => {
    if (!initialProduct) {
      setLoading(false);
      return;
    }
    const p = initialProduct;
    setForm({
      name: p.name || '',
      category: p.category?._id || p.category || '',
      description: p.description || '',
      fabric: p.fabric || '',
      tags: (p.tags || []).join(', '),
      isReadyToShip: !!p.isReadyToShip,
      sizeChart: (p.sizeChart || []).join(', '),
      sleeveOptions: p.sleeveOptions || [],
      zipOptions: p.zipOptions || [],
    });
    setVariants(
      (p.variants || []).map((v) => ({
        _id: v._id,
        color: v.color || '',
        colorHex: v.colorHex || '#000000',
        price: v.price ?? '',
        compareAtPrice: v.compareAtPrice ?? '',
        images: (v.images || []).join(', '),
        sizes: (v.sizes || []).map((s) => ({ size: s.size || '', stock: s.stock ?? '' })),
      })) || [emptyVariant()]
    );
    setPantOptions(
      (p.pantOptions || []).map((o) => ({
        _id: o._id, name: o.name || '', image: o.image || '', price: o.price ?? '', stock: o.stock ?? '', sku: o.sku || '',
      }))
    );
    setShawlOptions(
      (p.shawlOptions || []).map((o) => ({
        _id: o._id, name: o.name || '', image: o.image || '', price: o.price ?? '', stock: o.stock ?? '', sku: o.sku || '',
      }))
    );
    setLoading(false);
  }, [initialProduct]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function toggleListValue(key, value) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  }

  function updateVariant(i, key, value) {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, [key]: value } : v)));
  }
  function addVariant() {
    setVariants((vs) => [...vs, emptyVariant()]);
  }
  function removeVariant(i) {
    setVariants((vs) => vs.filter((_, idx) => idx !== i));
  }

  function updateSize(vi, si, key, value) {
    setVariants((vs) =>
      vs.map((v, idx) =>
        idx === vi ? { ...v, sizes: v.sizes.map((s, sidx) => (sidx === si ? { ...s, [key]: value } : s)) } : v
      )
    );
  }
  function addSize(vi) {
    setVariants((vs) => vs.map((v, idx) => (idx === vi ? { ...v, sizes: [...v.sizes, { size: '', stock: '' }] } : v)));
  }
  function removeSize(vi, si) {
    setVariants((vs) =>
      vs.map((v, idx) => (idx === vi ? { ...v, sizes: v.sizes.filter((_, sidx) => sidx !== si) } : v))
    );
  }

  function updateAddon(setter, i, key, value) {
    setter((list) => list.map((o, idx) => (idx === i ? { ...o, [key]: value } : o)));
  }
  function addAddon(setter) {
    setter((list) => [...list, emptyAddon()]);
  }
  function removeAddon(setter, i) {
    setter((list) => list.filter((_, idx) => idx !== i));
  }

  function flattenCategoryOptions() {
    const opts = [];
    for (const cat of categories) {
      opts.push({ id: cat._id, label: cat.name });
      for (const sub of cat.subcategories || []) {
        opts.push({ id: sub._id, label: `${cat.name} — ${sub.name}` });
      }
    }
    return opts;
  }

  function buildPayload() {
    const cleanVariants = variants.map((v) => ({
      ...(v._id ? { _id: v._id } : {}),
      color: v.color,
      colorHex: v.colorHex,
      price: Number(v.price) || 0,
      compareAtPrice: Number(v.compareAtPrice) || 0,
      images: v.images.split(',').map((s) => s.trim()).filter(Boolean),
      sizes: v.sizes
        .filter((s) => s.size)
        .map((s) => ({ size: s.size, stock: Number(s.stock) || 0 })),
    }));

    const cleanAddons = (list) =>
      list
        .filter((o) => o.name)
        .map((o) => ({
          ...(o._id ? { _id: o._id } : {}),
          name: o.name,
          image: o.image,
          price: Number(o.price) || 0,
          stock: Number(o.stock) || 0,
          sku: o.sku,
        }));

    return {
      name: form.name,
      category: form.category,
      description: form.description,
      fabric: form.fabric,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      isReadyToShip: form.isReadyToShip,
      sizeChart: form.sizeChart.split(',').map((s) => s.trim()).filter(Boolean),
      sleeveOptions: form.sleeveOptions,
      zipOptions: form.zipOptions,
      variants: cleanVariants,
      pantOptions: cleanAddons(pantOptions),
      shawlOptions: cleanAddons(shawlOptions),
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.category) {
      setError('Product name and category are required.');
      return;
    }
    if (!variants.length || variants.every((v) => !v.price)) {
      setError('At least one variant with a price is required.');
      return;
    }

    setSaving(true);
    const payload = buildPayload();

    const res = await fetch(isEdit ? `/api/products/${productId}` : '/api/products', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Failed to save product.');
      return;
    }

    router.push('/seller/products');
  }

  if (loading) {
    return <div className="text-[13px]" style={{ color: INK_SOFT }}>Loading...</div>;
  }

  const categoryOptions = flattenCategoryOptions();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8 max-w-3xl">
      {error && (
        <div className="px-4 py-3 text-[13px]" style={{ background: '#FCE8E6', color: RED }}>
          {error}
        </div>
      )}

      {/* Basic info */}
      <Section title="Basic Details">
        <Field label="Product Name">
          <input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full px-3 py-2.5 text-sm outline-none"
            style={{ border: `1px solid ${LINE}`, color: INK }}
            required
          />
        </Field>

        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="w-full px-3 py-2.5 text-sm outline-none"
            style={{ border: `1px solid ${LINE}`, color: INK }}
            required
          >
            <option value="">Select a category</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 text-sm outline-none"
            style={{ border: `1px solid ${LINE}`, color: INK }}
          />
        </Field>

        <Field label="Fabric">
          <input
            value={form.fabric}
            onChange={(e) => updateField('fabric', e.target.value)}
            className="w-full px-3 py-2.5 text-sm outline-none"
            style={{ border: `1px solid ${LINE}`, color: INK }}
            placeholder="e.g. Pure Cotton"
          />
        </Field>

        <Field label="Tags (comma separated)">
          <input
            value={form.tags}
            onChange={(e) => updateField('tags', e.target.value)}
            className="w-full px-3 py-2.5 text-sm outline-none"
            style={{ border: `1px solid ${LINE}`, color: INK }}
            placeholder="e.g. festive, cotton, casual"
          />
        </Field>

        <Field label="Size Chart Images (comma separated URLs, optional)">
          <input
            value={form.sizeChart}
            onChange={(e) => updateField('sizeChart', e.target.value)}
            className="w-full px-3 py-2.5 text-sm outline-none"
            style={{ border: `1px solid ${LINE}`, color: INK }}
            placeholder="https://... , https://..."
          />
          <p className="text-[11px] mt-1" style={{ color: INK_SOFT }}>
            Leave blank to fall back to the category&apos;s own size chart.
          </p>
        </Field>

        <label className="flex items-center gap-2 text-[13px]" style={{ color: INK }}>
          <input
            type="checkbox"
            checked={form.isReadyToShip}
            onChange={(e) => updateField('isReadyToShip', e.target.checked)}
          />
          Ready to Ship
        </label>
      </Section>

      {/* Sleeve / Zip options */}
      <Section title="Sleeve & Zip Options (optional)">
        <p className="text-[11px] mb-2" style={{ color: INK_SOFT }}>
          If any are selected, the customer must choose one before adding to cart.
        </p>
        <div className="flex flex-wrap gap-4 mb-4">
          {SLEEVE_OPTIONS.map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-[13px]" style={{ color: INK }}>
              <input
                type="checkbox"
                checked={form.sleeveOptions.includes(opt)}
                onChange={() => toggleListValue('sleeveOptions', opt)}
              />
              {opt}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {ZIP_OPTIONS.map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-[13px]" style={{ color: INK }}>
              <input
                type="checkbox"
                checked={form.zipOptions.includes(opt)}
                onChange={() => toggleListValue('zipOptions', opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </Section>

      {/* Variants */}
      <Section title="Variants (color, price, sizes)">
        {variants.map((v, vi) => (
          <div key={vi} className="p-4 mb-4" style={{ border: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] tracking-wide uppercase" style={{ color: INK_SOFT }}>
                Variant {vi + 1}
              </span>
              {variants.length > 1 && (
                <button type="button" onClick={() => removeVariant(vi)} style={{ color: RED }} className="text-[12px]">
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Color Name">
                <input
                  value={v.color}
                  onChange={(e) => updateVariant(vi, 'color', e.target.value)}
                  className="w-full px-3 py-2 text-sm outline-none"
                  style={{ border: `1px solid ${LINE}`, color: INK }}
                />
              </Field>
              <Field label="Color Swatch">
                <input
                  type="color"
                  value={v.colorHex}
                  onChange={(e) => updateVariant(vi, 'colorHex', e.target.value)}
                  className="w-full h-[38px]"
                  style={{ border: `1px solid ${LINE}` }}
                />
              </Field>
              <Field label="Price (₹)">
                <input
                  type="number"
                  value={v.price}
                  onChange={(e) => updateVariant(vi, 'price', e.target.value)}
                  className="w-full px-3 py-2 text-sm outline-none"
                  style={{ border: `1px solid ${LINE}`, color: INK }}
                  required
                />
              </Field>
              <Field label="Compare-At Price (₹, optional)">
                <input
                  type="number"
                  value={v.compareAtPrice}
                  onChange={(e) => updateVariant(vi, 'compareAtPrice', e.target.value)}
                  className="w-full px-3 py-2 text-sm outline-none"
                  style={{ border: `1px solid ${LINE}`, color: INK }}
                />
              </Field>
            </div>

            <Field label="Images (comma separated URLs)">
              <input
                value={v.images}
                onChange={(e) => updateVariant(vi, 'images', e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none"
                style={{ border: `1px solid ${LINE}`, color: INK }}
                placeholder="https://... , https://..."
              />
            </Field>

            <div className="mt-3">
              <span className="text-[11px] tracking-[1px] uppercase" style={{ color: INK_SOFT }}>Sizes & Stock</span>
              {v.sizes.map((s, si) => (
                <div key={si} className="flex gap-2 mt-2 items-center">
                  <input
                    value={s.size}
                    onChange={(e) => updateSize(vi, si, 'size', e.target.value)}
                    placeholder="Size (e.g. M)"
                    className="px-3 py-2 text-sm outline-none w-24"
                    style={{ border: `1px solid ${LINE}`, color: INK }}
                  />
                  <input
                    type="number"
                    value={s.stock}
                    onChange={(e) => updateSize(vi, si, 'stock', e.target.value)}
                    placeholder="Stock"
                    className="px-3 py-2 text-sm outline-none w-28"
                    style={{ border: `1px solid ${LINE}`, color: INK }}
                  />
                  {v.sizes.length > 1 && (
                    <button type="button" onClick={() => removeSize(vi, si)} style={{ color: RED }} className="text-[12px]">
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addSize(vi)}
                className="text-[12px] mt-2 underline"
                style={{ color: INK }}
              >
                + Add Size
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addVariant} className="text-[12px] underline" style={{ color: INK }}>
          + Add Variant
        </button>
      </Section>

      {/* Pant add-ons */}
      <AddonSection
        title="Pant Add-ons (optional)"
        items={pantOptions}
        setter={setPantOptions}
        onUpdate={(i, key, value) => updateAddon(setPantOptions, i, key, value)}
        onAdd={() => addAddon(setPantOptions)}
        onRemove={(i) => removeAddon(setPantOptions, i)}
      />

      {/* Shawl add-ons */}
      <AddonSection
        title="Shawl Add-ons (optional)"
        items={shawlOptions}
        setter={setShawlOptions}
        onUpdate={(i, key, value) => updateAddon(setShawlOptions, i, key, value)}
        onAdd={() => addAddon(setShawlOptions)}
        onRemove={(i) => removeAddon(setShawlOptions, i)}
      />

      <button
        type="submit"
        disabled={saving}
        className="py-3 text-[13px] tracking-[1.5px] uppercase"
        style={{ background: INK, color: PAPER, opacity: saving ? 0.6 : 1 }}
      >
        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
      </button>
    </form>
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
      <label className="block text-[11px] tracking-[1px] uppercase mb-1" style={{ color: INK_SOFT }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function AddonSection({ title, items, onUpdate, onAdd, onRemove }) {
  return (
    <Section title={title}>
      {items.map((o, i) => (
        <div key={i} className="p-4 mb-3" style={{ border: `1px solid ${LINE}` }}>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <Field label="Name">
              <input
                value={o.name}
                onChange={(e) => onUpdate(i, 'name', e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none"
                style={{ border: `1px solid ${LINE}`, color: INK }}
              />
            </Field>
            <Field label="Extra Price (₹)">
              <input
                type="number"
                value={o.price}
                onChange={(e) => onUpdate(i, 'price', e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none"
                style={{ border: `1px solid ${LINE}`, color: INK }}
              />
            </Field>
            <Field label="Stock">
              <input
                type="number"
                value={o.stock}
                onChange={(e) => onUpdate(i, 'stock', e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none"
                style={{ border: `1px solid ${LINE}`, color: INK }}
              />
            </Field>
            <Field label="SKU (optional)">
              <input
                value={o.sku}
                onChange={(e) => onUpdate(i, 'sku', e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none"
                style={{ border: `1px solid ${LINE}`, color: INK }}
              />
            </Field>
          </div>
          <Field label="Image URL (optional)">
            <input
              value={o.image}
              onChange={(e) => onUpdate(i, 'image', e.target.value)}
              className="w-full px-3 py-2 text-sm outline-none"
              style={{ border: `1px solid ${LINE}`, color: INK }}
            />
          </Field>
          <button type="button" onClick={() => onRemove(i)} className="text-[12px] mt-1" style={{ color: '#B3261E' }}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd} className="text-[12px] underline" style={{ color: INK }}>
        + Add Option
      </button>
    </Section>
  );
}