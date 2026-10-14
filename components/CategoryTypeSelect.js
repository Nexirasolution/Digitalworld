'use client';

import { PRODUCT_TYPES } from '@/lib/productTypes';

// Drop this into your category create/edit form (I haven't seen that file).
//   <CategoryTypeSelect value={form.productType} onChange={(v) => setForm({ ...form, productType: v })}
//                       disabled={!!form.parent} />
// For a subcategory pass disabled — the API forces it to match the parent.
export default function CategoryTypeSelect({ value, onChange, disabled, className = '', style = {} }) {
  return (
    <div>
      <select
        className={className}
        style={style}
        value={value || 'apparel'}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {Object.entries(PRODUCT_TYPES).map(([key, t]) => (
          <option key={key} value={key}>{t.label}</option>
        ))}
      </select>
      <p className="text-xs mt-1 opacity-60">
        {disabled
          ? 'Subcategories use their parent category’s product type.'
          : 'Controls which fields appear when adding products here. Locked once the category has products.'}
      </p>
    </div>
  );
}