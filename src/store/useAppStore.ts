import { create } from 'zustand';
import { User, Product, CartItem, WishlistItem, Order, ShippingAddress } from '../types';
import { supabaseClient, SecureStoreAdapter } from '../services/supabaseClient';
import { User as AuthUser } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { productCacheService } from '../services/productCacheService';

// WebBrowser setup for OAuth
WebBrowser.maybeCompleteAuthSession();

// Helper to map Supabase Auth User to our App User type
const mapAuthUser = (authUser: AuthUser | null): User | null => {
  if (!authUser) return null;
  return {
    id: authUser.id,
    email: authUser.email || '',
    full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
    phone: authUser.phone || '',
    is_anonymous: authUser.is_anonymous,
    created_at: authUser.created_at,
    updated_at: authUser.updated_at || authUser.created_at,
  };
};

// Helper to map DB Product row to UI Product type
const mapProduct = (p: any): Product => {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    price: parseFloat(p.price),
    compare_at_price: p.compare_at_price ? parseFloat(p.compare_at_price) : undefined,
    category: p.category || '',
    tags: p.tags || [],
    images: p.images || [],
    stock_quantity: p.stock_quantity || 0,
    rating: parseFloat(p.rating || 0),
    review_count: p.review_count || 0,
    skin_types: p.skin_types || [],
    certifications: p.certifications || [],
    ingredients: p.ingredients || '',
    usage: p.usage || '',
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
};

// Helper to map auth error messages to friendly rate-limit-aware strings
const handleAuthError = (err: any): string => {
  if (!err) return 'An unknown error occurred';
  if (err.status === 429 || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('too many requests')) {
    return 'Too many attempts. Please try again in a few minutes.';
  }
  const msg = err.message || '';
  if (msg.includes('Invalid login credentials')) {
    return 'Wrong password or email. Please verify your credentials.';
  }
  if (msg.includes('User not found') || msg.includes('Email not found')) {
    return 'Account not found. Please sign up first.';
  }
  if (msg.includes('already registered') || msg.includes('Email already exists')) {
    return 'This email is already registered. Please sign in instead.';
  }
  return msg;
};

interface UserPreferences {
  user_id: string;
  order_notifications: boolean;
  promo_notifications: boolean;
  cart_reminders: boolean;
}

interface AppState {
  // Auth State
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  isSignOutIntentional: boolean;
  isRecoveringPassword: boolean;
  preferences: UserPreferences | null;
  
