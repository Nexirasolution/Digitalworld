'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload, Loader2, X } from 'lucide-react';
import { getType } from '@/lib/productTypes';
import ProductTypeFields from '@/components/ProductTypeFields';

// Design tokens — same white/peach minimalist system as the rest of the site.
const INK = '#241B21';
const INK_SOFT = '#9C877D';
const PEACH = '#D9946A';
const PEACH_WASH = '#FBE8D9';
const LINE = '#EEE3DA';
const PAPER = '#FFFFFF';
const DISABLED_BG = '#F7F2EC';

function emptyVariant() {
  return {
    color: '',
    colorHex: '#D9946A',
    images: [''],
    price: '',
    compareAtPrice: '',
    sizes: [{ size: '', stock: 0, sku: '' }],
  };
}

function emptyAddonOption() {
  return { name: '', image: '', price: '', stock: '', sku: '' };
}

function normalizeSizeChart(value) {
  if (Array.isArray(value)) return value;
  if (value) return [value]; // backward-compat with the old single-string field
  return [];
}

// Uploads one file to /api/upload and returns the image URL.
// Handles non-JSON error responses (e.g. a 413 HTML page from the host).
async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data.url;
}

// Shared input style
const inputStyle = {
  border: `1px solid ${LINE}`,
  borderRadius: '4px',
  padding: '8px 12px',
  fontSize: '14px',
  fontFamily: 'sans-serif',
  color: INK,
  background: PAPER,
  width: '100%',
  outline: 'none',
  marginTop: '4px',
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: '500',
  color: INK_SOFT,
  fontFamily: 'sans-serif',
};

const cardStyle = {
  background: PAPER,
  border: `1px solid ${LINE}`,
  borderRadius: '6px',
  padding: '20px',
  marginBottom: '16px',
};

const sectionHeadStyle = {
  fontSize: '11px',
  fontWeight: '500',
  color: INK,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontFamily: 'sans-serif',
  marginBottom: '12px',
};

