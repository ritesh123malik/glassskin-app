import { Order, ShippingAddress } from '../../types';
import { supabaseClient } from '../../services/supabaseClient';

export interface OrdersSlice {
  orders: Order[];
  ordersLoading: boolean;
  currentOrder: Order | null;
  fetchOrders: () => Promise<void>;
  createOrder: (shippingAddress: ShippingAddress, paymentMethod: string, promoCode?: string) => Promise<Order | null>;
  fetchOrderById: (id: string) => Promise<void>;

  fetchStripePaymentSheetParams: (orderId: string) => Promise<{ paymentIntent: string; ephemeralKey: string; publishableKey: string } | null>;
  createPayPalCheckoutOrder: (orderId: string) => Promise<{ approvalUrl: string; paypalOrderId: string } | null>;
  capturePayPalCheckoutOrder: (orderId: string, paypalOrderId: string) => Promise<boolean>;
}

export const ordersSlice = (set: any, get: any): OrdersSlice => ({
  orders: [],
  ordersLoading: false,
  currentOrder: null,

  fetchOrders: async () => {
    const user = get().user;
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
      const trackingId = 'GS-' + Math.floor(100000 + Math.random() * 900000).toString();
      const items = get().cartItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product?.name || 'Skincare Product',
        price: item.product?.price || 0,
        quantity: item.quantity,
      }));

      if (!user) {
        throw new Error('User session is required to create an order');
      }

      const { data: totalsData, error: totalsError } = await supabaseClient.rpc('compute_order_totals', {
        p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        p_promo_code: promoCode || null,
        p_state: shippingAddress.state || 'US',
      });

      if (totalsError) throw totalsError;

      const totals = totalsData as any;

      const res = await supabaseClient.rpc('create_order_transaction', {
        p_order_id: trackingId,
        p_user_id: user ? user.id : null,
        p_shipping_address: shippingAddress as any,
        p_payment_method: paymentMethod,
        p_items: items as any,
        p_promo_code: promoCode || null,
        p_total_amount: parseFloat(totals.total_amount),
        p_tax_amount: parseFloat(totals.tax_amount),
        p_shipping_amount: parseFloat(totals.shipping_amount),
        p_discount_amount: parseFloat(totals.discount_amount),
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

  fetchStripePaymentSheetParams: async (orderId) => {
    try {
      const { data, error } = await supabaseClient.functions.invoke('create-payment-intent', {
        body: { orderId },
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
        body: { orderId },
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
        body: { orderId, paypalOrderId },
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
});
