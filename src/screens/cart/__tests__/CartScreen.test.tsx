import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartScreen } from '../CartScreen';
import { useAppStore } from '../../../store/useAppStore';

const mockNavigation = {
  navigate: jest.fn(),
};

describe('CartScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useAppStore.setState({
      user: null,
      cartItems: [
        {
          id: 'cart-item-1',
          user_id: '',
          product_id: 'prod-1',
          quantity: 1,
          created_at: '2026-07-17T00:00:00.000Z',
          product: {
            id: 'prod-1',
            name: 'Restorative Rosehip Facial Oil',
            slug: 'restorative-rosehip-facial-oil',
            description: '',
            price: 45,
            category: 'Skincare',
            tags: [],
            images: [],
            stock_quantity: 10,
            rating: 5,
            review_count: 1,
            skin_types: [],
            certifications: [],
            ingredients: '',
            usage: '',
            created_at: '2026-07-17T00:00:00.000Z',
            updated_at: '2026-07-17T00:00:00.000Z',
          },
        },
      ],
      appliedPromo: null,
      getCartTotals: () => ({
        subtotal: 45,
        tax: 3.15,
        shipping: 5.99,
        discount: 0,
        total: 54.14,
      }),
      applyPromoCode: jest.fn(),
      removePromoCode: jest.fn(),
      updateCartQuantity: jest.fn(),
      removeFromCart: jest.fn(),
      fetchCart: jest.fn(),
    });
  });

  it('navigates to Checkout when Proceed to Checkout is pressed', async () => {
    const { getByText } = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <CartScreen navigation={mockNavigation} />
      </SafeAreaProvider>
    );

    fireEvent.press(getByText('Proceed to Checkout'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Checkout');
  });
});
