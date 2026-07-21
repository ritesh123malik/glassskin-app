import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, CreditCard, ShoppingBag } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';
import { CartItem, ShippingAddress } from '../../../types';

type Props = {
  shippingAddress: ShippingAddress;
  guestEmail: string;
  isGuest: boolean;
  paymentMethod: 'card' | 'paypal';
  cartItems: CartItem[];
  displayTotals: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    taxRate: number;
  };
};

export const ReviewStep = ({ shippingAddress, guestEmail, isGuest, paymentMethod, cartItems, displayTotals }: Props) => {
  return (
    <View>
      {/* Shipping details review */}
      <GlassCard variant="float-card" style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <MapPin size={16} color="#D9B79A" />
          <Text style={styles.reviewCardTitle}>Shipping Details</Text>
        </View>
        <Text style={styles.reviewText}>{shippingAddress.fullName}</Text>
        {isGuest && <Text style={styles.reviewText}>Email: {guestEmail}</Text>}
        <Text style={styles.reviewText}>
          {shippingAddress.addressLine1}, {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
        </Text>
      </GlassCard>

      {/* Payment details review */}
      <GlassCard variant="float-card" style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <CreditCard size={16} color="#D9B79A" />
          <Text style={styles.reviewCardTitle}>Payment Details</Text>
        </View>
          <Text style={styles.reviewText}>
            {paymentMethod === 'card' ? 'Credit Card (via Stripe)' : 'PayPal Account'}
          </Text>
      </GlassCard>

      {/* Cart products review */}
      <GlassCard variant="float-card" style={styles.reviewCard}>
        <View style={styles.reviewCardHeader}>
          <ShoppingBag size={16} color="#D9B79A" />
          <Text style={styles.reviewCardTitle}>Review Items</Text>
        </View>
        {cartItems.map((item) => (
          <View key={item.id} style={styles.reviewItemRow}>
            <Text style={styles.reviewItemQty}>{item.quantity}x</Text>
            <Text style={styles.reviewItemName} numberOfLines={1}>{item.product?.name}</Text>
            <Text style={styles.reviewItemPrice}>
              ${((item.product?.price || 0) * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
      </GlassCard>

      {/* Financial totals breakdown */}
      <GlassCard variant="bento-item" style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalVal}>${displayTotals.subtotal.toFixed(2)}</Text>
        </View>
        {displayTotals.discount > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discount</Text>
            <Text style={[styles.totalVal, styles.discountVal]}>-${displayTotals.discount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Shipping</Text>
          <Text style={styles.totalVal}>{displayTotals.shipping === 0 ? 'FREE' : `$${displayTotals.shipping.toFixed(2)}`}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax ({shippingAddress.state.toUpperCase()} — {(displayTotals.taxRate * 100).toFixed(2)}%)</Text>
          <Text style={styles.totalVal}>${displayTotals.tax.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={[styles.totalRow, styles.finalTotalRow]}>
          <Text style={styles.finalTotalLabel}>Grand Total</Text>
          <Text style={styles.finalTotalVal}>${displayTotals.total.toFixed(2)}</Text>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  reviewCard: {
    padding: 16,
    marginBottom: 12,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewCardTitle: {
    ...typography.eyebrow,
    color: tokens.colors.muted,
    marginLeft: 8,
  },
  reviewText: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  reviewItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
  },
  reviewItemQty: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
    width: 24,
  },
  reviewItemName: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  reviewItemPrice: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  totalsCard: {
    padding: 16,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  totalVal: {
    color: tokens.colors.ink,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  discountVal: {
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.line,
    marginVertical: 12,
  },
  finalTotalRow: {
    marginBottom: 0,
  },
  finalTotalLabel: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
  },
  finalTotalVal: {
    color: tokens.colors.accent,
    fontSize: 18,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
  },
});
