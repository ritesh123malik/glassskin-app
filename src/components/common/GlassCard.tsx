import React from 'react';
import { View, StyleSheet, Platform, ViewProps } from 'react-native';
import { tokens } from '../../theme/tokens';

export type GlassCardVariant = 'float-card' | 'product-card' | 'bento-item';

interface GlassCardProps extends ViewProps {
  variant?: GlassCardVariant;
  /** @deprecated use variant="float-card" instead */
  intensity?: 'low' | 'medium' | 'high';
  children?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'float-card',
  intensity,
  children,
  style,
  testID,
  ...props
}) => {
  if (intensity) {
    console.warn(
      '[GlassCard] The "intensity" prop is deprecated. Use "variant" instead: ' +
      `variant="float-card" | "product-card" | "bento-item". Received: intensity="${intensity}"`
    );
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'product-card':
        return {
          backgroundColor: '#FFFFFF',
          borderColor: tokens.colors.line,
          borderRadius: 28,
          borderWidth: 1,
        };
      case 'bento-item':
        return {
          backgroundColor: tokens.colors.glass2,
          borderColor: tokens.colors.glassEdge,
          borderRadius: 24,
          borderWidth: 1,
          padding: 28,
        };
      case 'float-card':
      default:
        return {
          backgroundColor: tokens.colors.glass,
          borderColor: tokens.colors.glassEdge,
          borderRadius: 24,
          borderWidth: 1,
          padding: 16,
        };
    }
  };

  const variantStyles = getVariantStyles();

  if (Platform.OS === 'web' && variant !== 'product-card') {
    return (
      <View
        testID={testID}
        style={[
          styles.base,
          variantStyles,
          {
            // @ts-expect-error React Native's View style prop does not include web-only CSS
            // properties like backdropFilter / WebkitBackdropFilter / boxShadow. These are
            // intentionally passed through on web for the frosted-glass effect.
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: '0 30px 60px -30px rgba(11,11,12,.25), inset 0 2px 0 rgba(255,255,255,.6)',
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }

  // Native Mobile Fallback / Product Card
  return (
    <View
      testID={testID}
      style={[
        styles.base,
        variantStyles,
        variant !== 'product-card' && styles.nativeShadow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    // Removed overflow: 'hidden' to prevent Android rendering bugs with elevation
  },
  nativeShadow: {
    shadowColor: tokens.colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    // Removed elevation as it causes translucent cards to become invisible on some Android devices
  }
});
