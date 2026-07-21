import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  visible: boolean;
};

export const ProcessingOverlay = ({ visible }: Props) => {
  if (!visible) return null;

  return (
    <View style={styles.processingOverlay}>
      <ActivityIndicator size="large" color="#8E5D34" />
      <Text style={styles.processingText}>Processing PayPal Payment...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 999,
  },
  processingText: {
    color: tokens.colors.ink,
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
});
