'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Trash2, Smartphone, Monitor, Search, X } from 'lucide-react';

type PushToken = {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  created_at: string;
  updated_at: string;
};

export default function PushTokensPage() {
  const [tokens, setTokens] = useState<PushToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('push_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`user_id.ilike.%${search}%,platform.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (!error) setTokens(data ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this push token? The user will no longer receive push notifications.')) return;
    setDeleting(id);
    const { error } = await supabase.from('push_tokens').delete().eq('id', id);
    if (error) alert(error.message);
    else setTokens((prev) => prev.filter((t) => t.id !== id));
    setDeleting(null);
  };

  const getPlatformIcon = (platform: string) => {
    if (platform.toLowerCase().includes('ios')) return <Smartphone size={14} className="text-gray-400" />;
    if (platform.toLowerCase().includes('android')) return <Smartphone size={14} className="text-green-500" />;
    return <Monitor size={14} className="text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Push Tokens</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tokens.length} registered device{tokens.length !== 1 ? 's' : ''}
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
          placeholder="Search by user ID or platform…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading push tokens…</div>
        ) : tokens.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No push tokens found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {tokens.map((token) => (
                <tr key={token.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(token.platform)}
                      <span className="text-sm text-gray-900 capitalize">{token.platform}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono text-xs">
                    {token.user_id.slice(0, 8)}…
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs max-w-xs truncate">
                    {token.token}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(token.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleDelete(token.id)}
                      disabled={deleting === token.id}
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
