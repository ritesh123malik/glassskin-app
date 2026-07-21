import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { GlassButton } from '../../../components/common/GlassButton';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
};

export const AddToCartCard = ({ quantity, onQuantityChange, onAddToCart }: Props) => {
  return (
    <GlassCard variant="float-card" style={styles.actionCard}>
      <View style={styles.quantityRow}>
        <Text style={styles.quantityLabel}>Quantity</Text>
        <View style={styles.quantitySelector}>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
            accessibilityHint="Decreases product quantity by one"
            testID="qty-minus"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Minus size={16} color="#0B0B0C" />
          </TouchableOpacity>
          <Text
            style={styles.quantityText}
            accessible={true}
            accessibilityLabel={`Selected quantity: ${quantity}`}
          >
            {quantity}
          </Text>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => onQuantityChange(quantity + 1)}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
            accessibilityHint="Increases product quantity by one"
            testID="qty-plus"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus size={16} color="#0B0B0C" />
          </TouchableOpacity>
        </View>
      </View>
      <GlassButton title="Add to Cart" onPress={onAddToCart} variant="primary" style={styles.addToCartBtn} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  actionCard: { padding: 16, marginBottom: 24 },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  quantityLabel: { color: tokens.colors.ink, fontSize: 15, fontFamily: 'Inter_500Medium' },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: tokens.colors.glass, borderRadius: 8, borderWidth: 1, borderColor: tokens.colors.line },
  quantityBtn: { padding: 10 },
  quantityText: { color: tokens.colors.ink, fontSize: 16, fontFamily: 'Raleway_700Bold', fontWeight: '700', paddingHorizontal: 14 },
  addToCartBtn: { width: '100%' },
});
