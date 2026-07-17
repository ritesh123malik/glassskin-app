import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProductDetailScreen } from '../ProductDetailScreen';
import { useAppStore } from '../../../store/useAppStore';
import { supabaseClient } from '../../../services/supabaseClient';



describe('ProductDetailScreen Component Tests', () => {
  const mockProduct = {
    id: 'prod-100',
    name: 'Glow Serum',
    description: 'Brings out your natural glow.',
    price: 34.99,
    category: 'Skincare',
    skin_types: ['all'],
    certifications: ['organic'],
    images: ['https://example.com/image.png'],
    stock_quantity: 15,
    rating: 4.8,
    review_count: 10,
    ingredients: 'Water, Vitamin C, Hyaluronic Acid',
    usage: 'Apply 3-4 drops in the morning.',
    created_at: '',
    updated_at: '',
  };

  const mockFetchProductById = jest.fn();
  const mockToggleWishlist = jest.fn();
  const mockAddToCart = jest.fn();
  const mockIsProductWishlisted = jest.fn().mockReturnValue(false);

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      currentProduct: mockProduct,
      fetchProductById: mockFetchProductById,
      toggleWishlist: mockToggleWishlist,
      isProductWishlisted: mockIsProductWishlisted,
      addToCart: mockAddToCart,
      productsLoading: false,
      user: { id: 'user-123', email: 'test@example.com', full_name: 'Test Name', phone: '', created_at: '', updated_at: '' }
    });
  });

  const mockRoute = { params: { productId: 'prod-100' } };
  const mockNavigation = { navigate: jest.fn() };

  it('renders details correctly', async () => {
    const { getByText } = await render(
      <ProductDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(mockFetchProductById).toHaveBeenCalledWith('prod-100');
    });

    expect(getByText('Glow Serum')).toBeTruthy();
    expect(getByText('$34.99')).toBeTruthy();
    expect(getByText('Brings out your natural glow.')).toBeTruthy();
  });

  it('increments and decrements quantity correctly', async () => {
    const { getByTestId, getByLabelText } = await render(
      <ProductDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Wait for initial render to settle
    await waitFor(() => {
      expect(getByLabelText('Selected quantity: 1')).toBeTruthy();
    });

    const plusBtn = getByTestId('qty-plus');
    const minusBtn = getByTestId('qty-minus');

    fireEvent.press(plusBtn);
    await waitFor(() => {
      expect(getByLabelText('Selected quantity: 2')).toBeTruthy();
    });

    fireEvent.press(minusBtn);
    await waitFor(() => {
      expect(getByLabelText('Selected quantity: 1')).toBeTruthy();
    });
  });

  it('adds product to cart with selected quantity', async () => {
    const { getByTestId, getByText, getByLabelText } = await render(
      <ProductDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Wait for initial render to settle
    await waitFor(() => {
      expect(getByTestId('qty-plus')).toBeTruthy();
    });

    const plusBtn = getByTestId('qty-plus');
    fireEvent.press(plusBtn); // Qty is now 2

    await waitFor(() => {
      expect(getByLabelText('Selected quantity: 2')).toBeTruthy();
    });

    const addToCartBtn = getByText('Add to Cart');
    fireEvent.press(addToCartBtn);

    expect(mockAddToCart).toHaveBeenCalledWith('prod-100', 2);
  });

  it('toggles wishlist state', async () => {
    const { getByTestId } = await render(
      <ProductDetailScreen route={mockRoute} navigation={mockNavigation} />
    );

    let wishlistBtn: any;
    await waitFor(() => {
      wishlistBtn = getByTestId('wishlist-btn');
      expect(wishlistBtn).toBeTruthy();
    });

    fireEvent.press(wishlistBtn);
    expect(mockToggleWishlist).toHaveBeenCalledWith('prod-100');
  });
});
