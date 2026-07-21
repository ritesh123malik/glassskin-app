import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductForm, { ProductFormData } from '../ProductForm';

const emptyInitialData: ProductFormData = {
  name: '',
  description: '',
  price: 0,
  compare_at_price: 0,
  stock_quantity: 0,
  category: '',
  tags: [],
  images: [],
  skin_types: [],
  certifications: [],
  ingredients: '',
  usage: '',
};

describe('ProductForm', () => {
  it('renders without crashing with empty initial arrays', () => {
    const mockOnSubmit = jest.fn();
    render(<ProductForm initialData={emptyInitialData} onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Pricing & Inventory')).toBeInTheDocument();
    expect(screen.getByText('Product Details')).toBeInTheDocument();
  });

  it('handleChipChange correctly handles empty initial arrays for tags', async () => {
    const mockOnSubmit = jest.fn();
    render(<ProductForm initialData={emptyInitialData} onSubmit={mockOnSubmit} />);

    const tagInput = screen.getByPlaceholderText('e.g. vegan, cruelty-free');
    const addButton = tagInput.closest('div')?.querySelector('button');

    expect(tagInput).toBeInTheDocument();
    expect(addButton).toBeInTheDocument();

    fireEvent.change(tagInput, { target: { value: 'vegan' } });
    fireEvent.click(addButton!);

    await waitFor(() => {
      expect(screen.getByText('vegan')).toBeInTheDocument();
    });
  });

  it('handleChipChange correctly handles empty initial arrays for certifications', async () => {
    const mockOnSubmit = jest.fn();
    render(<ProductForm initialData={emptyInitialData} onSubmit={mockOnSubmit} />);

    const certInput = screen.getByPlaceholderText('e.g. COSMOS Organic, EWG Verified');
    const addButton = certInput.closest('div')?.querySelector('button');

    fireEvent.change(certInput, { target: { value: 'COSMOS Organic' } });
    fireEvent.click(addButton!);

    await waitFor(() => {
      expect(screen.getByText('COSMOS Organic')).toBeInTheDocument();
    });
  });

  it('handleChipChange correctly handles empty initial arrays for images', async () => {
    const mockOnSubmit = jest.fn();
    render(<ProductForm initialData={emptyInitialData} onSubmit={mockOnSubmit} />);

    const imageInput = screen.getByPlaceholderText('https://...');
    const addButton = imageInput.closest('div')?.querySelector('button');

    fireEvent.change(imageInput, { target: { value: 'https://example.com/image.jpg' } });
    fireEvent.click(addButton!);

    await waitFor(() => {
      expect(screen.getByText('https://example.com/image.jpg')).toBeInTheDocument();
    });
  });

  it('submits form with chips added to empty arrays', async () => {
    const mockOnSubmit = jest.fn();
    render(<ProductForm initialData={emptyInitialData} onSubmit={mockOnSubmit} />);

    const nameInput = screen.getByPlaceholderText('e.g. Hydrating Vitamin C Serum');
    fireEvent.change(nameInput, { target: { value: 'Test Product' } });

    const priceInput = screen.getByLabelText('Price *', { selector: 'input' });
    fireEvent.change(priceInput, { target: { value: '10.00' } });

    const stockInput = screen.getByLabelText('Stock Quantity *', { selector: 'input' });
    fireEvent.change(stockInput, { target: { value: '100' } });

    const tagInput = screen.getByPlaceholderText('e.g. vegan, cruelty-free');
    const tagAddButton = tagInput.closest('div')?.querySelector('button');
    fireEvent.change(tagInput, { target: { value: 'vegan' } });
    fireEvent.click(tagAddButton!);

    await waitFor(() => {
      expect(screen.getByText('vegan')).toBeInTheDocument();
    });

    const form = screen.getByRole('button', { name: 'Save Product' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['vegan'],
          certifications: [],
          images: [],
        })
      );
    });
  });

  it('allows removing chips from initially empty arrays', async () => {
    const mockOnSubmit = jest.fn();
    render(<ProductForm initialData={emptyInitialData} onSubmit={mockOnSubmit} />);

    const tagInput = screen.getByPlaceholderText('e.g. vegan, cruelty-free');
    const addButton = tagInput.closest('div')?.querySelector('button');

    fireEvent.change(tagInput, { target: { value: 'vegan' } });
    fireEvent.click(addButton!);

    await waitFor(() => {
      expect(screen.getByText('vegan')).toBeInTheDocument();
    });

    const removeButton = screen.getByText('vegan').parentElement?.querySelector('button');
    fireEvent.click(removeButton!);

    await waitFor(() => {
      expect(screen.queryByText('vegan')).not.toBeInTheDocument();
    });
  });
});
