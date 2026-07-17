import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CheckoutScreen } from '../CheckoutScreen';
import { useAppStore } from '../../../store/useAppStore';
import { Alert } from 'react-native';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock stripe
jest.mock('../../../utils/stripe', () => ({
  useStripe: () => ({
    initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
  }),
}));

describe('CheckoutScreen Component Tests', () => {
  const mockCreateOrder = jest.fn();
  const mockFetchStripeParams = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');

    // Default mock store implementation
    useAppStore.setState({
      cartItems: [
        {
          id: 'item-1',
          user_id: 'user-123',
          product_id: 'prod-100',
          quantity: 1,
          product: {
            id: 'prod-100',
            name: 'Moisturizer',
            price: 25.00,
            stock_quantity: 10,
            rating: 4.5,
            review_count: 5,
            slug: 'moisturizer',
            category: 'skincare',
            tags: [],
            images: [],
            skin_types: [],
            certifications: [],
            ingredients: '',
            usage: '',
            created_at: '',
            updated_at: '',
          },
          created_at: '',
        }
      ],
      user: { id: 'user-123', email: 'test@example.com', full_name: 'Test', phone: '', created_at: '', updated_at: '' },
      createOrder: mockCreateOrder,
      fetchStripePaymentSheetParams: mockFetchStripeParams,
      getCartTotals: () => ({ subtotal: 25.00, tax: 1.75, shipping: 5.99, discount: 0, total: 32.74 }),
    });
  });

  it('renders correctly at Step 1 (Shipping)', async () => {
    const { findByPlaceholderText, findByText } = await render(
      <CheckoutScreen navigation={mockNavigation} />
    );

    expect(await findByPlaceholderText('Full Name')).toBeTruthy();
    expect(await findByPlaceholderText('Address Line 1')).toBeTruthy();
    expect(await findByText('Next Step')).toBeTruthy();
  });

  it('validates missing shipping fields at Step 1', async () => {
    const { findByText } = await render(
      <CheckoutScreen navigation={mockNavigation} />
    );

    const continueBtn = await findByText('Next Step');
    fireEvent.press(continueBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Please fill out all shipping details (including state).'
    );
  });

  it('transitions to Step 2 when shipping fields are filled', async () => {
    const { findByPlaceholderText, findByText } = await render(
      <CheckoutScreen navigation={mockNavigation} />
    );

    const nameInput = await findByPlaceholderText('Full Name');
    const addressInput = await findByPlaceholderText('Address Line 1');
    const cityInput = await findByPlaceholderText('City');
    const stateInput = await findByPlaceholderText('State (e.g. CA, NY, TX)');
    const zipInput = await findByPlaceholderText('Postal Code');

    // Fill out shipping address
    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(addressInput, '12');
    fireEvent.changeText(cityInput, 'Los Angeles');
    fireEvent.changeText(stateInput, 'CA');
    fireEvent.changeText(zipInput, '90001');

    const continueBtn = await findByText('Next Step');
    fireEvent.press(continueBtn);

    // Should transition to Step 2 (Card Details)
    const cardInput = await findByPlaceholderText(/Card Number/i);
    expect(cardInput).toBeTruthy();
  });
});
