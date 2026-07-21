import { create } from 'zustand';
import { authSlice, type AuthSlice } from './slices/authSlice';
import { productsSlice, type ProductsSlice } from './slices/productsSlice';
import { cartSlice, type CartSlice } from './slices/cartSlice';
import { wishlistSlice, type WishlistSlice } from './slices/wishlistSlice';
import { ordersSlice, type OrdersSlice } from './slices/ordersSlice';

export type AppState = AuthSlice & ProductsSlice & CartSlice & WishlistSlice & OrdersSlice;

export const useAppStore = create<AppState>()((set, get) => ({
  ...authSlice(set, get),
  ...productsSlice(set, get),
  ...cartSlice(set, get),
  ...wishlistSlice(set, get),
  ...ordersSlice(set, get),
}));
