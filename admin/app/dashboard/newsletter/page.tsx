'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Trash2, Check, X, Mail } from 'lucide-react';

type Subscriber = {
  id: string;
  email: string;
  subscribed_at: string;
  source: string;
  is_active: boolean;
  unsubscribed_at: string | null;
};

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    const { data, error } = await query;
    if (!error) setSubscribers(data ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Remove "${email}" from newsletter?`)) return;
    setDeleting(id);
    const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
    if (error) alert(error.message);
    else setSubscribers((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  };

  const toggleActive = async (subscriber: Subscriber) => {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ 
        is_active: !subscriber.is_active,
        unsubscribed_at: subscriber.is_active ? new Date().toISOString() : null
      })
      .eq('id', subscriber.id);

    if (error) {
      alert(error.message);
      return;
    }

    setSubscribers((prev) =>
      prev.map((s) => (s.id === subscriber.id ? { ...s, is_active: !s.is_active, unsubscribed_at: subscriber.is_active ? new Date().toISOString() : null } : s))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter Subscribers</h1>
          <p className="mt-1 text-sm text-gray-500">
            {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''} ({subscribers.filter(s => s.is_active).length} active)
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading subscribers…</div>
        ) : subscribers.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No subscribers found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscribed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unsubscribed</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-900">{subscriber.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                    {subscriber.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(subscriber)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                        subscriber.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {subscriber.is_active ? <Check size={12} /> : <X size={12} />}
                      {subscriber.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(subscriber.subscribed_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {subscriber.unsubscribed_at ? new Date(subscriber.unsubscribed_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleDelete(subscriber.id, subscriber.email)}
                      disabled={deleting === subscriber.id}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 px-2.5 py-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
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
