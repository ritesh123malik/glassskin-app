import { User } from '../../types';
import { supabaseClient, SecureStoreAdapter } from '../../services/supabaseClient';
import { User as AuthUser } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking } from 'react-native';
import { productCacheService } from '../../services/productCacheService';
import { getOAuthRedirectUrl, parseOAuthTokensFromUrl } from '../../utils/auth';
import { mapAuthUser, mapProduct, handleAuthError } from '../helpers';

WebBrowser.maybeCompleteAuthSession();

let authListenerUnsubscribe: (() => void) | null = null;

export interface AuthSlice {
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  isSignOutIntentional: boolean;
  isRecoveringPassword: boolean;
  preferences: UserPreferences | null;

  productsChannelUnsubscribe: (() => void) | null;
  productsReconnectTimeout: ReturnType<typeof setTimeout> | null;
  productsReconnectAttempts: number;
  MAX_PRODUCTS_RECONNECT_ATTEMPTS: number;
  PRODUCTS_RECONNECT_BASE_DELAY: number;

  signUp: (email: string, password: string, fullName?: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithSocial: (provider: 'google' | 'apple') => Promise<boolean>;
  signInAsGuest: () => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  initializeAuthListener: () => void;
  cleanupAuthListener: () => void;
  setRecoveringPassword: (val: boolean) => void;
  registerPushToken: (token: string, platform: 'ios' | 'android' | 'web') => Promise<void>;
  fetchUserPreferences: () => Promise<void>;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  subscribeToProducts: () => void;
  unsubscribeFromProducts: () => void;
}

interface UserPreferences {
  user_id: string;
  order_notifications: boolean;
  promo_notifications: boolean;
  cart_reminders: boolean;
}

export const authSlice = (set: any, get: any): AuthSlice => ({
  user: null,
  authLoading: false,
  authError: null,
  isSignOutIntentional: false,
  isRecoveringPassword: false,
  preferences: null,

  productsChannelUnsubscribe: null,
  productsReconnectTimeout: null,
  productsReconnectAttempts: 0,
  MAX_PRODUCTS_RECONNECT_ATTEMPTS: 10,
  PRODUCTS_RECONNECT_BASE_DELAY: 1000,

  signUp: async (email, password, fullName) => {
    set({ authLoading: true, authError: null });
    try {
      const res = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
          },
        },
      });
      if (res.error) throw res.error;

      const mappedUser = mapAuthUser(res.data.user);
      set({ user: mappedUser, authLoading: false });

