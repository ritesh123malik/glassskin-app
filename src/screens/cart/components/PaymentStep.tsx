import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  paymentMethod: 'card' | 'paypal';
  onSelect: (method: 'card' | 'paypal') => void;
};

export const PaymentStep = ({ paymentMethod, onSelect }: Props) => {
  return (
    <View>
      <Text style={styles.sectionTitle}>Select Payment Method</Text>

      {/* Credit Card Option */}
      <TouchableOpacity 
        style={[styles.paymentOption, paymentMethod === 'card' ? styles.paymentOptionActive : null]}
        onPress={() => onSelect('card')}
        activeOpacity={0.8}
      >
        <GlassCard variant="float-card" style={[styles.paymentCardInner, paymentMethod === 'card' && styles.paymentCardActive]}>
          <View style={styles.paymentCardHeader}>
            <View style={styles.radioRow}>
              <View style={styles.radioButton}>
                {paymentMethod === 'card' && <View style={styles.radioButtonDot} />}
              </View>
              <Text style={styles.paymentOptionText}>Credit or Debit Card</Text>
            </View>
            <CreditCard size={20} color="#D9B79A" />
          </View>

          {paymentMethod === 'card' && (
            <View style={styles.cardForm}>
              <Text style={styles.cardFormNote}>
                Card details will be collected securely by Stripe when you review your order.
              </Text>
            </View>
          )}
        </GlassCard>
      </TouchableOpacity>

      {/* PayPal Option */}
      <TouchableOpacity 
        style={[styles.paymentOption, paymentMethod === 'paypal' ? styles.paymentOptionActive : null]}
        onPress={() => onSelect('paypal')}
        activeOpacity={0.8}
      >
        <GlassCard variant="float-card" style={[styles.paymentCardInner, paymentMethod === 'paypal' && styles.paymentCardActive]}>
          <View style={styles.paymentCardHeader}>
            <View style={styles.radioRow}>
              <View style={styles.radioButton}>
                {paymentMethod === 'paypal' && <View style={styles.radioButtonDot} />}
              </View>
              <Text style={styles.paymentOptionText}>PayPal Checkout</Text>
            </View>
            <Text style={styles.paypalLogo}>PayPal</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  paymentOption: {
    marginBottom: 14,
  },
  paymentOptionActive: {
    borderRadius: 20,
  },
  paymentCardInner: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentCardActive: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accentGlow,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: tokens.colors.muted,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.accent,
  },
  paymentOptionText: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  cardForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.line,
  },
  cardFormNote: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  paypalLogo: {
    color: '#0079C1',
    fontFamily: 'Raleway_700Bold',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
