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
      signUp: jest.fn(),
      signOut: jest.fn(),
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

describe('Auth Flow Unit Tests', () => {
  beforeEach(() => {
    useAppStore.setState({
      user: null,
      authLoading: false,
      authError: null,
      isSignOutIntentional: false,
      isRecoveringPassword: false,
      preferences: null,
      cartItems: [],
      wishlistItems: [],
      orders: [],
      products: [],
    });
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should sign up a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
        phone: '',
        is_anonymous: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const result = await useAppStore.getState().signUp('test@example.com', 'password123', 'Test User');

      expect(result).toBe(true);
      expect(useAppStore.getState().user?.id).toBe('user-123');
      expect(useAppStore.getState().user?.email).toBe('test@example.com');
      expect(useAppStore.getState().authLoading).toBe(false);
    });

    it('should handle signup failure gracefully', async () => {
      supabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Email already registered' },
      });

      const result = await useAppStore.getState().signUp('existing@example.com', 'password123');

      expect(result).toBe(false);
      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().authError).toBe('This email is already registered. Please sign in instead.');
    });

    it('should use email prefix as full_name when not provided', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'test@example.com',
        user_metadata: { full_name: 'test' },
        phone: '',
        is_anonymous: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      await useAppStore.getState().signUp('test@example.com', 'password123');

      expect(useAppStore.getState().user?.full_name).toBe('test');
    });
  });

  describe('signIn', () => {
    it('should sign in an existing user successfully', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'existing@example.com',
        user_metadata: { full_name: 'Existing User' },
        phone: '',
        is_anonymous: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const result = await useAppStore.getState().signIn('existing@example.com', 'password123');

      expect(result).toBe(true);
      expect(useAppStore.getState().user?.id).toBe('user-789');
      expect(useAppStore.getState().authError).toBeNull();
    });

    it('should handle invalid credentials', async () => {
      supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await useAppStore.getState().signIn('wrong@example.com', 'wrongpass');

      expect(result).toBe(false);
      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().authError).toBe('Wrong password or email. Please verify your credentials.');
    });

    it('should handle network errors during signin', async () => {
      supabaseClient.auth.signInWithPassword.mockRejectedValueOnce(new Error('Network error'));

      const result = await useAppStore.getState().signIn('test@example.com', 'password123');

      expect(result).toBe(false);
      expect(useAppStore.getState().authError).toBe('Network error');
    });
  });

  describe('signInAsGuest', () => {
    it('should sign in as guest successfully', async () => {
      const mockUser = {
        id: 'guest-uuid-123',
        email: null,
        user_metadata: {},
        phone: null,
        is_anonymous: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseClient.auth.signInAnonymously.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const result = await useAppStore.getState().signInAsGuest();

      expect(result).toBe(true);
      expect(useAppStore.getState().user?.id).toBe('guest-uuid-123');
      expect(useAppStore.getState().user?.is_anonymous).toBe(true);
    });

    it('should handle guest signin failure', async () => {
      supabaseClient.auth.signInAnonymously.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Anonymous sign-in disabled' },
      });

      const result = await useAppStore.getState().signInAsGuest();

      expect(result).toBe(false);
      expect(useAppStore.getState().user).toBeNull();
    });
  });

  describe('checkAuth', () => {
    it('should restore session when user is logged in', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
        phone: '',
        is_anonymous: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      await useAppStore.getState().checkAuth();

      expect(useAppStore.getState().user?.id).toBe('user-123');
      expect(useAppStore.getState().authLoading).toBe(false);
    });

    it('should clear session when no user is logged in', async () => {
      useAppStore.setState({
        user: { id: 'old-user', email: 'old@example.com', full_name: 'Old', phone: '', created_at: '', updated_at: '' },
        products: [{ id: '1', name: 'Test', price: 10, created_at: '', updated_at: '' }],
      });

      supabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await useAppStore.getState().checkAuth();

      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().products).toHaveLength(0);
    });

    it('should handle auth check errors gracefully', async () => {
      supabaseClient.auth.getUser.mockRejectedValueOnce(new Error('Auth check failed'));

      await useAppStore.getState().checkAuth();

      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().authLoading).toBe(false);
    });
  });

  describe('signOut', () => {
    it('should sign out and clear all state', async () => {
      useAppStore.setState({
        user: { id: 'user-123', email: 'test@example.com', full_name: 'Test', phone: '', created_at: '', updated_at: '' },
        cartItems: [{ id: '1', product_id: 'prod-1', quantity: 1, created_at: '' }],
        wishlistItems: [{ id: '1', product_id: 'prod-1', created_at: '' }],
        orders: [{ id: 'order-1', total_amount: 50, created_at: '', updated_at: '' }],
        preferences: { user_id: 'user-123', order_notifications: true, promo_notifications: false, cart_reminders: true },
        products: [{ id: '1', name: 'Test', price: 10, created_at: '', updated_at: '' }],
      });

      supabaseClient.auth.signOut.mockResolvedValueOnce({ error: null });

      await useAppStore.getState().signOut();

      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().cartItems).toHaveLength(0);
      expect(useAppStore.getState().wishlistItems).toHaveLength(0);
      expect(useAppStore.getState().orders).toHaveLength(0);
      expect(useAppStore.getState().preferences).toBeNull();
      expect(useAppStore.getState().products).toHaveLength(0);
    });
  });

  describe('Session persistence', () => {
    it('should maintain user state across store updates', async () => {
      const mockUser = {
        id: 'user-persist',
        email: 'persist@example.com',
        user_metadata: { full_name: 'Persist User' },
        phone: '',
        is_anonymous: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      await useAppStore.getState().signIn('persist@example.com', 'password123');
      expect(useAppStore.getState().user?.id).toBe('user-persist');

      // Simulate other state updates
      useAppStore.setState({ cartItems: [{ id: '1', product_id: 'prod-1', quantity: 1, created_at: '' }] });
      expect(useAppStore.getState().user?.id).toBe('user-persist');
    });

    it('should clear session on explicit sign out', async () => {
      const mockUser = {
        id: 'user-logout',
        email: 'logout@example.com',
        user_metadata: { full_name: 'Logout User' },
        phone: '',
        is_anonymous: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      await useAppStore.getState().signIn('logout@example.com', 'password123');
      expect(useAppStore.getState().user).not.toBeNull();

      supabaseClient.auth.signOut.mockResolvedValueOnce({ error: null });
      await useAppStore.getState().signOut();
      expect(useAppStore.getState().user).toBeNull();
    });
  });

  describe('Auth error handling', () => {
    it('should handle rate limit errors', async () => {
      supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { status: 429, message: 'Too many requests' },
      });

      const result = await useAppStore.getState().signIn('test@example.com', 'password123');

      expect(result).toBe(false);
      expect(useAppStore.getState().authError).toBe('Too many attempts. Please try again in a few minutes.');
    });

    it('should handle user not found errors', async () => {
      supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'User not found' },
      });

      const result = await useAppStore.getState().signIn('notfound@example.com', 'password123');

      expect(result).toBe(false);
      expect(useAppStore.getState().authError).toBe('Account not found. Please sign up first.');
    });
  });
});
