'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AdminUser = {
  id: string;
  email: string;
  role: 'admin';
};

type AdminAuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(
  undefined
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AdminAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const resolveAdminUser = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log('[auth] getSession result:', session ? `user=${session.user.email}` : 'no session')

      if (!session) {
        setUser(null);
        return;
      }

      // Verify the user has the admin role in the database
      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      console.log('[auth] users table query result:', { profile, error })

      if (error || profile?.role !== 'admin') {
        console.warn('[auth] not admin, signing out')
        await supabase.auth.signOut();
        setUser(null);
        return;
      }

      setUser({
        id: session.user.id,
        email: session.user.email!,
        role: 'admin',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    resolveAdminUser();

    // Keep the UI in sync when the session changes (e.g. token refresh, tab refocus)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      resolveAdminUser();
    });

    return () => subscription.unsubscribe();
  }, [resolveAdminUser]);

  const signIn = async (email: string, password: string) => {
    console.log('[auth] signIn attempt:', email)
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[auth] signIn error:', result.error)
      throw new Error(result.error || 'Login failed');
    }

    console.log('[auth] signIn success via API route')

    // Sync the Supabase client session so the frontend can use it
    if (result.session) {
      await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
    }

    await resolveAdminUser();
    console.log('[auth] resolveAdminUser done, navigating to /')
    router.push('/')
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[auth] logout API error:', err);
    }

    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  }
  return ctx;
}
