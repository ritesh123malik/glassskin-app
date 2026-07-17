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

      if (error || profile?.role !== 'admin') {
        // Not an admin — sign them out for safety
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
    } = supabase.auth.onAuthStateChange(() => {
      resolveAdminUser();
    });

    return () => subscription.unsubscribe();
  }, [resolveAdminUser]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    await resolveAdminUser();
    router.push('/');
  };

  const signOut = async () => {
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
