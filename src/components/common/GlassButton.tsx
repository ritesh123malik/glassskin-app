import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, Platform, GestureResponderEvent } from 'react-native';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

interface GlassButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  title: string;
  variant?: 'primary' | 'ghost' | 'secondary' | 'accent' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: any;
  textStyle?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  // Map legacy variants to our two supported UI variants
  const isGhost = variant === 'ghost' || variant === 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled,
        busy: loading,
      }}
      // pad hit area out to a minimum of 44x44px. 
      // Button min height is already 16 padding * 2 + 15 line height ~= 47. 
      // We will ensure a baseline hitSlop just in case it is ever scaled down.
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        isGhost ? styles.ghost : styles.btnPrimary,
        pressed && !disabled && !loading && (isGhost ? styles.ghostPressed : styles.btnPrimaryPressed),
        disabled && styles.disabled,
        isGhost && Platform.OS === 'web' && {
          // @ts-ignore
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {loading ? (
            <ActivityIndicator size="small" color={isGhost ? tokens.colors.ink : '#FFFFFF'} />
          ) : (
            <Text 
              style={[
                styles.text, 
                isGhost ? styles.textGhost : styles.textPrimary,
                pressed && !disabled && !loading && (isGhost ? styles.textGhostPressed : styles.textPrimaryPressed),
                textStyle
              ]}
            >
              {title}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: tokens.radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 26,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  btnPrimary: {
    backgroundColor: tokens.colors.ink,
  },
  btnPrimaryPressed: {
    backgroundColor: tokens.colors.accent,
    transform: [{ translateY: -2 }],
  },
  ghost: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  ghostPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.eyebrow,
    fontSize: 12,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textGhost: {
    color: tokens.colors.ink,
  },
  textPrimaryPressed: {
    color: '#FFFFFF',
  },
  textGhostPressed: {
    color: tokens.colors.ink,
  }
});
