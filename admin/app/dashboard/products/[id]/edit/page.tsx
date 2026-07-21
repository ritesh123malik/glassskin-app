'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ProductForm, { type ProductFormData } from '@/components/ProductForm';
import { ArrowLeft } from 'lucide-react';
import { logAdminAudit } from '@/lib/auditLog';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.id) fetchProduct(params.id as string);
  }, [params.id]);

  const fetchProduct = async (id: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      alert(error.message);
      router.push('/dashboard/products');
    } else {
      setProduct(data as ProductFormData);
    }
    setLoading(false);
  };

  const handleSubmit = async (formData: ProductFormData) => {
    setSaving(true);
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const { error } = await supabase
      .from('products')
      .update({ ...formData, slug, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) {
      alert(error.message);
      setSaving(false);
    } else {
      await logAdminAudit({
        action: 'product_update',
        targetTable: 'products',
        targetId: params.id as string,
        changes: { name: formData.name, price: formData.price, category: formData.category },
      });
      router.push('/dashboard/products');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!product) return null;

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
        <span className="text-sm text-gray-900 font-medium">Edit Product</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>

      <ProductForm
        initialData={product}
        onSubmit={handleSubmit}
        submitLabel={saving ? 'Saving…' : 'Update Product'}
        disabled={saving}
      />
    </div>
  );
}
