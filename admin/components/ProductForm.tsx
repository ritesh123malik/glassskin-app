'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ProductFormData = {
  name: string;
  description: string;
  price: number;
  compare_at_price: number;
  stock_quantity: number;
  category: string;
  tags: string[];
  images: string[];
  skin_types: string[];
  certifications: string[];
  ingredients: string;
  usage: string;
};

type Props = {
  initialData: ProductFormData;
  onSubmit: (data: ProductFormData) => void;
  submitLabel?: string;
  disabled?: boolean;
};

const CATEGORIES = [
  'Cleansers',
  'Moisturizers',
  'Serums',
  'Masks',
  'Sunscreen',
  'Toners',
  'Eye Care',
  'Treatments',
];

const SKIN_TYPES = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];

// ---------------------------------------------------------------------------
// Chip input helper
// ---------------------------------------------------------------------------
function ChipInput({
  label,
  field,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  field: string;
  values: string[];
  onChange: (field: string, values: string[]) => void;
  placeholder?: string;
}) {
  const [inputVal, setInputVal] = useState('');

  const add = () => {
    const v = inputVal.trim();
    if (v && !values.includes(v)) {
      onChange(field, [...values, v]);
    }
    setInputVal('');
  };

  const remove = (index: number) => {
    onChange(field, values.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(i)}
              className="ml-0.5 hover:text-purple-600"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? `Add ${label.toLowerCase()} and press Enter`}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus size={16} className="text-gray-500" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------
export default function ProductForm({
  initialData,
  onSubmit,
  submitLabel = 'Save Product',
  disabled = false,
}: Props) {
  const [form, setForm] = useState<ProductFormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: keyof ProductFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChipChange = (field: string, values: string[]) => {
    set(field as keyof ProductFormData, values);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      if (value === '') {
        set(name as keyof ProductFormData, NaN);
      } else {
        const num = parseFloat(value);
        set(name as keyof ProductFormData, isNaN(num) ? NaN : num);
      }
    } else {
      set(name as keyof ProductFormData, value);
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (isNaN(form.price) || form.price <= 0) {
      next.price = 'Price must be a positive number';
    }

    if (isNaN(form.stock_quantity) || form.stock_quantity < 0) {
      next.stock_quantity = 'Stock quantity must be 0 or greater';
    }

    if (form.compare_at_price !== undefined && !isNaN(form.compare_at_price) && form.compare_at_price < 0) {
      next.compare_at_price = 'Compare-at price must be 0 or greater';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g. Hydrating Vitamin C Serum"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            placeholder="Describe the product benefits, formula, and results…"
          />
        </div>
      </div>

      {/* Pricing & Inventory */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Pricing & Inventory</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                id="price"
                type="number"
                name="price"
                value={isNaN(form.price) ? '' : form.price}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                className={`w-full pl-7 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.price ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
            </div>
          </div>

          {/* Compare at price */}
          <div>
            <label htmlFor="compare_at_price" className="block text-sm font-medium text-gray-700 mb-1">
              Compare-at Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                id="compare_at_price"
                type="number"
                name="compare_at_price"
                value={isNaN(form.compare_at_price) ? '' : form.compare_at_price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full pl-7 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.compare_at_price ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.compare_at_price && (
                <p className="mt-1 text-sm text-red-600">{errors.compare_at_price}</p>
              )}
            </div>
          </div>

          {/* Stock */}
          <div>
            <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity <span className="text-red-500">*</span>
            </label>
              <input
                id="stock_quantity"
                type="number"
                name="stock_quantity"
                value={isNaN(form.stock_quantity) ? '' : form.stock_quantity}
                onChange={handleChange}
                required
                min="0"
                step="1"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.stock_quantity ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.stock_quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.stock_quantity}</p>
              )}
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Product Details</h2>

        {/* Skin types (multi-select checkboxes) */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Skin Types</p>
          <div className="flex flex-wrap gap-2">
            {SKIN_TYPES.map((type) => (
              <label
                key={type}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer border transition-colors ${
                  (form.skin_types ?? []).includes(type)
                    ? 'bg-purple-100 border-purple-300 text-purple-800'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-purple-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={(form.skin_types ?? []).includes(type)}
                  onChange={(e) => {
                    set(
                      'skin_types',
                      e.target.checked
                        ? [...(form.skin_types ?? []), type]
                        : (form.skin_types ?? []).filter((t) => t !== type)
                    );
                  }}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <ChipInput
          label="Tags"
          field="tags"
          values={form.tags ?? []}
          onChange={handleChipChange}
          placeholder="e.g. vegan, cruelty-free"
        />

        <ChipInput
          label="Certifications"
          field="certifications"
          values={form.certifications ?? []}
          onChange={handleChipChange}
          placeholder="e.g. COSMOS Organic, EWG Verified"
        />

        <ChipInput
          label="Image URLs"
          field="images"
          values={form.images ?? []}
          onChange={handleChipChange}
          placeholder="https://..."
        />

        {/* Ingredients */}
        <div>
          <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700 mb-1">
            Ingredients
          </label>
          <textarea
            id="ingredients"
            name="ingredients"
            value={form.ingredients}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            placeholder="Aqua, Niacinamide, Zinc PCA…"
          />
        </div>

        {/* Usage */}
        <div>
          <label htmlFor="usage" className="block text-sm font-medium text-gray-700 mb-1">
            Usage Instructions
          </label>
          <textarea
            id="usage"
            name="usage"
            value={form.usage}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            placeholder="Apply 2–3 drops to cleansed skin morning and evening…"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          id="btn-submit-product"
          disabled={disabled}
          className="inline-flex items-center px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