      if (mappedUser) {
        await get().mergeGuestCartIntoUserCart(mappedUser.id);
        await get().fetchUserPreferences();
        await get().fetchCart();
        await get().fetchWishlist();
        await get().subscribeToProducts();
      }
      return true;
    } catch (err: any) {
      set({ authError: handleAuthError(err), authLoading: false });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const res = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (res.error) throw res.error;

      const mappedUser = mapAuthUser(res.data.user);
      set({ user: mappedUser, authLoading: false });

      if (mappedUser) {
        await get().mergeGuestCartIntoUserCart(mappedUser.id);
        await get().fetchUserPreferences();
        await get().fetchCart();
        await get().fetchWishlist();
        await get().subscribeToProducts();
      }
      return true;
    } catch (err: any) {
      set({ authError: handleAuthError(err), authLoading: false });
      return false;
    }
  },

  signInWithSocial: async (provider) => {
    set({ authLoading: true, authError: null });
    try {
      const redirectUrl = getOAuthRedirectUrl();
      const res = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      if (res.error) throw res.error;

      if (res.data?.url) {
        const browserResult = await WebBrowser.openAuthSessionAsync(res.data.url, redirectUrl);
        if (browserResult.type === 'success') {
          const tokens = parseOAuthTokensFromUrl(browserResult.url);
          if (tokens) {
            const sessionRes = await supabaseClient.auth.setSession(tokens);
            if (sessionRes.error) throw sessionRes.error;
            const mappedUser = mapAuthUser(sessionRes.data.user);
            set({ user: mappedUser, authLoading: false });

            if (mappedUser) {
              await get().mergeGuestCartIntoUserCart(mappedUser.id);
              await get().fetchUserPreferences();
              await get().subscribeToProducts();
            }
            return true;
          }
        } else {
          set({
            authError: 'Social login was cancelled or did not complete. Please try again or use email/password.',
            authLoading: false,
          });
        }
      }
      set({ authLoading: false });
      return false;
    } catch (err: any) {
      set({ authError: handleAuthError(err), authLoading: false });
      return false;
    }
  },

  signInAsGuest: async (): Promise<boolean> => {
    set({ authLoading: true, authError: null });
    try {
      const { data, error } = await supabaseClient.auth.signInAnonymously();
      if (error) throw error;
      const mappedUser = mapAuthUser(data.user);
      set({ user: mappedUser, authLoading: false, authError: null });
      await get().subscribeToProducts();
      return true;
    } catch (err: any) {
      set({ authError: handleAuthError(err), authLoading: false });
      return false;
    }
  },

  requestPasswordReset: async (email) => {
    set({ authLoading: true, authError: null });
    try {
      const redirectUrl = Linking.createURL('auth-callback');
      const res = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (res.error) throw res.error;
      set({ authLoading: false });
      return true;
    } catch (err: any) {
      set({ authError: handleAuthError(err), authLoading: false });
      return false;
    }
  },

  signOut: async () => {
    set({ authLoading: true, isSignOutIntentional: true });
    try {
      const user = get().user;
      if (user) {
        await supabaseClient
          .from('push_tokens')
          .delete()
          .eq('user_id', user.id);
      }
      await supabaseClient.auth.signOut();
    } finally {
      const currentUnsubscribe = get().productsChannelUnsubscribe;
      if (currentUnsubscribe) {
        currentUnsubscribe();
      }
      const currentTimeout = get().productsReconnectTimeout;
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
      set({
        user: null,
        cartItems: [],
        wishlistItems: [],
        orders: [],
        preferences: null,
        products: [],
        authLoading: false,
        isSignOutIntentional: false,
        productsChannelUnsubscribe: null,
        productsReconnectTimeout: null,
        productsReconnectAttempts: 0,
      });
    }
  },

  checkAuth: async () => {
    set({ authLoading: true });
    try {
      const res = await supabaseClient.auth.getUser();
      const mappedUser = mapAuthUser(res.data.user);
      set({ user: mappedUser, authLoading: false });
      if (mappedUser) {
        await get().fetchUserPreferences();
        await get().fetchCart();
        await get().fetchWishlist();
        await get().subscribeToProducts();
      } else {
        await get().fetchCart();
        get().unsubscribeFromProducts();
        set({ products: [] });
      }
    } catch (err) {
      console.error('[useAppStore] checkAuth Error:', err);
      set({ user: null, authLoading: false });
      get().unsubscribeFromProducts();
      set({ products: [] });
      await get().fetchCart();
    }
  },

  initializeAuthListener: () => {
    if (authListenerUnsubscribe) {
      authListenerUnsubscribe();
      authListenerUnsubscribe = null;
    }

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log(`Supabase Auth state changed event: ${event}`);
      const currentUser = session ? mapAuthUser(session.user) : null;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        set({ user: currentUser, authLoading: false, authError: null });
        if (currentUser) {
          await get().mergeGuestCartIntoUserCart(currentUser.id);
          await get().fetchUserPreferences();
          await get().fetchCart();
          await get().fetchWishlist();
          await get().subscribeToProducts();
        }
      } else if (event === 'SIGNED_OUT') {
        const wasLoggedIn = !!get().user;
        const intentional = get().isSignOutIntentional;

        if (wasLoggedIn && !intentional) {
          set({ authError: 'Your session has expired. Please log in again.' });
        }

        get().unsubscribeFromProducts();
        set({ user: null, cartItems: [], wishlistItems: [], orders: [], preferences: null, products: [] });
      } else if (event === 'PASSWORD_RECOVERY') {
        set({ isRecoveringPassword: true });
      }
    });

    authListenerUnsubscribe = () => subscription.unsubscribe();
  },
  cleanupAuthListener: () => {
    if (authListenerUnsubscribe) {
      authListenerUnsubscribe();
      authListenerUnsubscribe = null;
    }
  },

  subscribeToProducts: () => {
    const state = get();
    if (state.productsReconnectTimeout) {
      clearTimeout(state.productsReconnectTimeout);
      set({ productsReconnectTimeout: null });
    }

    if (state.productsChannelUnsubscribe) {
      state.productsChannelUnsubscribe();
      set({ productsChannelUnsubscribe: null });
    }

    set({ productsReconnectAttempts: 0 });

    const user = get().user;
    if (!user) {
      console.log('[realtime] skip subscribe: no user');
      return;
    }

    const scheduleReconnect = () => {
      const currentAttempts = get().productsReconnectAttempts;
      if (currentAttempts >= get().MAX_PRODUCTS_RECONNECT_ATTEMPTS) {
        console.warn('[realtime] max reconnect attempts reached, giving up');
        return;
      }

      const delay = get().PRODUCTS_RECONNECT_BASE_DELAY * Math.pow(2, currentAttempts);
      set({ productsReconnectAttempts: currentAttempts + 1 });
      console.log(`[realtime] scheduling reconnect attempt ${currentAttempts + 1} in ${delay}ms`);

      const timeoutId = setTimeout(() => {
        set({ productsReconnectTimeout: null });
        const currentUser = get().user;
        if (!currentUser) {
          console.log('[realtime] skip reconnect: no user');
          return;
        }

        const currentUnsubscribe = get().productsChannelUnsubscribe;
        if (currentUnsubscribe) {
          currentUnsubscribe();
        }
        set({ productsChannelUnsubscribe: null });
        get().subscribeToProducts();
      }, delay);

      set({ productsReconnectTimeout: timeoutId });
    };

    const channel = supabaseClient
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('[realtime] products change:', payload.eventType, payload.new || payload.old);
          const currentProducts = get().products;

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const incoming = payload.new as any;
            const mapped = mapProduct(incoming);
            const exists = currentProducts.find((p) => p.id === mapped.id);
            const next = exists
              ? currentProducts.map((p) => p.id === mapped.id ? mapped : p)
              : [...currentProducts, mapped];
            set({ products: next });
            productCacheService.saveProducts(next);
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            const next = currentProducts.filter((p) => p.id !== oldId);
            set({ products: next });
            productCacheService.saveProducts(next);
          }
        },
      )
      .subscribe((status, err) => {
        console.log('[realtime] products channel status:', status, err || '');

        if (status === 'SUBSCRIBED') {
          set({ productsReconnectAttempts: 0 });
          const currentUser = get().user;
          if (currentUser) {
            get().fetchProducts().catch((fetchErr) => {
              console.error('[realtime] failed to re-fetch products after reconnect:', fetchErr);
            });
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[realtime] channel ${status}, attempting reconnect...`);
          scheduleReconnect();
        }
      });

    set({
      productsChannelUnsubscribe: () => {
        set({ productsReconnectAttempts: 0 });
        const currentTimeout = get().productsReconnectTimeout;
        if (currentTimeout) {
          clearTimeout(currentTimeout);
        }
        set({ productsReconnectTimeout: null });
        supabaseClient.removeChannel(channel);
      },
    });
  },

  unsubscribeFromProducts: () => {
    const currentUnsubscribe = get().productsChannelUnsubscribe;
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }
    const currentTimeout = get().productsReconnectTimeout;
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }
    set({
      productsChannelUnsubscribe: null,
      productsReconnectTimeout: null,
      productsReconnectAttempts: 0,
    });
  },

  setRecoveringPassword: (val) => {
    set({ isRecoveringPassword: val });
  },

  registerPushToken: async (token, platform) => {
    const user = get().user;
    if (!user) return;

    try {
      const { error } = await supabaseClient
        .from('push_tokens')
        .upsert(
          {
            user_id: user.id,
            token,
            platform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'token' },
        );
      if (error) throw error;
      console.log('Push token registered successfully in database.');
    } catch (err) {
      console.error('Failed to register push token:', err);
    }
  },

  fetchUserPreferences: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const { data, error } = await supabaseClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        set({ preferences: data });
      }
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
    }
  },

  updateUserPreferences: async (prefs) => {
    const user = get().user;
    if (!user) return;
    const current = get().preferences || { user_id: user.id, order_notifications: true, promo_notifications: false, cart_reminders: true };
    const updated = { ...current, ...prefs };

    set({ preferences: updated });

    try {
      const { error } = await supabaseClient
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          order_notifications: updated.order_notifications,
          promo_notifications: updated.promo_notifications,
          cart_reminders: updated.cart_reminders,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save preferences, rolling back:', err);
      set({ preferences: current });
      Alert.alert('Sync Error', 'Failed to update preferences on the server.');
    }
  },
});
