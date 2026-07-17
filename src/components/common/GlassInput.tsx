import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Platform, TextInputProps } from 'react-native';
import { tokens } from '../../theme/tokens';

interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: any;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  containerStyle,
  icon,
  style,
  accessibilityLabel,
  accessibilityHint,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          Platform.OS === 'web' && {
            // @ts-ignore
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={tokens.colors.muted}
          accessibilityLabel={accessibilityLabel || label || props.placeholder}
          accessibilityHint={accessibilityHint || error}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus && onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur && onBlur(e);
          }}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.glass,
    borderColor: tokens.colors.glassEdge,
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: tokens.colors.accent,
    borderWidth: 1,
  },
  inputError: {
    borderColor: '#EF4444', 
  },
  iconContainer: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: tokens.colors.ink,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    height: '100%',
  },
  errorText: {
    color: '#EF4444', 
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
    marginLeft: 4,
  },
});
