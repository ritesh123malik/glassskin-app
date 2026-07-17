'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/auth';
import { CheckCircle, AlertTriangle } from 'lucide-react';

type SectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

function Section({ title, description, children }: SectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAdminAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Admin accounts list
  const [admins, setAdmins] = useState<{ id: string; email: string }[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'admin');
    setAdmins(data ?? []);
    setLoadingAdmins(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus(null);

    if (newPassword !== confirmPassword) {
      setPwStatus({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwStatus({ type: 'error', msg: 'Password must be at least 8 characters.' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwStatus({ type: 'error', msg: error.message });
    } else {
      setPwStatus({ type: 'success', msg: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your admin account and access.
        </p>
      </div>

      {/* Account info */}
      <Section title="Account" description="Your admin account details.">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
            <p className="text-xs text-purple-600 mt-0.5">Administrator</p>
          </div>
        </div>
      </Section>

      {/* Change password */}
      <Section
        title="Change Password"
        description="Update your admin account password."
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {pwStatus && (
            <div
              className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
                pwStatus.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {pwStatus.type === 'success' ? (
                <CheckCircle size={15} />
              ) : (
                <AlertTriangle size={15} />
              )}
              {pwStatus.msg}
            </div>
          )}

          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Re-enter new password"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              id="btn-change-password"
              disabled={saving}
              className="px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </Section>

      {/* Admin accounts */}
      <Section
        title="Admin Accounts"
        description="Users with admin role. To add/remove admins, update the role column in the users table via Supabase Dashboard."
      >
        {loadingAdmins ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-gray-400">No admin accounts found.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {admins.map((admin) => (
              <li
                key={admin.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-sm font-bold">
                    {admin.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-900">{admin.email}</span>
                </div>
                {admin.id === user?.id && (
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
