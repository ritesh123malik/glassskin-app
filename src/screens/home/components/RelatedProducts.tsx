import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { Product } from '../../../types';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';
import { sanitizeText } from '../../../services/reviewService';

type Props = {
  products: Product[];
  onProductPress: (productId: string) => void;
};

export const RelatedProducts = ({ products, onProductPress }: Props) => {
  if (products.length === 0) return null;

  return (
    <View style={styles.relatedSection}>
      <Text style={styles.relatedTitle}>Related Skincare</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
        {products.map(p => (
          <TouchableOpacity
            key={p.id}
            style={styles.relatedCard}
            onPress={() => onProductPress(p.id)}
          >
            <GlassCard variant="bento-item" style={styles.relatedGlass}>
              <View style={styles.relatedImagePlaceholder}>
                <Text style={styles.emojiIcon}>🧴</Text>
              </View>
              <Text style={styles.relatedName} numberOfLines={1}>{sanitizeText(p.name)}</Text>
              <Text style={styles.relatedPrice}>${p.price.toFixed(2)}</Text>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  relatedSection: { marginTop: 30 },
  relatedTitle: { ...typography.display, color: tokens.colors.ink, fontSize: 16, marginBottom: 12 },
  relatedScroll: { paddingRight: 20 },
  relatedCard: { marginRight: 10, width: 120 },
  relatedGlass: { padding: 8, alignItems: 'center' },
  relatedImagePlaceholder: { width: 80, height: 80, borderRadius: 8, backgroundColor: tokens.colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emojiIcon: { fontSize: 32 },
  relatedName: { color: tokens.colors.ink, fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center', width: '100%' },
  relatedPrice: { color: tokens.colors.accent, fontSize: 12, fontFamily: 'Raleway_700Bold', fontWeight: '700', marginTop: 4 },
});
