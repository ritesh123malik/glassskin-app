import { WishlistItem } from '../../types';
import { supabaseClient, SecureStoreAdapter } from '../../services/supabaseClient';
import { generateId, mapProduct } from '../helpers';

export interface WishlistSlice {
  wishlistItems: WishlistItem[];
  wishlistLoading: boolean;
  fetchWishlist: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  isProductWishlisted: (productId: string) => boolean;
}

export const wishlistSlice = (set: any, get: any): WishlistSlice => ({
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
      })).filter((item) => item.product !== undefined);

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

    const { wishlistItems, products } = get();
    const existingIndex = wishlistItems.findIndex((item) => item.product_id === productId);
    const updatedItems = [...wishlistItems];

    if (existingIndex !== -1) {
      updatedItems.splice(existingIndex, 1);
    } else {
      let targetProduct = products.find((p) => p.id === productId);
      if (!targetProduct) {
        const res = await supabaseClient.from('products').select('*').eq('id', productId).single();
        if (!res.error && res.data) targetProduct = res.data;
      }
      if (targetProduct) {
        updatedItems.push({
          id: generateId(),
          user_id: '',
          product_id: productId,
          created_at: new Date().toISOString(),
          product: targetProduct,
        });
      }
    }
    set({ wishlistItems: updatedItems });
    await SecureStoreAdapter.setItem('guest_wishlist', JSON.stringify(updatedItems));
  },

  isProductWishlisted: (productId) => {
    return get().wishlistItems.some((item) => item.product_id === productId);
  },
});
