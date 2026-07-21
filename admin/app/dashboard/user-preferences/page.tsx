'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Trash2 } from 'lucide-react';

type UserPreference = {
  user_id: string;
  order_notifications: boolean;
  promo_notifications: boolean;
  cart_reminders: boolean;
  created_at: string;
  updated_at: string;
};

export default function UserPreferencesPage() {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('user_preferences')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('user_id', `%${search}%`);
    }

    const { data, error } = await query;
    if (!error) setPreferences(data ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete these preferences? The user will get default preferences on next login.')) return;
    setDeleting(userId);
    const { error } = await supabase.from('user_preferences').delete().eq('user_id', userId);
    if (error) alert(error.message);
    else setPreferences((prev) => prev.filter((p) => p.user_id !== userId));
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Preferences</h1>
          <p className="mt-1 text-sm text-gray-500">
            {preferences.length} user preference record{preferences.length !== 1 ? 's' : ''}
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
          placeholder="Search by user ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading preferences…</div>
        ) : preferences.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No preferences found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Notifications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promo Notifications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cart Reminders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {preferences.map((pref) => (
                <tr key={pref.user_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono text-xs">
                    {pref.user_id.slice(0, 8)}…
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {pref.order_notifications ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {pref.promo_notifications ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {pref.cart_reminders ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(pref.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleDelete(pref.user_id)}
                      disabled={deleting === pref.user_id}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 px-2.5 py-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      Delete
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
