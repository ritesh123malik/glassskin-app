import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { Product } from '../../../types';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';
import { sanitizeText } from '../../../services/reviewService';

type Props = {
  product: Product;
};

export const ProductInfo = ({ product }: Props) => {
  return (
    <View style={styles.infoContainer}>
      <Text style={styles.category}>{sanitizeText(product.category)}</Text>
      <Text style={styles.name}>{sanitizeText(product.name)}</Text>

      {/* Rating Row */}
      <View style={styles.ratingRow}>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              size={14}
              color={s <= Math.round(product.rating) ? '#FBBF24' : '#6B6660'}
              fill={s <= Math.round(product.rating) ? '#FBBF24' : 'transparent'}
            />
          ))}
        </View>
        <Text style={styles.ratingText}>
          {product.rating} ({product.review_count} reviews)
        </Text>
      </View>

      {/* Price */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>${product.price.toFixed(2)}</Text>
        {product.compare_at_price && (
          <Text style={styles.comparePrice}>${product.compare_at_price.toFixed(2)}</Text>
        )}
      </View>

      {/* Certifications */}
      {product.certifications && product.certifications.length > 0 && (
        <View style={styles.certRow}>
          {product.certifications.map(cert => (
            <View key={cert} style={styles.certBadge}>
              <Text style={styles.certText}>{sanitizeText(cert)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  infoContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  category: { ...typography.eyebrow, color: tokens.colors.muted },
  name: { ...typography.display, color: tokens.colors.ink, fontSize: 24, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  starsContainer: { flexDirection: 'row' },
  ratingText: { color: tokens.colors.muted, fontSize: 13, fontFamily: 'Inter_400Regular', marginLeft: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12, marginBottom: 16 },
  price: { color: tokens.colors.accent, fontSize: 24, fontFamily: 'Raleway_700Bold', fontWeight: '700' },
  comparePrice: { color: tokens.colors.muted, fontSize: 16, fontFamily: 'Inter_400Regular', textDecorationLine: 'line-through', marginLeft: 8 },
  certRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  certBadge: { backgroundColor: 'rgba(176,122,74,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 8, marginBottom: 6 },
  certText: { color: tokens.colors.accent, fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 },
});
