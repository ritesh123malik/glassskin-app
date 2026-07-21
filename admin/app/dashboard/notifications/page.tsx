'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Trash2, Check, X } from 'lucide-react';

type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`user_id.ilike.%${search}%,title.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (!error) setNotifications(data ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification?')) return;
    setDeleting(id);
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) alert(error.message);
    else setNotifications((prev) => prev.filter((n) => n.id !== id));
    setDeleting(null);
  };

  const toggleRead = async (notification: Notification) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: !notification.read })
      .eq('id', notification.id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: !n.read } : n))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
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
          placeholder="Search by user ID or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading notifications…</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No notifications found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Body</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {notifications.map((notification) => (
                <tr key={notification.id} className={`hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-purple-50/30' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleRead(notification)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                        notification.read
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {notification.read ? <Check size={12} /> : <X size={12} />}
                      {notification.read ? 'Read' : 'Unread'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono text-xs">
                    {notification.user_id.slice(0, 8)}…
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {notification.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {notification.body}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleDelete(notification.id)}
                      disabled={deleting === notification.id}
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
