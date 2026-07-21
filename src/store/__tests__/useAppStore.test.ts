import { useAppStore } from '../useAppStore';
import { supabaseClient } from '../../services/supabaseClient';

// Mock the supabase client
jest.mock('../../services/supabaseClient', () => ({
  supabaseClient: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    rpc: jest.fn(),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    }),
    removeChannel: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signInAnonymously: jest.fn(),
    },
  },
  SecureStoreAdapter: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('useAppStore Zustand Store Unit Tests', () => {
  // Clear the store state before each test
  beforeEach(() => {
    useAppStore.setState({
      user: null,
      cartItems: [],
      appliedPromo: null,
      products: [
        {
          id: 'prod-1',
          name: 'Super Hydrator',
          description: 'A hydrating serum.',
          price: 30.00,
          category: 'Skincare',
          skin_types: ['dry'],
          certifications: ['organic'],
          image_url: '',
          stock_quantity: 10,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'prod-2',
          name: 'Daily Cleanser',
          description: 'A gentle cleanser.',
          price: 15.00,
          category: 'Skincare',
          skin_types: ['sensitive'],
          certifications: ['vegan'],
          image_url: '',
          stock_quantity: 5,
          created_at: '',
          updated_at: '',
        }
      ],
    });
  });

  describe('getCartTotals', () => {
    it('should return all zeros for an empty cart', () => {
      const totals = useAppStore.getState().getCartTotals();
      expect(totals.subtotal).toBe(0);
      expect(totals.tax).toBe(0);
      expect(totals.shipping).toBe(0);
      expect(totals.discount).toBe(0);
      expect(totals.total).toBe(0);
    });

    it('should calculate subtotal correctly with items', () => {
      const state = useAppStore.getState();
      useAppStore.setState({
        cartItems: [
          { id: '1', user_id: 'guest', product_id: 'prod-1', quantity: 2, product: state.products[0], created_at: '' },
          { id: '2', user_id: 'guest', product_id: 'prod-2', quantity: 1, product: state.products[1], created_at: '' },
        ]
      });

      const totals = useAppStore.getState().getCartTotals();
      // 2 * 30 + 1 * 15 = 75.00
      expect(totals.subtotal).toBe(75.00);
      expect(totals.discount).toBe(0);
      // Tax = (75 - 0) * 0.07 = 5.25 (display estimate)
      expect(totals.tax).toBe(5.25);
      // Subtotal after discount = 75 >= 50, so free shipping
      expect(totals.shipping).toBe(0);
      // Total = 75 + 5.25 + 0 = 80.25
      expect(totals.total).toBe(80.25);
    });

    it('should charge shipping if subtotal is below $50', () => {
      const state = useAppStore.getState();
      useAppStore.setState({
        cartItems: [
          { id: '1', user_id: 'guest', product_id: 'prod-2', quantity: 2, product: state.products[1], created_at: '' }, // 2 * 15 = 30.00
        ]
      });

      const totals = useAppStore.getState().getCartTotals();
      expect(totals.subtotal).toBe(30.00);
      expect(totals.shipping).toBe(5.99);
      // Tax = 30.00 * 0.07 = 2.10 (default 7% estimate)
      expect(totals.tax).toBe(2.10);
      // Total = 30 + 5.99 + 2.10 = 38.09
      expect(totals.total).toBe(38.09);
    });
  });

  describe('Promo Codes & Discount Application (server-side RPC)', () => {
    const mockRpc = supabaseClient.rpc as jest.Mock;

    beforeEach(() => {
      mockRpc.mockReset();
    });

    it('should apply discount when server validates GLASSSKIN20', async () => {
      // Mock server returning a valid 20% discount response
      mockRpc.mockResolvedValueOnce({
        data: { valid: true, code: 'GLASSSKIN20', discount_type: 'percent', discount_value: 20, discount_amount: 12.00 },
        error: null,
      });
      const applied = await useAppStore.getState().applyPromoCode('GLASSSKIN20');
      expect(applied).toBe(true);
      expect(useAppStore.getState().appliedPromo?.code).toBe('GLASSSKIN20');
      expect(useAppStore.getState().appliedPromo?.discountAmount).toBe(12.00);
      expect(useAppStore.getState().appliedPromo?.discountType).toBe('percent');
    });

    it('should apply 10% discount when server validates GLOW10', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { valid: true, code: 'GLOW10', discount_type: 'percent', discount_value: 10, discount_amount: 6.00 },
        error: null,
      });
      const applied = await useAppStore.getState().applyPromoCode('GLOW10');
      expect(applied).toBe(true);
      expect(useAppStore.getState().appliedPromo?.code).toBe('GLOW10');
    });

    it('should return false when server rejects invalid promo code', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { valid: false, error: 'Promo code not found or inactive' },
        error: null,
      });
      const applied = await useAppStore.getState().applyPromoCode('INVALID_CODE');
      expect(applied).toBe(false);
      expect(useAppStore.getState().appliedPromo).toBeNull();
    });

    it('should return false when server returns a Supabase RPC error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC execution error' },
      });
      const applied = await useAppStore.getState().applyPromoCode('GLASSSKIN20');
      expect(applied).toBe(false);
    });

    it('should calculate totals using server-returned discountAmount (not a percent)', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { valid: true, code: 'GLASSSKIN20', discount_type: 'percent', discount_value: 20, discount_amount: 12.00 },
        error: null,
      });
      const state = useAppStore.getState();
      useAppStore.setState({
        cartItems: [
          { id: '1', user_id: 'guest', product_id: 'prod-1', quantity: 2, product: state.products[0], created_at: '' }, // $60.00
        ]
      });

      await useAppStore.getState().applyPromoCode('GLASSSKIN20'); // server says $12.00

      const totals = useAppStore.getState().getCartTotals();
      expect(totals.subtotal).toBe(60.00);
      expect(totals.discount).toBe(12.00); // server-provided value, not client-computed
      // Taxable = 60 - 12 = 48.00. Tax = 48.00 * 0.07 = 3.36 (display estimate)
      expect(totals.tax).toBe(3.36);
      // 48 < 50 → shipping = 5.99
      expect(totals.shipping).toBe(5.99);
    });

    it('should clear promo code on removePromoCode call', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { valid: true, code: 'GLASSSKIN20', discount_type: 'percent', discount_value: 20, discount_amount: 12.00 },
        error: null,
      });
      await useAppStore.getState().applyPromoCode('GLASSSKIN20');
      expect(useAppStore.getState().appliedPromo).not.toBeNull();
      useAppStore.getState().removePromoCode();
      expect(useAppStore.getState().appliedPromo).toBeNull();
    });
  });

  describe('Cart Item Quantity Management', () => {
    it('should remove item from cart if updated quantity is 0 or negative', async () => {
      const state = useAppStore.getState();
      useAppStore.setState({
        cartItems: [
          { id: 'item-1', user_id: 'guest', product_id: 'prod-1', quantity: 2, product: state.products[0], created_at: '' }
        ]
      });

      await useAppStore.getState().updateCartQuantity('item-1', 0);
      expect(useAppStore.getState().cartItems).toHaveLength(0);

      useAppStore.setState({
        cartItems: [
          { id: 'item-1', user_id: 'guest', product_id: 'prod-1', quantity: 2, product: state.products[0], created_at: '' }
        ]
      });
      await useAppStore.getState().updateCartQuantity('item-1', -5);
      expect(useAppStore.getState().cartItems).toHaveLength(0);
    });
  });

  describe('Order Creation, Fetching, and Payment integration flow tests', () => {
    const mockRpc = supabaseClient.rpc as jest.Mock;
    const mockFrom = supabaseClient.from as jest.Mock;

    beforeEach(() => {
      mockRpc.mockReset();
      mockFrom.mockReset();
      // Setup default mock states
      supabaseClient.functions = {
        invoke: jest.fn(),
      } as any;
    });

    it('should successfully call createOrder and return the created order', async () => {
      // Mock user is signed in
      useAppStore.setState({
        user: { id: 'user-123', email: 'test@example.com', full_name: 'Test', phone: '', created_at: '', updated_at: '' },
        cartItems: [
          { id: '1', user_id: 'user-123', product_id: 'prod-1', quantity: 2, product: useAppStore.getState().products[0], created_at: '' }
        ]
      });

      mockRpc.mockResolvedValueOnce({
        data: {
          total_amount: 64.20,
          tax_amount: 4.20,
          shipping_amount: 0.00,
          discount_amount: 0.00,
        },
        error: null
      });

      mockRpc.mockResolvedValueOnce({
        data: {
          id: 'GS-123456',
          user_id: 'user-123',
          status: 'payment_pending',
          total_amount: 64.20,
          tax_amount: 4.20,
          shipping_amount: 0.00,
          discount_amount: 0.00,
          shipping_address: { fullName: 'Test', addressLine1: '123 Main St', city: 'LA', state: 'CA', postalCode: '90001', country: 'USA' },
          payment_method: 'card',
          created_at: new Date().toISOString()
        },
        error: null
      });

      // Mock fetchOrders from() chain
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      });

      const order = await useAppStore.getState().createOrder(
        { fullName: 'Test', addressLine1: '123 Main St', city: 'LA', state: 'CA', postalCode: '90001', country: 'USA' },
        'card'
      );

      expect(order).not.toBeNull();
      expect(order?.id).toBe('GS-123456');
      expect(order?.total_amount).toBe(64.20);
      expect(mockRpc).toHaveBeenCalledWith('create_order_transaction', expect.objectContaining({
        p_user_id: 'user-123',
        p_shipping_address: expect.objectContaining({ state: 'CA' }),
        p_payment_method: 'card',
        p_promo_code: null,
      }));
      const [, computeArgs] = mockRpc.mock.calls[0];
      expect(computeArgs).not.toHaveProperty('p_total_amount');
      expect(computeArgs).not.toHaveProperty('p_tax_amount');
      expect(computeArgs).not.toHaveProperty('p_shipping_amount');
      expect(computeArgs).not.toHaveProperty('p_discount_amount');
      const [, createArgs] = mockRpc.mock.calls[1];
      expect(createArgs).toHaveProperty('p_total_amount');
      expect(createArgs).toHaveProperty('p_tax_amount');
      expect(createArgs).toHaveProperty('p_shipping_amount');
      expect(createArgs).toHaveProperty('p_discount_amount');
    });

    it('should handle order creation failures gracefully', async () => {
      useAppStore.setState({
        user: { id: 'user-123', email: 'test@example.com', full_name: 'Test', phone: '', created_at: '', updated_at: '' },
      });
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database transaction error' }
      });

      const order = await useAppStore.getState().createOrder(
        { fullName: 'Test', addressLine1: '123 Main St', city: 'LA', state: 'CA', postalCode: '90001', country: 'USA' },
        'card'
      );
      expect(order).toBeNull();
    });

    it('should fetch orders correctly', async () => {
      useAppStore.setState({
        user: { id: 'user-123', email: 'test@example.com', full_name: 'Test', phone: '', created_at: '', updated_at: '' }
      });

      const mockData = [
        {
          id: 'GS-123456',
          user_id: 'user-123',
          status: 'pending',
          total_amount: 100.00,
          items: [
            { id: 'item-1', order_id: 'GS-123456', product_id: 'prod-1', product_name: 'Super Hydrator', price: 50.00, quantity: 2, created_at: '' }
          ]
        }
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      });

      await useAppStore.getState().fetchOrders();
      expect(useAppStore.getState().orders).toHaveLength(1);
      expect(useAppStore.getState().orders[0].id).toBe('GS-123456');
    });

    it('should login anonymously using signInAsGuest', async () => {
      const mockSignInAnonymously = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'guest-uuid-123',
            email: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            raw_app_meta_data: { provider: 'anonymous' },
            raw_user_meta_data: {}
          }
        },
        error: null
      });
      supabaseClient.auth.signInAnonymously = mockSignInAnonymously;

      const success = await useAppStore.getState().signInAsGuest();
      expect(success).toBe(true);
      expect(useAppStore.getState().user?.id).toBe('guest-uuid-123');
      expect(useAppStore.getState().user?.email).toBe('');
    });

    it('should fetch stripe payment sheet params correctly', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        data: { paymentIntent: 'pi_test', ephemeralKey: 'ek_test', publishableKey: 'pk_test' },
        error: null
      });
      supabaseClient.functions.invoke = mockInvoke;

      const params = await useAppStore.getState().fetchStripePaymentSheetParams('GS-123');
      expect(params).toEqual({ paymentIntent: 'pi_test', ephemeralKey: 'ek_test', publishableKey: 'pk_test' });
      expect(mockInvoke).toHaveBeenCalledWith('create-payment-intent', { body: { orderId: 'GS-123' } });
    });

    it('should create paypal checkout order correctly', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        data: { approvalUrl: 'https://paypal.com/approve' },
        error: null
      });
      supabaseClient.functions.invoke = mockInvoke;

      const res = await useAppStore.getState().createPayPalCheckoutOrder('GS-123');
      expect(res).toEqual({ approvalUrl: 'https://paypal.com/approve' });
      expect(mockInvoke).toHaveBeenCalledWith('paypal-checkout/create', { body: { orderId: 'GS-123' } });
    });

    it('should capture paypal checkout order correctly and clear cart', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        data: { success: true },
        error: null
      });
      supabaseClient.functions.invoke = mockInvoke;

      useAppStore.setState({
        cartItems: [{ id: '1', product_id: 'prod-1', quantity: 1, created_at: '' }]
      });

      const success = await useAppStore.getState().capturePayPalCheckoutOrder('GS-123', 'PAYPAL-ORDER-789');
      expect(success).toBe(true);
      expect(useAppStore.getState().cartItems).toHaveLength(0);
      expect(mockInvoke).toHaveBeenCalledWith('paypal-checkout/capture', { body: { orderId: 'GS-123', paypalOrderId: 'PAYPAL-ORDER-789' } });
    });
  });
});