const uploadButtonStyle = (disabled) => ({
  background: PEACH,
  color: PAPER,
  border: 'none',
  borderRadius: '4px',
  fontFamily: 'sans-serif',
  opacity: disabled ? 0.6 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

// Single image slot: thumbnail + visible Upload/Replace button + optional URL box.
// `compact` hides the URL box (used inside the add-on option rows).
function ImageSlot({ value, onChange, onRemove, showRemove, compact = false }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className={`flex items-center gap-2 mb-2 ${compact ? '' : 'w-full'}`}>
      <div
        className="shrink-0 overflow-hidden"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '4px',
          border: `1.5px dashed ${PEACH}`,
          background: PEACH_WASH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <Upload size={14} style={{ color: PEACH }} />
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1 text-sm font-medium px-3 py-2 shrink-0"
        style={uploadButtonStyle(uploading)}
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
      </button>

      {!compact && (
        <input
          placeholder="or paste image URL"
          style={{ ...inputStyle, marginTop: 0, flex: 1, minWidth: 0 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = PEACH)}
          onBlur={(e) => (e.target.style.borderColor = LINE)}
        />
      )}

      {showRemove && (
        <button type="button" onClick={onRemove} style={{ color: INK_SOFT, flexShrink: 0 }}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}

// Reusable editor for a list of named add-on options (pants / shawls).
function AddonOptionsEditor({ title, options, onAdd, onUpdate, onRemove }) {
  return (
    <div style={cardStyle}>
      <div className="flex items-center justify-between mb-3">
        <p style={{ ...sectionHeadStyle, marginBottom: 0 }}>{title}</p>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-sm font-medium px-3 py-1.5"
          style={{
            background: PAPER,
            color: PEACH,
            border: `1px solid ${PEACH}`,
            borderRadius: '4px',
            fontFamily: 'sans-serif',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Add {title.replace(/s$/, '')}
        </button>
      </div>
      <p style={{ fontSize: '12px', color: INK_SOFT, fontFamily: 'sans-serif', marginBottom: options.length ? '12px' : 0 }}>
        Leave empty if {title.toLowerCase()} don't apply to this product. The price entered is ADDED
        on top of the variant price when a customer selects it. Customers can also choose "None".
      </p>

      {options.map((opt, idx) => (
        <div
          key={idx}
          className="flex flex-col sm:flex-row sm:items-start gap-3 mb-3 pb-3"
          style={{ borderBottom: idx < options.length - 1 ? `1px solid ${LINE}` : 'none' }}
        >
          <ImageSlot
            compact
            value={opt.image}
            onChange={(url) => onUpdate(idx, 'image', url)}
            onRemove={() => onUpdate(idx, 'image', '')}
            showRemove={!!opt.image}
          />
          <div className="grid sm:grid-cols-4 gap-2 flex-1">
            {[
              ['name', 'Name (e.g. Cotton Palazzo)', 'text'],
              ['price', 'Extra price ₹', 'number'],
              ['stock', 'Stock', 'number'],
              ['sku', 'SKU (optional)', 'text'],
            ].map(([key, placeholder, inputType]) => (
              <input
                key={key}
                type={inputType}
                placeholder={placeholder}
                style={{ ...inputStyle, marginTop: 0 }}
                value={opt[key]}
                onChange={(e) => onUpdate(idx, key, e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = PEACH)}
                onBlur={(e) => (e.target.style.borderColor = LINE)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => onRemove(idx)}
            style={{ color: INK_SOFT, cursor: 'pointer', flexShrink: 0, marginTop: '12px' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ProductForm({ initial, productId }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(() => {
    const base = initial || {
      name: '', slug: '', sku: '', description: '', category: '', fabric: '', tags: [],
      variants: [emptyVariant()],
      sizeChart: [],
      sleeveOptions: [],
      zipOptions: [],
      pantOptions: [],
      shawlOptions: [],
      isBestSeller: false, isTopSeller: false, isActiveSeller: true, isFeatured: false, isActive: true,
      isReadyToShip: false,
    };
    return {
      ...base,
      sizeChart: normalizeSizeChart(base.sizeChart),
      sleeveOptions: base.sleeveOptions || [],
      zipOptions: base.zipOptions || [],
      pantOptions: (base.pantOptions || []).map((o) => ({ ...o })),
      shawlOptions: (base.shawlOptions || []).map((o) => ({ ...o })),
      attributes: { ...(base.attributes || {}) },
      specs: (base.specs || []).map((s) => ({ key: s.key || '', value: s.value || '' })),
    };
  });
  const [saving, setSaving] = useState(false);
  const [sizeChartUploading, setSizeChartUploading] = useState(false);
  const sizeChartFileRef = useRef(null);

  // Per-variant multi-image upload
  const variantFileRefs = useRef({});
  const [variantUploading, setVariantUploading] = useState(null);

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  // ---- product type, derived from the selected category ----
  const catId = form.category?._id || form.category || '';
  const selectedCategory = categories.find((c) => c._id === catId);
  const ready = !!selectedCategory; // type-specific sections appear once a category is chosen
  const typeKey = selectedCategory ? (selectedCategory.productType || 'apparel') : null;
  const type = getType(typeKey);

  // "Parent — Child" labels for the flat category list
  function categoryLabel(c) {
    const parent = c.parent ? categories.find((p) => p._id === String(c.parent)) : null;
    return parent ? `${parent.name} — ${c.name}` : c.name;
  }

  function handleCategoryChange(id) {
    const next = categories.find((c) => c._id === id);
    const nextKey = next ? (next.productType || 'apparel') : null;
    const nextType = getType(nextKey);
    const typeChanged = typeKey !== null && nextKey !== null && typeKey !== nextKey;

    setForm((f) => ({
      ...f,
      category: id,
      // switching between types clears fields that belong to the old type
      ...(typeChanged
        ? { attributes: {}, specs: [], fabric: '', sleeveOptions: [], zipOptions: [], pantOptions: [], shawlOptions: [], sizeChart: [] }
        : {}),
      // non-apparel: pre-fill "Standard" for blank size rows
      variants: f.variants.map((v) => ({
        ...v,
        sizes: v.sizes.map((s) => (s.size ? s : { ...s, size: nextType.defaultSize })),
      })),
    }));
  }

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function toggleArrayValue(field, value) {
    setForm((f) => {
      const current = f[field] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...f, [field]: next };
    });
  }

  function updateVariant(idx, field, value) {
    setForm((f) => { const v = [...f.variants]; v[idx] = { ...v[idx], [field]: value }; return { ...f, variants: v }; });
  }

  function updateVariantImage(vIdx, imgIdx, value) {
    setForm((f) => {
      const variants = [...f.variants];
      const images = [...variants[vIdx].images];
      images[imgIdx] = value;
      variants[vIdx] = { ...variants[vIdx], images };
      return { ...f, variants };
    });
  }

  function removeVariantImage(vIdx, imgIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      const images = variants[vIdx].images.filter((_, i) => i !== imgIdx);
      variants[vIdx] = { ...variants[vIdx], images: images.length ? images : [''] };
      return { ...f, variants };
    });
  }

  function addVariantImage(vIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vIdx] = { ...variants[vIdx], images: [...variants[vIdx].images, ''] };
      return { ...f, variants };
    });
  }

  // Select several files at once; each URL is added as soon as its upload succeeds.
  async function handleVariantFiles(vIdx, e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setVariantUploading(vIdx);
    let count = 0;
    try {
      for (const file of files) {
        const url = await uploadImage(file);
        count++;
        setForm((f) => {
          const variants = [...f.variants];
          const existing = variants[vIdx].images.filter(Boolean);
          variants[vIdx] = { ...variants[vIdx], images: [...existing, url] };
          return { ...f, variants };
        });
      }
      toast.success(`${count} image${count > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast.error(count ? `${err.message} (${count} uploaded before the error)` : err.message);
    } finally {
      setVariantUploading(null);
      e.target.value = '';
    }
  }

  function updateSize(vIdx, sIdx, field, value) {
    setForm((f) => {
      const variants = [...f.variants];
      const sizes = [...variants[vIdx].sizes];
      sizes[sIdx] = { ...sizes[sIdx], [field]: value };
      variants[vIdx] = { ...variants[vIdx], sizes };
      return { ...f, variants };
    });
  }

  function addSize(vIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vIdx] = { ...variants[vIdx], sizes: [...variants[vIdx].sizes, { size: '', stock: 0, sku: '' }] };
      return { ...f, variants };
    });
  }

  function removeSize(vIdx, sIdx) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vIdx] = { ...variants[vIdx], sizes: variants[vIdx].sizes.filter((_, i) => i !== sIdx) };
      return { ...f, variants };
    });
  }

  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { ...emptyVariant(), sizes: [{ size: type.defaultSize, stock: 0, sku: '' }] }],
    }));
  }
  function removeVariant(idx) { setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) })); }

  // Pant / Shawl option list handlers — same shape, different field name.
  function addAddonOption(field) {
    setForm((f) => ({ ...f, [field]: [...(f[field] || []), emptyAddonOption()] }));
  }
  function updateAddonOption(field, idx, key, value) {
    setForm((f) => {
      const list = [...(f[field] || [])];
      list[idx] = { ...list[idx], [key]: value };
      return { ...f, [field]: list };
    });
  }
  function removeAddonOption(field, idx) {
    setForm((f) => ({ ...f, [field]: (f[field] || []).filter((_, i) => i !== idx) }));
  }

  // Size chart — multiple images; each URL is added as soon as its upload succeeds.
  async function handleSizeChartFilesChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSizeChartUploading(true);
    let count = 0;
    try {
      for (const file of files) {
        const url = await uploadImage(file);
        count++;
        setForm((f) => ({ ...f, sizeChart: [...(f.sizeChart || []), url] }));
      }
      toast.success(`${count} size chart image${count > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast.error(count ? `${err.message} (${count} uploaded before the error)` : err.message);
    } finally {
      setSizeChartUploading(false);
      e.target.value = '';
    }
  }

  function removeSizeChartImage(idx) {
    setForm((f) => ({ ...f, sizeChart: (f.sizeChart || []).filter((_, i) => i !== idx) }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!ready) {
      toast.error('Select a category first');
      return;
    }
    setSaving(true);
    try {
      // sku is omitted on purpose — it's generated/managed server-side.
      // The server also derives productType from the category and strips any
      // field that doesn't belong to it, so this payload can be generous.
      const payload = {
        ...form,
        category: catId,
        sizeChart: form.sizeChart || [],
        sleeveOptions: form.sleeveOptions || [],
        zipOptions: form.zipOptions || [],
        attributes: form.attributes || {},
        specs: form.specs || [],
        pantOptions: (form.pantOptions || [])
          .filter((o) => o.name?.trim())
          .map((o) => ({
            name: o.name.trim(),
            image: o.image || '',
            price: Number(o.price) || 0,
            stock: Number(o.stock) || 0,
            sku: o.sku || '',
          })),
        shawlOptions: (form.shawlOptions || [])
          .filter((o) => o.name?.trim())
          .map((o) => ({
            name: o.name.trim(),
            image: o.image || '',
            price: Number(o.price) || 0,
            stock: Number(o.stock) || 0,
            sku: o.sku || '',
          })),
        variants: form.variants.map((v) => ({
          ...v,
          price: Number(v.price),
          compareAtPrice: Number(v.compareAtPrice) || 0,
          images: v.images.filter(Boolean),
          sizes: v.sizes.map((s) => ({ ...s, stock: Number(s.stock) })),
        })),
      };
      delete payload.sku;

      const url = productId ? `/api/products/${productId}` : '/api/products';
      const method = productId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(productId ? 'Product updated' : 'Product created');
        router.push('/admin/products');
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const focusPeach = (e) => (e.target.style.borderColor = PEACH);
  const blurLine = (e) => (e.target.style.borderColor = LINE);

  return (
    <form onSubmit={submit} className="space-y-6">

      {/* Basic Info Card */}
      <div style={cardStyle}>
        <p style={sectionHeadStyle}>Product Details</p>
        <div style={{ height: '1px', background: LINE, marginBottom: '16px' }} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Product Name *</label>
            <input
              required
              style={inputStyle}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              onFocus={focusPeach}
              onBlur={blurLine}
            />
          </div>
          <div>
            <label style={labelStyle}>SKU</label>
            <input
              disabled
              readOnly
              style={{ ...inputStyle, background: DISABLED_BG, color: INK_SOFT, cursor: 'not-allowed' }}
              value={form.sku || 'Auto-generated from category on save'}
              title="SKU is generated automatically from the product's category"
            />
          </div>
          <div>
            <label style={labelStyle}>Category *</label>
            <select
              required
              style={inputStyle}
              value={catId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              onFocus={focusPeach}
              onBlur={blurLine}
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{categoryLabel(c)}</option>)}
            </select>
            <p style={{ ...labelStyle, fontWeight: '400', marginTop: '4px' }}>
              {ready
                ? `Product type: ${type.label}`
                : 'Pick a category — the fields below adapt to the kind of product.'}
            </p>
          </div>

          {ready && type.showFabric && (
            <div>
              <label style={labelStyle}>Fabric</label>
              <input
                style={inputStyle}
                value={form.fabric}
                onChange={(e) => update('fabric', e.target.value)}
                onFocus={focusPeach}
                onBlur={blurLine}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>Tags (comma separated)</label>
            <input
              style={inputStyle}
              value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
              onChange={(e) => update('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
              onFocus={focusPeach}
              onBlur={blurLine}
            />
          </div>
          <div className="sm:col-span-2">
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical' }}
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              onFocus={focusPeach}
              onBlur={blurLine}
            />
          </div>

          {/* Type-specific fields: brand / warranty / FSSAI / specs ... */}
          {ready && (
            <ProductTypeFields
              type={type}
              attributes={form.attributes}
              specs={form.specs}
              onAttr={(k, v) => update('attributes', { ...form.attributes, [k]: v })}
              onSpecs={(s) => update('specs', s)}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
            />
          )}

          {/* Size chart — apparel only. Falls back to the category's chart when empty. */}
          {ready && type.showSizeChart && (
            <div className="sm:col-span-2">
              <label style={labelStyle}>
                Size Chart <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>
                  (optional — shown as a gallery on the product page; falls back to the category's size chart if left empty)
                </span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-2">
                {(form.sizeChart || []).map((url, idx) => (
                  <div key={idx} className="relative aspect-square overflow-hidden" style={{ borderRadius: '4px', border: `1px solid ${LINE}` }}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSizeChartImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)', color: PAPER }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={sizeChartUploading}
                  onClick={() => sizeChartFileRef.current?.click()}
                  className="aspect-square flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                  style={{ borderRadius: '4px', border: `1.5px dashed ${PEACH}`, background: PEACH_WASH, color: PEACH, cursor: 'pointer' }}
                >
                  {sizeChartUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  <span style={{ fontSize: '10px', fontFamily: 'sans-serif' }}>{sizeChartUploading ? 'Uploading…' : 'Add'}</span>
                </button>
              </div>
              <input
                ref={sizeChartFileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleSizeChartFilesChange}
              />
            </div>
          )}

          {/* Sleeve/Zip options — apparel only */}
          {ready && type.showSleeveZip && (
            <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>
                  Sleeve Type Options <span style={{ fontWeight: '400' }}>(optional)</span>
                </label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {['Full Sleeve', 'Half Sleeve', 'Elbow Sleeve', 'Sleeveless'].map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: INK, fontFamily: 'sans-serif' }}>
                      <input
                        type="checkbox"
                        checked={(form.sleeveOptions || []).includes(opt)}
                        onChange={() => toggleArrayValue('sleeveOptions', opt)}
                        style={{ accentColor: PEACH, width: '15px', height: '15px' }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>
                  Zip Type Options <span style={{ fontWeight: '400' }}>(optional)</span>
                </label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {['With Zip', 'Without Zip'].map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: INK, fontFamily: 'sans-serif' }}>
                      <input
                        type="checkbox"
                        checked={(form.zipOptions || []).includes(opt)}
                        onChange={() => toggleArrayValue('zipOptions', opt)}
                        style={{ accentColor: PEACH, width: '15px', height: '15px' }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            {[
              ['isBestSeller', 'Bestseller'],
              ['isTopSeller', 'Top Seller'],
              ['isActiveSeller', 'Active Seller'],
              ['isFeatured', 'Featured'],
              ['isActive', 'Active (visible on site)'],
              ['isReadyToShip', 'Ready to Ship'],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm cursor-pointer"
                style={{ color: INK_SOFT, fontFamily: 'sans-serif' }}
              >
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={(e) => update(key, e.target.checked)}
                  style={{ accentColor: PEACH, width: '15px', height: '15px' }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Variants Section */}
      {ready && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ ...sectionHeadStyle, marginBottom: 0 }}>Variants</h2>
            <button
              type="button"
              onClick={addVariant}
              className="flex items-center gap-1 text-sm font-medium px-4 py-2 transition-colors"
              style={{
                background: PAPER,
                color: PEACH,
                border: `1px solid ${PEACH}`,
                borderRadius: '4px',
                fontFamily: 'sans-serif',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = PEACH;
                e.currentTarget.style.color = PAPER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = PAPER;
                e.currentTarget.style.color = PEACH;
              }}
            >
              <Plus size={16} /> Add Variant
            </button>
          </div>

          {form.variants.map((v, vIdx) => (
            <div key={vIdx} style={cardStyle}>
              {/* Variant header */}
              <div
                className="flex justify-between items-center mb-3 pb-2"
                style={{ borderBottom: `1px solid ${LINE}` }}
              >
                <span style={{ fontWeight: '500', fontSize: '13px', color: INK, fontFamily: 'sans-serif' }}>
                  Variant {vIdx + 1}
                </span>
                {form.variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(vIdx)} style={{ color: INK_SOFT, cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className={`grid ${type.hasColor ? 'sm:grid-cols-4' : 'sm:grid-cols-2'} gap-3 mb-3`}>
                {type.hasColor && (
                  <>
                    <input
                      placeholder="Color name (e.g. Green)"
                      style={inputStyle}
                      value={v.color}
                      onChange={(e) => updateVariant(vIdx, 'color', e.target.value)}
                      onFocus={focusPeach}
                      onBlur={blurLine}
                    />
                    <input
                      type="color"
                      style={{ ...inputStyle, padding: '4px', height: '40px' }}
                      value={v.colorHex}
                      onChange={(e) => updateVariant(vIdx, 'colorHex', e.target.value)}
                    />
                  </>
                )}
                <input
                  placeholder="Price ₹"
                  type="number"
                  required
                  style={inputStyle}
                  value={v.price}
                  onChange={(e) => updateVariant(vIdx, 'price', e.target.value)}
                  onFocus={focusPeach}
                  onBlur={blurLine}
                />
                <input
                  placeholder="Compare-at price ₹"
                  type="number"
                  style={inputStyle}
                  value={v.compareAtPrice}
                  onChange={(e) => updateVariant(vIdx, 'compareAtPrice', e.target.value)}
                  onFocus={focusPeach}
                  onBlur={blurLine}
                />
              </div>

              {/* Images header + bulk upload */}
              <div className="flex items-center justify-between mb-2">
                <p style={{ fontSize: '12px', color: INK_SOFT, fontFamily: 'sans-serif', fontWeight: '500' }}>
                  {type.hasColor ? 'Images for this colour' : 'Product images'}
                </p>
                <button
                  type="button"
                  disabled={variantUploading === vIdx}
                  onClick={() => variantFileRefs.current[vIdx]?.click()}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1.5"
                  style={uploadButtonStyle(variantUploading === vIdx)}
                >
                  {variantUploading === vIdx
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Upload size={14} />}
                  {variantUploading === vIdx ? 'Uploading…' : 'Upload images'}
                </button>
                <input
                  ref={(el) => { variantFileRefs.current[vIdx] = el; }}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleVariantFiles(vIdx, e)}
                />
              </div>

              {v.images.map((img, imgIdx) => (
                <ImageSlot
                  key={imgIdx}
                  value={img}
                  onChange={(url) => updateVariantImage(vIdx, imgIdx, url)}
                  onRemove={() => removeVariantImage(vIdx, imgIdx)}
                  showRemove={v.images.length > 1}
                />
              ))}
              <button
                type="button"
                onClick={() => addVariantImage(vIdx)}
                style={{ fontSize: '12px', color: PEACH, fontFamily: 'sans-serif', fontWeight: '500', marginBottom: '12px', cursor: 'pointer' }}
              >
                + Add another image
              </button>

              <p style={{ fontSize: '12px', color: INK_SOFT, fontFamily: 'sans-serif', fontWeight: '500', marginBottom: '6px' }}>
                {type.sizeLabel}
              </p>
              {v.sizes.map((s, sIdx) => (
                <div key={sIdx} className="flex gap-2 mb-2 items-center">
                  <input
                    placeholder={type.sizePlaceholder}
                    style={{ ...inputStyle, width: '200px', marginTop: 0 }}
                    value={s.size}
                    onChange={(e) => updateSize(vIdx, sIdx, 'size', e.target.value)}
                    onFocus={focusPeach}
                    onBlur={blurLine}
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    style={{ ...inputStyle, width: '90px', marginTop: 0 }}
                    value={s.stock}
                    onChange={(e) => updateSize(vIdx, sIdx, 'stock', e.target.value)}
                    onFocus={focusPeach}
                    onBlur={blurLine}
                  />
                  <input
                    placeholder="SKU (optional)"
                    style={{ ...inputStyle, flex: 1, marginTop: 0 }}
                    value={s.sku}
                    onChange={(e) => updateSize(vIdx, sIdx, 'sku', e.target.value)}
                    onFocus={focusPeach}
                    onBlur={blurLine}
                  />
                  {v.sizes.length > 1 && (
                    <button type="button" onClick={() => removeSize(vIdx, sIdx)} style={{ color: INK_SOFT, cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addSize(vIdx)}
                style={{ fontSize: '12px', color: PEACH, fontFamily: 'sans-serif', fontWeight: '500', cursor: 'pointer' }}
              >
                + Add {type.defaultSize ? 'option' : 'size'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pant / Shawl add-ons — apparel only */}
      {ready && type.showAddons && (
        <>
          <AddonOptionsEditor
            title="Pant Options"
            options={form.pantOptions}
            onAdd={() => addAddonOption('pantOptions')}
            onUpdate={(idx, key, value) => updateAddonOption('pantOptions', idx, key, value)}
            onRemove={(idx) => removeAddonOption('pantOptions', idx)}
          />
          <AddonOptionsEditor
            title="Shawl Options"
            options={form.shawlOptions}
            onAdd={() => addAddonOption('shawlOptions')}
            onUpdate={(idx, key, value) => updateAddonOption('shawlOptions', idx, key, value)}
            onRemove={(idx) => removeAddonOption('shawlOptions', idx)}
          />
        </>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={saving || !ready}
        className="w-full sm:w-auto px-8 py-3 font-medium text-sm transition-opacity"
        style={{
          background: PEACH,
          color: PAPER,
          border: 'none',
          borderRadius: '4px',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          letterSpacing: '0.02em',
          cursor: saving || !ready ? 'not-allowed' : 'pointer',
          opacity: saving || !ready ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving...' : productId ? 'Update Product' : 'Create Product'}
      </button>
    </form>
  );
}