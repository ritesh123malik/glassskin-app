'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ProductForm, { type ProductFormData } from '@/components/ProductForm';
import { ArrowLeft } from 'lucide-react';

const EMPTY_PRODUCT: ProductFormData = {
  name: '',
  description: '',
  price: 0,
  compare_at_price: 0,
  stock_quantity: 0,
  category: '',
  tags: [],
  images: [],
  skin_types: [],
  certifications: [],
  ingredients: '',
  usage: '',
};

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (formData: ProductFormData) => {
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('products')
      .insert({ ...formData, created_at: now, updated_at: now });

    if (error) {
      alert(error.message);
      setSaving(false);
    } else {
      router.push('/dashboard/products');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/products"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Products
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">New Product</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>

      <ProductForm
        initialData={EMPTY_PRODUCT}
        onSubmit={handleSubmit}
        submitLabel={saving ? 'Creating…' : 'Create Product'}
        disabled={saving}
      />
    </div>
  );
}
