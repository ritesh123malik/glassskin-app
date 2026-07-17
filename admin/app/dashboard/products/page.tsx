'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, ImageOff, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type Product = {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  category: string;
  images: string[];
  created_at: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;
    if (!error) setProducts(data ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(`Delete "${name}"? This action cannot be undone.`)
    )
      return;
    setDeleting(id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert(error.message);
    else setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          id="btn-add-product"
          className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
        >
          <Plus size={16} />
          Add Product
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Loading products…
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No products found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ImageOff size={16} className="text-gray-400" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {product.category || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(product.price)}
                      </span>
                      {product.compare_at_price &&
                        product.compare_at_price > product.price && (
                          <span className="ml-2 text-xs text-gray-400 line-through">
                            {formatCurrency(product.compare_at_price)}
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        product.stock_quantity === 0
                          ? 'bg-red-100 text-red-800'
                          : product.stock_quantity < 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {product.stock_quantity === 0
                        ? 'Out of stock'
                        : `${product.stock_quantity} in stock`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/products/${product.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <Edit size={13} />
                        Edit
                      </Link>
                      <button
                        onClick={() =>
                          handleDelete(product.id, product.name)
                        }
                        disabled={deleting === product.id}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 px-2.5 py-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
