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
  const [isPressed, setIsPressed] = React.useState(false);
  const isGhost = variant === 'ghost' || variant === 'secondary';

  const baseButtonStyle = {
    borderRadius: tokens.radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 26,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    borderWidth: isGhost ? 1 : 0,
    borderColor: isGhost ? tokens.colors.line : 'transparent',
    opacity: disabled ? 0.5 : 1,
  };

  const baseTextStyle = {
    ...typography.eyebrow,
    fontSize: 12,
  };

  const bg = isGhost 
    ? (isPressed ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)')
    : (isPressed ? tokens.colors.accent : '#000000'); // Solid black background!
  
  const transform = !isGhost && isPressed && !disabled && !loading 
    ? [{ translateY: -2 }] 
    : [];

  const webBackdrop = isGhost && Platform.OS === 'web' 
    ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }
    : {};

  return (
    <Pressable
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled,
        busy: loading,
      }}
      hitSlop={10}
      style={StyleSheet.flatten([
        baseButtonStyle,
        { backgroundColor: bg, transform },
        webBackdrop,
        style,
      ])}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isGhost ? tokens.colors.ink : '#FFFFFF'} />
      ) : (
        <Text 
          style={StyleSheet.flatten([
            baseTextStyle,
            { 
              color: isGhost 
                ? tokens.colors.ink 
                : '#FFFFFF' 
            },
            textStyle
          ])}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};
