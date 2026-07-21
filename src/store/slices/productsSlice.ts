import { Product } from '../../types';
import { supabaseClient } from '../../services/supabaseClient';
import { productCacheService } from '../../services/productCacheService';
import { mapProduct } from '../helpers';

export interface ProductsSlice {
  products: Product[];
  currentProduct: Product | null;
  productsLoading: boolean;
  productsError: string | null;
  isOffline: boolean;
  fetchProducts: (filters?: any, forceRefresh?: boolean) => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
}

export const productsSlice = (set: any, get: any): ProductsSlice => ({
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
      if (cached && cached.length > 0 && productCacheService.isCacheValid()) {
        let filtered = [...cached];
        if (filters) {
          const { search, category, skinTypes, certifications, priceRange, sortBy } = filters;
          if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(
              (p) =>
                p.name.toLowerCase().includes(searchLower) ||
                (p.description && p.description.toLowerCase().includes(searchLower)),
            );
          }
          if (category && category !== 'All') {
            filtered = filtered.filter((p) => p.category === category);
          }
          if (skinTypes && skinTypes.length > 0) {
            filtered = filtered.filter(
              (p) => p.skin_types && p.skin_types.some((t) => skinTypes.includes(t)),
            );
          }
          if (certifications && certifications.length > 0) {
            filtered = filtered.filter(
              (p) => p.certifications && certifications.every((c: string) => p.certifications?.includes(c)),
            );
          }
          if (priceRange) {
            filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
          }
          if (sortBy) {
            if (sortBy === 'price-low') {
              filtered.sort((a, b) => a.price - b.price);
            } else if (sortBy === 'price-high') {
              filtered.sort((a, b) => b.price - a.price);
            } else if (sortBy === 'newest') {
              filtered.sort(
                (a, b) =>
                  new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
              );
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
          query = query.overlaps('skin_types', skinTypes);
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

      if (
        !filters ||
        (!filters.search &&
          !filters.category &&
          (!filters.skinTypes || skinTypes.length === 0) &&
          (!filters.certifications || certifications.length === 0))
      ) {
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
            filtered = filtered.filter(
              (p) =>
                p.name.toLowerCase().includes(searchLower) ||
                (p.description && p.description.toLowerCase().includes(searchLower)),
            );
          }
          if (category && category !== 'All') {
            filtered = filtered.filter((p) => p.category === category);
          }
          if (skinTypes && skinTypes.length > 0) {
            filtered = filtered.filter(
              (p) => p.skin_types && p.skin_types.some((t) => skinTypes.includes(t)),
            );
          }
          if (certifications && certifications.length > 0) {
            filtered = filtered.filter(
              (p) => p.certifications && certifications.every((c: string) => p.certifications?.includes(c)),
            );
          }
          if (priceRange) {
            filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
          }
          if (sortBy) {
            if (sortBy === 'price-low') {
              filtered.sort((a, b) => a.price - b.price);
            } else if (sortBy === 'price-high') {
              filtered.sort((a, b) => b.price - a.price);
            } else if (sortBy === 'newest') {
              filtered.sort(
                (a, b) =>
                  new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
              );
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
});
