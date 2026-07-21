import { CartItem } from '../../types';
import { supabaseClient, SecureStoreAdapter } from '../../services/supabaseClient';
import { generateId, mapProduct } from '../helpers';

export interface CartSlice {
  cartItems: CartItem[];
  cartLoading: boolean;
  appliedPromo: { code: string; discountType: 'percent' | 'fixed'; discountValue: number; discountAmount: number } | null;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateCartQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: () => void;
  getCartTotals: () => { subtotal: number; tax: number; shipping: number; discount: number; total: number };
  mergeGuestCartIntoUserCart: (userId: string) => Promise<void>;
  clearCartLocally: () => Promise<void>;
}

export const cartSlice = (set: any, get: any): CartSlice => ({
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
    let targetProduct = products.find((p) => p.id === productId);

    if (!targetProduct) {
      const res = await supabaseClient.from('products').select('*').eq('id', productId).single();
      if (!res.error && res.data) {
        targetProduct = res.data;
      }
    }
    if (!targetProduct) return;

    const updatedItems = [...cartItems];
    const existingIndex = updatedItems.findIndex((item) => item.product_id === productId);

    if (existingIndex !== -1) {
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + quantity,
      };
    } else {
      updatedItems.push({
        id: generateId(),
        user_id: '',
        product_id: productId,
        quantity,
        created_at: new Date().toISOString(),
        product: targetProduct,
      });
    }

    set({ cartItems: updatedItems });
    await SecureStoreAdapter.setItem('guest_cart', JSON.stringify(updatedItems));
  },

  updateCartQuantity: async (itemId, quantity) => {
    const user = get().user;
    const previousItems = get().cartItems;

    if (quantity <= 0) {
      set({ cartItems: previousItems.filter((item) => item.id !== itemId) });
    } else {
      set({
        cartItems: previousItems.map((item) =>
          item.id === itemId ? { ...item, quantity } : item,
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

    set({ cartItems: previousItems.filter((item) => item.id !== itemId) });

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
              quantity: item.quantity,
            });
        }
      }

      await SecureStoreAdapter.removeItem('guest_cart');
    } catch (err) {
      console.error('Error merging guest cart:', err);
    }
  },

  applyPromoCode: async (code) => {
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

      set({
        appliedPromo: {
          code: data.code,
          discountType: data.discount_type,
          discountValue: data.discount_value,
          discountAmount: data.discount_amount,
        },
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

  getCartTotals: () => {
    const { cartItems, appliedPromo } = get();
    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + price * item.quantity;
    }, 0);

    const discount = appliedPromo ? appliedPromo.discountAmount : 0;
    const tax = parseFloat(((subtotal - discount) * 0.07).toFixed(2));

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
});
