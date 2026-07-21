import { useAppStore } from '../useAppStore';
import { supabaseClient, SecureStoreAdapter } from '../../services/supabaseClient';

jest.mock('../../services/supabaseClient', () => ({
  supabaseClient: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
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
      signInWithPassword: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
  SecureStoreAdapter: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Checkout Flow Unit Tests', () => {
  beforeEach(() => {
    useAppStore.setState({
      user: { id: 'user-123', email: 'test@example.com', full_name: 'Test User', phone: '', created_at: '', updated_at: '' },
      cartItems: [],
      appliedPromo: null,
      orders: [],
      products: [
        {
          id: 'prod-1',
          name: 'Super Hydrator',
          description: 'A hydrating serum.',
          price: 30.00,
          category: 'Skincare',
          skin_types: ['dry'],
          certifications: ['organic'],
          images: ['https://example.com/image.jpg'],
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
          images: ['https://example.com/image2.jpg'],
          stock_quantity: 5,
          created_at: '',
          updated_at: '',
        }
      ],
    });
    jest.clearAllMocks();
  });

  describe('Cart Management', () => {
    it('should add item to cart for guest user', async () => {
      useAppStore.setState({ user: null });
      const mockProduct = useAppStore.getState().products[0];
      
      await useAppStore.getState().addToCart(mockProduct.id, 2);

      const cartItems = useAppStore.getState().cartItems;
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].product_id).toBe('prod-1');
      expect(cartItems[0].quantity).toBe(2);
    });

    it('should increase quantity when adding same item twice', async () => {
      useAppStore.setState({ user: null });
      const mockProduct = useAppStore.getState().products[0];
      
      await useAppStore.getState().addToCart(mockProduct.id, 1);
      await useAppStore.getState().addToCart(mockProduct.id, 2);

      const cartItems = useAppStore.getState().cartItems;
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].quantity).toBe(3);
    });

    it('should update cart item quantity', async () => {
      useAppStore.setState({
        user: null,
        cartItems: [
          { id: 'cart-1', user_id: 'guest', product_id: 'prod-1', quantity: 2, product: useAppStore.getState().products[0], created_at: '' }
        ]
      });

      await useAppStore.getState().updateCartQuantity('cart-1', 5);

      expect(useAppStore.getState().cartItems[0].quantity).toBe(5);
    });

    it('should remove item when quantity is set to 0', async () => {
      useAppStore.setState({
        user: null,
        cartItems: [
          { id: 'cart-1', user_id: 'guest', product_id: 'prod-1', quantity: 2, product: useAppStore.getState().products[0], created_at: '' }
        ]
      });

      await useAppStore.getState().updateCartQuantity('cart-1', 0);

      expect(useAppStore.getState().cartItems).toHaveLength(0);
    });

    it('should remove item from cart', async () => {
      useAppStore.setState({
        user: null,
        cartItems: [
          { id: 'cart-1', user_id: 'guest', product_id: 'prod-1', quantity: 1, product: useAppStore.getState().products[0], created_at: '' },
          { id: 'cart-2', user_id: 'guest', product_id: 'prod-2', quantity: 1, product: useAppStore.getState().products[1], created_at: '' }
        ]
      });

      await useAppStore.getState().removeFromCart('cart-1');

      expect(useAppStore.getState().cartItems).toHaveLength(1);
      expect(useAppStore.getState().cartItems[0].id).toBe('cart-2');
    });
  });

  describe('Cart Totals', () => {
    it('should calculate cart totals correctly', () => {
      useAppStore.setState({
        cartItems: [
          { id: '1', user_id: 'guest', product_id: 'prod-1', quantity: 2, product: useAppStore.getState().products[0], created_at: '' },
          { id: '2', user_id: 'guest', product_id: 'prod-2', quantity: 1, product: useAppStore.getState().products[1], created_at: '' }
        ]
      });

      const totals = useAppStore.getState().getCartTotals();
      // 2 * 30 + 1 * 15 = 75.00
      expect(totals.subtotal).toBe(75.00);
      expect(totals.discount).toBe(0);
      expect(totals.tax).toBe(5.25);
      expect(totals.shipping).toBe(0); // Free shipping over $50
      expect(totals.total).toBe(80.25);
    });

    it('should apply free shipping for orders over $50', () => {
      useAppStore.setState({
        cartItems: [
          { id: '1', user_id: 'guest', product_id: 'prod-1', quantity: 2, product: useAppStore.getState().products[0], created_at: '' }
        ]
      });

      const totals = useAppStore.getState().getCartTotals();
      expect(totals.subtotal).toBe(60.00);
      expect(totals.shipping).toBe(0);
    });

    it('should charge shipping for orders under $50', () => {
      useAppStore.setState({
        cartItems: [
          { id: '1', user_id: 'guest', product_id: 'prod-2', quantity: 2, product: useAppStore.getState().products[1], created_at: '' }
        ]
      });

      const totals = useAppStore.getState().getCartTotals();
      expect(totals.subtotal).toBe(30.00);
      expect(totals.shipping).toBe(5.99);
    });

    it('should apply promo discount to totals', async () => {
      const mockRpc = supabaseClient.rpc as jest.Mock;
      mockRpc.mockResolvedValueOnce({
        data: { valid: true, code: 'SAVE10', discount_type: 'percent', discount_value: 10, discount_amount: 7.50 },
        error: null,
      });

      useAppStore.setState({
        cartItems: [
          { id: '1', user_id: 'guest', product_id: 'prod-1', quantity: 2, product: useAppStore.getState().products[0], created_at: '' }
        ]
      });

      await useAppStore.getState().applyPromoCode('SAVE10');
      const totals = useAppStore.getState().getCartTotals();

      expect(totals.subtotal).toBe(60.00);
      expect(totals.discount).toBe(7.50);
      expect(totals.tax).toBe(3.68); // (60 - 7.50) * 0.07
    });
  });

  describe('Order Creation', () => {
    it('should create order successfully with card payment', async () => {
      const mockRpc = supabaseClient.rpc as jest.Mock;
      const mockFrom = supabaseClient.from as jest.Mock;

      mockRpc.mockResolvedValueOnce({
        data: {
          total_amount: 64.20,
          tax_amount: 4.20,
          shipping_amount: 0.00,
          discount_amount: 0.00,
        },
        error: null,
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
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      useAppStore.setState({
        cartItems: [
          { id: '1', user_id: 'user-123', product_id: 'prod-1', quantity: 2, product: useAppStore.getState().products[0], created_at: '' }
        ]
      });

      const order = await useAppStore.getState().createOrder(
        { fullName: 'Test', addressLine1: '123 Main St', city: 'LA', state: 'CA', postalCode: '90001', country: 'USA' },
        'card'
      );

      expect(order).not.toBeNull();
      expect(order?.id).toBe('GS-123456');
      expect(order?.total_amount).toBe(64.20);
      expect(order?.payment_method).toBe('card');
    });

    it('should handle order creation with PayPal payment', async () => {
      const mockRpc = supabaseClient.rpc as jest.Mock;
      const mockFrom = supabaseClient.from as jest.Mock;

      mockRpc.mockResolvedValueOnce({
        data: {
          total_amount: 45.00,
          tax_amount: 3.15,
          shipping_amount: 5.99,
          discount_amount: 0.00,
        },
        error: null,
      });

      mockRpc.mockResolvedValueOnce({
        data: {
          id: 'GS-789012',
          user_id: 'user-123',
          status: 'payment_pending',
          total_amount: 45.00,
          tax_amount: 3.15,
          shipping_amount: 5.99,
          discount_amount: 0.00,
          shipping_address: { fullName: 'Test', addressLine1: '123 Main St', city: 'LA', state: 'CA', postalCode: '90001', country: 'USA' },
          payment_method: 'paypal',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      });

      useAppStore.setState({
        cartItems: [
          { id: '1', user_id: 'user-123', product_id: 'prod-2', quantity: 3, product: useAppStore.getState().products[1], created_at: '' }
        ]
      });

      const order = await useAppStore.getState().createOrder(
        { fullName: 'Test', addressLine1: '123 Main St', city: 'LA', state: 'CA', postalCode: '90001', country: 'USA' },
        'paypal'
      );

      expect(order).not.toBeNull();
      expect(order?.id).toBe('GS-789012');
      expect(order?.payment_method).toBe('paypal');
    });

    it('should return null when order creation fails', async () => {
      const mockRpc = supabaseClient.rpc as jest.Mock;

      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database transaction error' },
      });

      const order = await useAppStore.getState().createOrder(
        { fullName: 'Test', addressLine1: '123 Main St', city: 'LA', state: 'CA', postalCode: '90001', country: 'USA' },
        'card'
      );

      expect(order).toBeNull();
    });

    it('should require user session for order creation', async () => {
      useAppStore.setState({
        user: null,
        cartItems: [
          { id: '1', user_id: 'guest', product_id: 'prod-1', quantity: 1, product: useAppStore.getState().products[0], created_at: '' }
        ]
      });

      const order = await useAppStore.getState().createOrder(
        { fullName: 'Guest', addressLine1: '123 Main St', city: 'LA', state: 'CA', postalCode: '90001', country: 'USA' },
        'card'
      );

      expect(order).toBeNull();
    });

    it('should handle RPC error during order creation', async () => {
      const mockRpc = supabaseClient.rpc as jest.Mock;

      mockRpc.mockResolvedValueOnce({
        data: {
          total_amount: 64.20,
          tax_amount: 4.20,
          shipping_amount: 0.00,
          discount_amount: 0.00,
        },
        error: null,
      });

      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC execution error' },
      });

      const order = await useAppStore.getState().createOrder(
        { fullName: 'Test', addressLine1: '123 Main St', city: 'LA', state: 'CA', postalCode: '90001', country: 'USA' },
        'card'
      );

      expect(order).toBeNull();
    });
  });

  describe('Guest Cart Persistence', () => {
    it('should persist guest cart to SecureStore', async () => {
      const mockSetItem = jest.fn().mockResolvedValue(undefined);
      SecureStoreAdapter.setItem = mockSetItem;

      useAppStore.setState({
        user: null,
        cartItems: [
          { id: 'guest-1', user_id: '', product_id: 'prod-1', quantity: 1, product: useAppStore.getState().products[0], created_at: '' }
        ]
      });

      await useAppStore.getState().addToCart('prod-1', 1);

      expect(mockSetItem).toHaveBeenCalledWith(
        'guest_cart',
        expect.any(String)
      );
    });

    it('should load guest cart from SecureStore on fetch', async () => {
      const mockGuestCart = JSON.stringify([
        { id: 'guest-1', user_id: '', product_id: 'prod-1', quantity: 2, created_at: '' }
      ]);
      
      SecureStoreAdapter.getItem = jest.fn().mockResolvedValue(mockGuestCart);

      useAppStore.setState({ user: null });
      await useAppStore.getState().fetchCart();

      expect(useAppStore.getState().cartItems).toHaveLength(1);
      expect(useAppStore.getState().cartItems[0].product_id).toBe('prod-1');
      expect(useAppStore.getState().cartItems[0].quantity).toBe(2);
    });
  });

  describe('Cart Synchronization', () => {
    it('should merge guest cart into user cart on login', async () => {
      const mockGuestCart = JSON.stringify([
        { id: 'guest-1', user_id: '', product_id: 'prod-1', quantity: 2, created_at: '' }
      ]);
      
      SecureStoreAdapter.getItem = jest.fn().mockResolvedValue(mockGuestCart);
      SecureStoreAdapter.removeItem = jest.fn().mockResolvedValue(undefined);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
        phone: '',
        is_anonymous: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      await useAppStore.getState().signIn('test@example.com', 'password123');

      expect(useAppStore.getState().user?.id).toBe('user-123');
    });
  });
});
