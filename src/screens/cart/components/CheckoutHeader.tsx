import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Check } from 'lucide-react-native';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  step: number;
  onBack: () => void;
};

export const CheckoutHeader = ({ step, onBack }: Props) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
        <Text style={styles.headerBtnText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Checkout</Text>
      <View style={{ width: 80 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
  },
  headerTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
  },
  headerBtn: {
    paddingVertical: 4,
    width: 80,
  },
  headerBtnText: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
