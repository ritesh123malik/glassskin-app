import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlassInput } from '../../common/GlassInput';

describe('GlassInput Component', () => {
  it('renders correctly with label', async () => {
    const { getByText } = await render(
      <GlassInput label="Username" placeholder="Enter username" />
    );
    expect(getByText('Username')).toBeTruthy();
  });

  it('renders error message when error prop is provided', async () => {
    const { getByText } = await render(
      <GlassInput label="Password" error="Password is required" />
    );
    expect(getByText('Password is required')).toBeTruthy();
  });

  it('triggers onChangeText when text changes', async () => {
    const onChangeTextMock = jest.fn();
    const { getByPlaceholderText } = await render(
      <GlassInput
        placeholder="Search"
        onChangeText={onChangeTextMock}
      />
    );

    fireEvent.changeText(getByPlaceholderText('Search'), 'Clean Beauty');
    expect(onChangeTextMock).toHaveBeenCalledWith('Clean Beauty');
  });

  it('applies accessibility props correctly', async () => {
    const { getByPlaceholderText } = await render(
      <GlassInput
        placeholder="Input"
        accessibilityLabel="Input Field"
        accessibilityHint="Input Hint"
      />
    );

    const input = getByPlaceholderText('Input');
    expect(input.props.accessibilityLabel).toBe('Input Field');
    expect(input.props.accessibilityHint).toBe('Input Hint');
  });
});