  signUp: (email: string, password: string, fullName?: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithSocial: (provider: 'google' | 'apple') => Promise<boolean>;
  /**
   * Signs the user in as an anonymous Supabase session via signInAnonymously().
   * This gives the guest a real auth.uid() so that guest orders have a non-NULL
   * user_id and are scoped by standard RLS (auth.uid() = user_id).
   * "Guest" means no email/password was collected — not that user_id is NULL.
   */
  signInAsGuest: () => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  initializeAuthListener: () => void;
  setRecoveringPassword: (val: boolean) => void;
  registerPushToken: (token: string, platform: 'ios' | 'android' | 'web') => Promise<void>;
  fetchUserPreferences: () => Promise<void>;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;

  // Products State
  products: Product[];
  currentProduct: Product | null;
  productsLoading: boolean;
  productsError: string | null;
  isOffline: boolean;
  fetchProducts: (filters?: any, forceRefresh?: boolean) => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;

  // Cart State
  cartItems: CartItem[];
  cartLoading: boolean;
  // appliedPromo stores ONLY what the server validated — client cannot inject arbitrary values
  appliedPromo: { code: string; discountType: 'percent' | 'fixed'; discountValue: number; discountAmount: number } | null;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateCartQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: () => void;
  // getCartTotals is DISPLAY-ONLY preview — server recomputes authoritatively during order creation
  getCartTotals: () => { subtotal: number; tax: number; shipping: number; discount: number; total: number };
  mergeGuestCartIntoUserCart: (userId: string) => Promise<void>;
  clearCartLocally: () => Promise<void>;

  // Wishlist State
  wishlistItems: WishlistItem[];
  wishlistLoading: boolean;
  fetchWishlist: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  isProductWishlisted: (productId: string) => boolean;

  // Orders State
  orders: Order[];
  ordersLoading: boolean;
  currentOrder: Order | null;
  fetchOrders: () => Promise<void>;
  createOrder: (shippingAddress: ShippingAddress, paymentMethod: string, promoCode?: string) => Promise<Order | null>;
  fetchOrderById: (id: string) => Promise<void>;

  // Payments Actions
  fetchStripePaymentSheetParams: (orderId: string) => Promise<{ paymentIntent: string; ephemeralKey: string; publishableKey: string } | null>;
  createPayPalCheckoutOrder: (orderId: string) => Promise<{ approvalUrl: string; paypalOrderId: string } | null>;
  capturePayPalCheckoutOrder: (orderId: string, paypalOrderId: string) => Promise<boolean>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth State
  user: null,
  authLoading: false,
  authError: null,
  isSignOutIntentional: false,
  isRecoveringPassword: false,
  preferences: null,

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
      const redirectUrl = Linking.createURL('auth-callback');
      const res = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true
        }
      });
      if (res.error) throw res.error;

      if (res.data?.url) {
        const browserResult = await WebBrowser.openAuthSessionAsync(res.data.url, redirectUrl);
        if (browserResult.type === 'success') {
          const { url } = browserResult;
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const hash = url.substring(hashIndex + 1);
            const params: Record<string, string> = {};
            hash.split('&').forEach(pair => {
              const [k, v] = pair.split('=');
              if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
            });

            if (params.access_token && params.refresh_token) {
              const sessionRes = await supabaseClient.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token
              });
              if (sessionRes.error) throw sessionRes.error;
              const mappedUser = mapAuthUser(sessionRes.data.user);
              set({ user: mappedUser, authLoading: false });
              
              if (mappedUser) {
                await get().mergeGuestCartIntoUserCart(mappedUser.id);
                await get().fetchUserPreferences();
              }
              return true;
            }
          }
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
      // Anonymous users have a real JWT + auth.uid() but no email/profile row.
      // mapAuthUser handles missing email gracefully (returns '').
      const mappedUser = mapAuthUser(data.user);
      set({ user: mappedUser, authLoading: false, authError: null });
      // Anonymous users have no server-side cart or preferences to fetch.
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
        redirectTo: redirectUrl
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
      // Clear token registrations in database upon logout
      const user = get().user;
      if (user) {
        await supabaseClient
          .from('push_tokens')
          .delete()
          .eq('user_id', user.id);
      }
      await supabaseClient.auth.signOut();
    } finally {
      set({ 
        user: null, 
        cartItems: [], 
        wishlistItems: [], 
        orders: [], 
        preferences: null,
        authLoading: false, 
        isSignOutIntentional: false 
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
      } else {
        await get().fetchCart();
      }
    } catch (err) {
      console.error('[useAppStore] checkAuth Error:', err);
      set({ user: null, authLoading: false });
      await get().fetchCart();
    }
  },

  initializeAuthListener: () => {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log(`Supabase Auth state changed event: ${event}`);
      const currentUser = session ? mapAuthUser(session.user) : null;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        set({ user: currentUser, authLoading: false, authError: null });
        if (currentUser) {
          await get().mergeGuestCartIntoUserCart(currentUser.id);
          await get().fetchUserPreferences();
          await get().fetchCart();
          await get().fetchWishlist();
        }
      } else if (event === 'SIGNED_OUT') {
        const wasLoggedIn = !!get().user;
        const intentional = get().isSignOutIntentional;
        
        if (wasLoggedIn && !intentional) {
          set({ authError: 'Your session has expired. Please log in again.' });
        }
        
        set({ user: null, cartItems: [], wishlistItems: [], orders: [], preferences: null });
      } else if (event === 'PASSWORD_RECOVERY') {
        set({ isRecoveringPassword: true });
      }
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
            updated_at: new Date().toISOString()
          },
          { onConflict: 'token' }
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
    
    // Optimistic Update
    set({ preferences: updated });

    try {
      const { error } = await supabaseClient
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          order_notifications: updated.order_notifications,
          promo_notifications: updated.promo_notifications,
          cart_reminders: updated.cart_reminders,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save preferences, rolling back:', err);
      set({ preferences: current });
      Alert.alert('Sync Error', 'Failed to update preferences on the server.');
    }
  },

  // Products State
  products: [],
  currentProduct: null,
  productsLoading: false,
  productsError: null,
  isOffline: false,

  fetchProducts: async (filters, forceRefresh = false) => {
    set({ productsLoading: true, productsError: null });

    const isStale = productCacheService.isCacheStale();
    if (!forceRefresh && !isStale) {
      const cached = productCacheService.getCachedProducts();
      if (cached && cached.length > 0) {
        let filtered = [...cached];
        if (filters) {
          const { search, category, skinTypes, certifications, priceRange, sortBy } = filters;
          if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(p => 
              p.name.toLowerCase().includes(searchLower) || 
              (p.description && p.description.toLowerCase().includes(searchLower))
            );
          }
          if (category && category !== 'All') {
            filtered = filtered.filter(p => p.category === category);
          }
          if (skinTypes && skinTypes.length > 0) {
            filtered = filtered.filter(p => 
              p.skin_types && (p.skin_types.some(t => skinTypes.includes(t)) || p.skin_types.includes('all'))
            );
          }
          if (certifications && certifications.length > 0) {
            filtered = filtered.filter(p => 
              p.certifications && certifications.every((c: string) => p.certifications?.includes(c))
            );
          }
          if (priceRange) {
            filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
          }
          if (sortBy) {
            if (sortBy === 'price-low') {
              filtered.sort((a, b) => a.price - b.price);
            } else if (sortBy === 'price-high') {
              filtered.sort((a, b) => b.price - a.price);
            } else if (sortBy === 'newest') {
              filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            } else if (sortBy === 'rating') {
              filtered.sort((a, b) => b.rating - a.rating);
            }
          }
        }
        set({ products: filtered, productsLoading: false, isOffline: false });
        return;
      }
    }

    try {
      let query = supabaseClient.from('products').select('*');

      if (filters) {
        const { search, category, skinTypes, certifications, priceRange, sortBy } = filters;

        if (search) {
          const searchPattern = `%${search}%`;
          query = query.or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`);
        }

        if (category && category !== 'All') {
          query = query.eq('category', category);
        }

        if (skinTypes && skinTypes.length > 0) {
          query = query.or(`skin_types.overlaps.{${skinTypes.join(',')}},skin_types.cs.{all}`);
        }

        if (certifications && certifications.length > 0) {
          query = query.contains('certifications', certifications);
        }

        if (priceRange) {
          query = query.gte('price', priceRange[0]).lte('price', priceRange[1]);
        }

        if (sortBy) {
          if (sortBy === 'price-low') {
            query = query.order('price', { ascending: true });
          } else if (sortBy === 'price-high') {
            query = query.order('price', { ascending: false });
          } else if (sortBy === 'newest') {
            query = query.order('created_at', { ascending: false });
          } else if (sortBy === 'rating') {
            query = query.order('rating', { ascending: false });
          }
        }
      }

      const res = await query;
      if (res.error) throw res.error;

      const mappedProducts = (res.data || []).map((p: any) => mapProduct(p));
      
      if (!filters || (!filters.search && !filters.category && (!filters.skinTypes || filters.skinTypes.length === 0) && (!filters.certifications || filters.certifications.length === 0))) {
        productCacheService.saveProducts(mappedProducts);
      } else {
        if (isStale) {
          const fullRes = await supabaseClient.from('products').select('*');
          if (!fullRes.error && fullRes.data) {
            productCacheService.saveProducts(fullRes.data.map((p: any) => mapProduct(p)));
          }
        }
      }

      set({ products: mappedProducts, productsLoading: false, isOffline: false });
    } catch (err: any) {
      console.warn('Supabase fetch failed, trying local SQLite cache fallback:', err);
      const cached = productCacheService.getCachedProducts();
      if (cached && cached.length > 0) {
        let filtered = [...cached];
        if (filters) {
          const { search, category, skinTypes, certifications, priceRange, sortBy } = filters;
          if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(p => 
              p.name.toLowerCase().includes(searchLower) || 
              (p.description && p.description.toLowerCase().includes(searchLower))
            );
          }
          if (category && category !== 'All') {
            filtered = filtered.filter(p => p.category === category);
          }
          if (skinTypes && skinTypes.length > 0) {
            filtered = filtered.filter(p => 
              p.skin_types && (p.skin_types.some(t => skinTypes.includes(t)) || p.skin_types.includes('all'))
            );
          }
          if (certifications && certifications.length > 0) {
            filtered = filtered.filter(p => 
              p.certifications && certifications.every((c: string) => p.certifications?.includes(c))
            );
          }
          if (priceRange) {
            filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
          }
          if (sortBy) {
            if (sortBy === 'price-low') {
              filtered.sort((a, b) => a.price - b.price);
            } else if (sortBy === 'price-high') {
              filtered.sort((a, b) => b.price - a.price);
            } else if (sortBy === 'newest') {
              filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            } else if (sortBy === 'rating') {
              filtered.sort((a, b) => b.rating - a.rating);
            }
          }
        }
        set({ products: filtered, productsLoading: false, isOffline: true });
      } else {
        set({ productsError: err.message || 'Failed to fetch products', productsLoading: false, isOffline: true });
      }
    }
  },

  fetchProductById: async (id) => {
    set({ productsLoading: true, productsError: null });
    try {
      const res = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (res.error) throw res.error;

      const mappedProduct = mapProduct(res.data);
      set({ currentProduct: mappedProduct, productsLoading: false });
    } catch (err: any) {
      set({ productsError: err.message || 'Failed to fetch product', productsLoading: false });
    }
  },

  // Cart State
  cartItems: [],
  cartLoading: false,
  appliedPromo: null,

  fetchCart: async () => {
    const user = get().user;
    set({ cartLoading: true });
    
    if (user) {
      try {
        const res = await supabaseClient
          .from('cart_items')
          .select('*, product:products(*)')
          .eq('user_id', user.id);
        if (res.error) throw res.error;

        const mappedItems: CartItem[] = (res.data || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          product_id: item.product_id,
          quantity: item.quantity,
          created_at: item.created_at,
          product: item.product ? mapProduct(item.product) : undefined,
        }));

        set({ cartItems: mappedItems, cartLoading: false });
      } catch (err) {
        console.error('[useAppStore] fetchCart (user) Error:', err);
        set({ cartLoading: false });
      }
      return;
    }

    try {
      const guestCartJson = await SecureStoreAdapter.getItem('guest_cart');
      if (guestCartJson) {
        const parsed: CartItem[] = JSON.parse(guestCartJson);
        set({ cartItems: parsed, cartLoading: false });
      } else {
        set({ cartItems: [], cartLoading: false });
      }
    } catch (err) {
      console.error('[useAppStore] fetchCart (guest) Error:', err);
      set({ cartItems: [], cartLoading: false });
    }
  },

  addToCart: async (productId, quantity = 1) => {
    const user = get().user;
    
    if (user && !user.is_anonymous) {
      try {
        const res = await supabaseClient
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .maybeSingle();

        if (res.error) throw res.error;
        const existing = res.data;

        if (existing) {
          const updateRes = await supabaseClient
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);
          if (updateRes.error) throw updateRes.error;
        } else {
          const insertRes = await supabaseClient
            .from('cart_items')
            .insert({
              user_id: user.id,
              product_id: productId,
              quantity,
            });
          if (insertRes.error) throw insertRes.error;
        }
        await get().fetchCart();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    const { products, cartItems } = get();
    let targetProduct = products.find(p => p.id === productId);
    
    if (!targetProduct) {
      const res = await supabaseClient.from('products').select('*').eq('id', productId).single();
      if (!res.error && res.data) {
        targetProduct = res.data;
      }
    }
    if (!targetProduct) return;

    const updatedItems = [...cartItems];
    const existingIndex = updatedItems.findIndex(item => item.product_id === productId);

    if (existingIndex !== -1) {
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + quantity
      };
    } else {
      updatedItems.push({
        id: Math.random().toString(36).substring(2, 9),
        user_id: '',
        product_id: productId,
        quantity,
        created_at: new Date().toISOString(),
        product: targetProduct
      });
    }

    set({ cartItems: updatedItems });
    await SecureStoreAdapter.setItem('guest_cart', JSON.stringify(updatedItems));
  },

  updateCartQuantity: async (itemId, quantity) => {
    const user = get().user;
    const previousItems = get().cartItems;

    if (quantity <= 0) {
      set({ cartItems: previousItems.filter(item => item.id !== itemId) });
    } else {
      set({
        cartItems: previousItems.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        ),
      });
    }

    if (user && !user.is_anonymous) {
      try {
        if (quantity <= 0) {
          const res = await supabaseClient
            .from('cart_items')
            .delete()
            .eq('id', itemId);
          if (res.error) throw res.error;
        } else {
          const res = await supabaseClient
            .from('cart_items')
            .update({ quantity })
            .eq('id', itemId);
          if (res.error) throw res.error;
        }
        await get().fetchCart();
      } catch (err) {
        console.error('Failed to update cart quantity on server, rolling back:', err);
        set({ cartItems: previousItems });
        Alert.alert('Sync Error', 'Failed to update item quantity on the server. Please try again.');
      }
      return;
    }

    const guestItems = get().cartItems;
    await SecureStoreAdapter.setItem('guest_cart', JSON.stringify(guestItems));
  },

  removeFromCart: async (itemId) => {
    const user = get().user;
    const previousItems = get().cartItems;

    set({ cartItems: previousItems.filter(item => item.id !== itemId) });

    if (user && !user.is_anonymous) {
      try {
        const res = await supabaseClient
          .from('cart_items')
          .delete()
          .eq('id', itemId);
        if (res.error) throw res.error;
        await get().fetchCart();
      } catch (err) {
        console.error('Failed to remove cart item on server, rolling back:', err);
        set({ cartItems: previousItems });
        Alert.alert('Sync Error', 'Failed to remove item on the server. Please try again.');
      }
      return;
    }

    const guestItems = get().cartItems;
    await SecureStoreAdapter.setItem('guest_cart', JSON.stringify(guestItems));
  },

  mergeGuestCartIntoUserCart: async (userId) => {
    try {
      const guestCartJson = await SecureStoreAdapter.getItem('guest_cart');
      if (!guestCartJson) return;

      const guestItems: CartItem[] = JSON.parse(guestCartJson);
      if (guestItems.length === 0) return;

      console.log(`Merging ${guestItems.length} guest cart items...`);

      for (const item of guestItems) {
        const { data: existing, error: checkError } = await supabaseClient
          .from('cart_items')
          .select('*')
          .eq('user_id', userId)
          .eq('product_id', item.product_id)
          .maybeSingle();

        if (checkError) continue;

        if (existing) {
          await supabaseClient
            .from('cart_items')
            .update({ quantity: existing.quantity + item.quantity })
            .eq('id', existing.id);
        } else {
          await supabaseClient
            .from('cart_items')
            .insert({
              user_id: userId,
              product_id: item.product_id,
              quantity: item.quantity
            });
        }
      }

      await SecureStoreAdapter.removeItem('guest_cart');
    } catch (err) {
      console.error('Error merging guest cart:', err);
    }
  },

  applyPromoCode: async (code) => {
    // All validation is performed server-side via SECURITY DEFINER RPC.
    // Client code is NEVER the source of truth for discount amounts.
    const cartItems = get().cartItems;
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
    try {
      const { data, error } = await supabaseClient
        .rpc('validate_promo_code', { p_code: code.trim(), p_subtotal: subtotal });

      if (error) throw error;
      if (!data || !data.valid) {
        console.warn('Promo code rejected by server:', data?.error);
        return false;
      }

      // Store only what the server returned — never a client-computed amount
      set({
        appliedPromo: {
          code:           data.code,
          discountType:   data.discount_type,
          discountValue:  data.discount_value,
          discountAmount: data.discount_amount,
        }
      });
      return true;
    } catch (err) {
      console.error('applyPromoCode RPC error:', err);
      return false;
    }
  },

  removePromoCode: () => {
    set({ appliedPromo: null });
  },

  // DISPLAY-ONLY preview — uses server-validated discountAmount from appliedPromo.
  // Tax and shipping here are estimates only; the server recomputes authoritatively on order creation.
  getCartTotals: () => {
    const { cartItems, appliedPromo } = get();
    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + price * item.quantity;
    }, 0);

    // Use the server-returned discount amount — not a client-computed percentage
    const discount = appliedPromo ? appliedPromo.discountAmount : 0;
    const tax = parseFloat(((subtotal - discount) * 0.07).toFixed(2)); // Estimate: 7% default

    const isFreeShipping = (subtotal - discount) >= 50;
    const shipping = subtotal > 0 && !isFreeShipping ? 5.99 : 0;

    const total = parseFloat((subtotal - discount + tax + shipping).toFixed(2));

    return {
      subtotal,
      tax,
      shipping,
      discount,
      total: subtotal > 0 ? total : 0,
    };
  },

  clearCartLocally: async () => {
    set({ cartItems: [], appliedPromo: null });
    const user = get().user;
    if (!user || user.is_anonymous) {
      await SecureStoreAdapter.removeItem('guest_cart');
    }
  },

  // Wishlist State
  wishlistItems: [],
  wishlistLoading: false,

  fetchWishlist: async () => {
    const user = get().user;
    if (!user || user.is_anonymous) {
      set({ wishlistItems: [] });
      return;
    }
    set({ wishlistLoading: true });
    try {
      const res = await supabaseClient
        .from('wishlists')
        .select('*, product:products(*)')
        .eq('user_id', user.id);
      if (res.error) throw res.error;

      const mappedItems: WishlistItem[] = (res.data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        created_at: item.created_at,
        product: item.product ? mapProduct(item.product) : undefined,
      })).filter(item => item.product !== undefined);

      set({ wishlistItems: mappedItems, wishlistLoading: false });
    } catch (err) {
      console.error('[useAppStore] clearWishlist Error:', err);
      set({ wishlistLoading: false });
    }
  },

  toggleWishlist: async (productId) => {
    const user = get().user;
    
    if (user && !user.is_anonymous) {
      try {
      const res = await supabaseClient
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (res.error) throw res.error;
      const existing = res.data;

      if (existing) {
        const deleteRes = await supabaseClient
          .from('wishlists')
          .delete()
          .eq('id', existing.id);
        if (deleteRes.error) throw deleteRes.error;
      } else {
        const insertRes = await supabaseClient
          .from('wishlists')
          .insert({
            user_id: user.id,
            product_id: productId,
          });
        if (insertRes.error) throw insertRes.error;
      }
      await get().fetchWishlist();
    } catch (err) {
      console.error(err);
    }
    return;
    }
    
    // Guest wishlist fallback
    const { wishlistItems, products } = get();
    const existingIndex = wishlistItems.findIndex(item => item.product_id === productId);
    const updatedItems = [...wishlistItems];
    
    if (existingIndex !== -1) {
      updatedItems.splice(existingIndex, 1);
    } else {
      let targetProduct = products.find(p => p.id === productId);
      if (!targetProduct) {
        const res = await supabaseClient.from('products').select('*').eq('id', productId).single();
        if (!res.error && res.data) targetProduct = res.data;
      }
      if (targetProduct) {
        updatedItems.push({
          id: Math.random().toString(36).substring(2, 9),
          user_id: '',
          product_id: productId,
          created_at: new Date().toISOString(),
          product: targetProduct
        });
      }
    }
    set({ wishlistItems: updatedItems });
    await SecureStoreAdapter.setItem('guest_wishlist', JSON.stringify(updatedItems));
  },

  isProductWishlisted: (productId) => {
    return get().wishlistItems.some(item => item.product_id === productId);
  },

  // Orders State
  orders: [],
  ordersLoading: false,
  currentOrder: null,

  fetchOrders: async () => {
    const user = get().user;
    // Both authenticated and anonymous users have a real auth.uid() and can
    // fetch their own orders. Only skip when there is genuinely no session.
    if (!user) return;
    set({ ordersLoading: true });
    try {
      const res = await supabaseClient
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (res.error) throw res.error;

      const mappedOrders: Order[] = (res.data || []).map((order: any) => ({
        id: order.id,
        user_id: order.user_id || '',
        status: order.status as any,
        total_amount: parseFloat(order.total_amount as any),
        tax_amount: parseFloat(order.tax_amount as any),
        shipping_amount: parseFloat(order.shipping_amount as any),
        discount_amount: parseFloat(order.discount_amount as any),
        shipping_address: order.shipping_address as any,
        payment_method: order.payment_method,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id || '',
          product_name: item.product_name,
          price: parseFloat(item.price as any),
          quantity: item.quantity,
          created_at: item.created_at,
        })),
      }));

      set({ orders: mappedOrders, ordersLoading: false });
    } catch (err) {
      console.error('[useAppStore] fetchOrders Error:', err);
      set({ ordersLoading: false });
    }
  },

  createOrder: async (shippingAddress, paymentMethod, promoCode) => {
    const user = get().user;
    set({ ordersLoading: true });
    try {
      const totals = get().getCartTotals();
      const trackingId = 'GS-' + Math.floor(100000 + Math.random() * 900000).toString();
      const items = get().cartItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product?.name || 'Skincare Product',
        price: item.product?.price || 0,
        quantity: item.quantity,
      }));

      if (!user) {
        throw new Error('User session is required to create an order');
      }

      const res = await supabaseClient.rpc('create_order_transaction', {
        p_order_id: trackingId,
        // Guests now always have a real auth.uid() via signInAnonymously().
        // p_user_id is never null here — the checkout screen ensures signInAsGuest()
        // has been called before createOrder is invoked.
        p_user_id: user ? user.id : null,
        p_total_amount: totals.total,
        p_tax_amount: totals.tax,
        p_shipping_amount: totals.shipping,
        p_discount_amount: totals.discount,
        p_shipping_address: shippingAddress as any,
        p_payment_method: paymentMethod,
        p_items: items as any,
        p_promo_code: promoCode || null,
      });

      if (res.error) throw res.error;
      const data = res.data as any;

      await get().fetchOrders();
      set({ ordersLoading: false });

      const mappedOrder: Order = {
        id: data.id,
        user_id: data.user_id || '',
        status: data.status,
        total_amount: parseFloat(data.total_amount),
        tax_amount: parseFloat(data.tax_amount),
        shipping_amount: parseFloat(data.shipping_amount),
        discount_amount: parseFloat(data.discount_amount),
        shipping_address: data.shipping_address,
        payment_method: data.payment_method,
        created_at: data.created_at,
        updated_at: data.created_at,
      };

      return mappedOrder;
    } catch (err) {
      console.error('Checkout failed:', err);
      set({ ordersLoading: false });
      return null;
    }
  },

  fetchOrderById: async (id) => {
    set({ ordersLoading: true });
    try {
      const res = await supabaseClient
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', id)
        .single();
      if (res.error) throw res.error;
      const data = res.data;

      const mappedOrder: Order = {
        id: data.id,
        user_id: data.user_id || '',
        status: data.status as any,
        total_amount: parseFloat(data.total_amount as any),
        tax_amount: parseFloat(data.tax_amount as any),
        shipping_amount: parseFloat(data.shipping_amount as any),
        discount_amount: parseFloat(data.discount_amount as any),
        shipping_address: data.shipping_address as any,
        payment_method: data.payment_method,
        created_at: data.created_at,
        updated_at: data.updated_at,
        items: (data.items || []).map((item: any) => ({
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id || '',
          product_name: item.product_name,
          price: parseFloat(item.price as any),
          quantity: item.quantity,
          created_at: item.created_at,
        })),
      };

      set({ currentOrder: mappedOrder, ordersLoading: false });
    } catch (err) {
      console.error('[useAppStore] fetchOrderById Error:', err);
      set({ ordersLoading: false });
    }
  },

  // Payments actions
  fetchStripePaymentSheetParams: async (orderId) => {
    try {
      const { data, error } = await supabaseClient.functions.invoke('create-payment-intent', {
        body: { orderId }
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('fetchStripePaymentSheetParams error:', err);
      return null;
    }
  },

  createPayPalCheckoutOrder: async (orderId) => {
    try {
      const { data, error } = await supabaseClient.functions.invoke('paypal-checkout/create', {
        body: { orderId }
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('createPayPalCheckoutOrder error:', err);
      return null;
    }
  },

  capturePayPalCheckoutOrder: async (orderId, paypalOrderId) => {
    try {
      const { data, error } = await supabaseClient.functions.invoke('paypal-checkout/capture', {
        body: { orderId, paypalOrderId }
      });
      if (error) throw error;
      if (data?.success) {
        await get().clearCartLocally();
        return true;
      }
      return false;
    } catch (err) {
      console.error('capturePayPalCheckoutOrder error:', err);
      return false;
    }
  },
}));
