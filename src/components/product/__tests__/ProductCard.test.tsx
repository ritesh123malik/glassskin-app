import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from '../ProductCard';
import { useAppStore } from '../../../store/useAppStore';

describe('ProductCard Component', () => {
  const mockProduct = {
    id: 'prod-100',
    name: 'Hydrating Face Cream',
    description: 'Rich moisturizing cream.',
    price: 25.99,
    category: 'Skincare',
    skin_types: ['dry'],
    certifications: ['organic'],
    images: ['https://example.com/image.png'],
    stock_quantity: 8,
    rating: 4.5,
    created_at: '',
    updated_at: '',
  };

  const mockToggleWishlist = jest.fn();
  const mockAddToCart = jest.fn();
  const mockIsProductWishlisted = jest.fn().mockReturnValue(false);

  beforeEach(() => {
    useAppStore.setState({
      toggleWishlist: mockToggleWishlist,
      isProductWishlisted: mockIsProductWishlisted,
      addToCart: mockAddToCart,
    });
    mockToggleWishlist.mockClear();
    mockAddToCart.mockClear();
    mockIsProductWishlisted.mockClear();
  });

  it('renders correctly with product details', async () => {
    const { getByText } = await render(
      <ProductCard product={mockProduct} onPress={() => {}} />
    );

    expect(getByText('Hydrating Face Cream')).toBeTruthy();
    expect(getByText('$25.99')).toBeTruthy();
  });

  it('triggers onPress when card is pressed', async () => {
    const onPressMock = jest.fn();
    const { getByText } = await render(
      <ProductCard product={mockProduct} onPress={onPressMock} />
    );

    fireEvent.press(getByText('Hydrating Face Cream'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('triggers addToCart when add-to-cart button is pressed', async () => {
    const { getByTestId } = await render(
      <ProductCard product={mockProduct} onPress={() => {}} />
    );

    const addToCartBtn = getByTestId('product-card-add-to-cart');
    fireEvent.press(addToCartBtn);
    expect(mockAddToCart).toHaveBeenCalledWith('prod-100', 1);
  });

  it('triggers toggleWishlist when heart button is pressed', async () => {
    const { getByTestId } = await render(
      <ProductCard product={mockProduct} onPress={() => {}} />
    );

    const wishlistBtn = getByTestId('product-card-wishlist');
    fireEvent.press(wishlistBtn);
    expect(mockToggleWishlist).toHaveBeenCalledWith('prod-100');
  });
});
