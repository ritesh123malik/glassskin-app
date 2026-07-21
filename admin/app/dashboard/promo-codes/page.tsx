'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Tag, Search, X, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type PromoCode = {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_subtotal: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
  created_at: string;
};

type FormData = {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_subtotal: number;
  max_uses: string;
  valid_until: string;
  active: boolean;
};

const emptyForm: FormData = {
  code: '',
  discount_type: 'percent',
  discount_value: 0,
  min_subtotal: 0,
  max_uses: '',
  valid_until: '',
  active: true,
};

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('code', `%${search}%`);
    }

    const { data, error } = await query;
    if (!error) setCodes(data ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCode(null);
    setError(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (code: PromoCode) => {
    setEditingCode(code);
    setForm({
      code: code.code,
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      min_subtotal: code.min_subtotal,
      max_uses: code.max_uses != null ? String(code.max_uses) : '',
      valid_until: code.valid_until || '',
      active: code.active,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_subtotal: Number(form.min_subtotal),
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      active: form.active,
    };

    let error: string | null = null;

    if (editingCode) {
      const { error: updateError } = await supabase
        .from('promo_codes')
        .update(payload)
        .eq('id', editingCode.id);
      error = updateError?.message ?? null;
    } else {
      const { error: insertError } = await supabase
        .from('promo_codes')
        .insert(payload);
      error = insertError?.message ?? null;
    }

    if (error) {
      setError(error);
      setSaving(false);
      return;
    }

    setSaving(false);
    closeForm();
    fetchCodes();
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete promo code "${code}"? This cannot be undone.`)) return;
    setDeleting(id);
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (error) alert(error.message);
    else setCodes((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
  };

  const toggleActive = async (code: PromoCode) => {
    const { error } = await supabase
      .from('promo_codes')
      .update({ active: !code.active })
      .eq('id', code.id);

    if (error) {
      alert(error.message);
      return;
    }

    setCodes((prev) =>
      prev.map((c) => (c.id === code.id ? { ...c, active: !c.active } : c))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promo Codes</h1>
          <p className="mt-1 text-sm text-gray-500">
            {codes.length} promo code{codes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
        >
          <Plus size={16} />
          Add Promo Code
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search promo codes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Loading promo codes…
          </div>
        ) : codes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No promo codes found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min. subtotal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {codes.map((code) => (
                <tr key={code.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {code.code}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {code.discount_type === 'percent'
                      ? `${code.discount_value}%`
                      : formatCurrency(code.discount_value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatCurrency(code.min_subtotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {code.uses_count}
                    {code.max_uses != null ? ` / ${code.max_uses}` : ' / ∞'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(code)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                        code.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {code.active ? <Check size={12} /> : <X size={12} />}
                      {code.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(code)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <Edit size={13} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(code.id, code.code)}
                        disabled={deleting === code.id}
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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCode ? 'Edit Promo Code' : 'Add Promo Code'}
              </h2>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="SUMMER20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount type
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discount_type: e.target.value as 'percent' | 'fixed',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount value
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm({ ...form, discount_value: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min. subtotal
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.min_subtotal}
                    onChange={(e) =>
                      setForm({ ...form, min_subtotal: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max uses
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid until
                </label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingCode ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
