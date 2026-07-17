import { useAppStore } from '../store/useAppStore';
import { supabaseClient } from '../services/supabaseClient';

// Mock Supabase client boundary methods
jest.mock('../services/supabaseClient', () => {
  const original = jest.requireActual('../services/supabaseClient');
  
  const mockFrom = jest.fn().mockImplementation((_table) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const promise = Promise.resolve({ data: [], error: null });
    Object.assign(chain, {
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
    });

    return chain;
  });

  return {
    ...original,
    supabaseClient: {
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } },
        }),
      },
      from: mockFrom,
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
  };
});

describe('GLASSSKIN Critical Integration Flows', () => {
  beforeEach(() => {
    // Reset Zustand store state
    useAppStore.setState({
      user: null,
      cartItems: [],
      wishlistItems: [],
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
          image_url: '',
          stock_quantity: 10,
          created_at: '',
          updated_at: '',
        }
      ],
    });
    jest.clearAllMocks();
  });

  describe('Sign-In Flow', () => {
    it('updates user state on successful login', async () => {
      const mockAuthUser = {
        id: 'user-123',
        email: 'test@glassskin.com',
        user_metadata: { full_name: 'Jane Doe' },
      };

      (supabaseClient.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      const success = await useAppStore.getState().signIn('test@glassskin.com', 'password123');
      expect(success).toBe(true);
      expect(useAppStore.getState().user).toEqual(
        expect.objectContaining({
          id: 'user-123',
          email: 'test@glassskin.com',
          full_name: 'Jane Doe',
        })
      );
    });

    it('sets authError on wrong password or missing account', async () => {
      (supabaseClient.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const success = await useAppStore.getState().signIn('wrong@glassskin.com', 'badpass');
      expect(success).toBe(false);
      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().authError).toBe('Wrong password or email. Please verify your credentials.');
    });
  });

  describe('Wishlist Toggle Flow', () => {
    it('toggles wishlist locally when signed in', async () => {
      // Sign in the user so toggle doesn't early return
      useAppStore.setState({
        user: { id: 'user-123', email: 'test@glassskin.com', full_name: 'Jane Doe' }
      });

      expect(useAppStore.getState().isProductWishlisted('prod-1')).toBe(false);
      
      // Mock toggle databases calls
      const mockFrom = supabaseClient.from as jest.Mock;
      mockFrom.mockImplementation((_table) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ error: null }),
          delete: jest.fn().mockResolvedValue({ error: null }),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
        };
        
        // This makes sure both the toggle and fetch calls resolve to the correct expected formats
        const promise = Promise.resolve({
          data: [
            {
              id: 'wish-1',
              user_id: 'user-123',
              product_id: 'prod-1',
              created_at: '',
              product: {
                id: 'prod-1',
                name: 'Super Hydrator',
                price: 30.00,
                category: 'Skincare',
                images: ['https://example.com/image.png'],
                stock_quantity: 10,
                rating: 4.8,
                review_count: 5,
                created_at: '',
                updated_at: '',
              }
            }
          ],
          error: null
        });

        Object.assign(chain, {
          then: promise.then.bind(promise),
          catch: promise.catch.bind(promise),
        });

        return chain;
      });

      // Toggle ON
      await useAppStore.getState().toggleWishlist('prod-1');
      expect(useAppStore.getState().wishlistItems).toHaveLength(1);
      expect(useAppStore.getState().isProductWishlisted('prod-1')).toBe(true);
    });
  });

  describe('Add-to-Cart -> Checkout -> Order Placement Flow', () => {
    it('manages cart items and aggregates totals correctly', async () => {
      // Add to cart
      await useAppStore.getState().addToCart('prod-1', 2);
      expect(useAppStore.getState().cartItems).toHaveLength(1);
      expect(useAppStore.getState().cartItems[0].quantity).toBe(2);

      // Total calculation check (2 * $30 = $60, free shipping, 7% tax)
      const totals = useAppStore.getState().getCartTotals();
      expect(totals.subtotal).toBe(60.00);
      expect(totals.shipping).toBe(0.00);
      expect(totals.tax).toBe(4.20);
      expect(totals.total).toBe(64.20);
    });
  });
});
