import React from 'react';
import { View, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { GlassCard } from '../../common/GlassCard';

describe('GlassCard Component', () => {
  it('renders children correctly', async () => {
    const { getByText } = await render(
      <GlassCard>
        <Text>Inner Content</Text>
      </GlassCard>
    );
    expect(getByText('Inner Content')).toBeTruthy();
  });

  it('applies style overrides correctly', async () => {
    const { getByTestId } = await render(
      <GlassCard testID="card" style={{ marginTop: 10 }}>
        <View />
      </GlassCard>
    );
    const card = getByTestId('card');
    expect(card.props.style).toContainEqual({ marginTop: 10 });
  });
});
