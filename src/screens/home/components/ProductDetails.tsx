import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { Product } from '../../../types';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';
import { sanitizeText } from '../../../services/reviewService';

type Props = {
  product: Product;
  expandedSection: 'desc' | 'ing' | 'use' | null;
  onToggleSection: (section: 'desc' | 'ing' | 'use') => void;
};

export const ProductDetails = ({ product, expandedSection, onToggleSection }: Props) => {
  return (
    <View style={styles.bentoGrid}>
      <GlassCard variant="bento-item" style={styles.bentoFull}>
        <TouchableOpacity onPress={() => onToggleSection('desc')} activeOpacity={0.8}>
          <View style={styles.bentoHeader}>
            <Text style={styles.bentoTitle}>Description</Text>
            {expandedSection === 'desc' ? <ChevronUp size={16} color={tokens.colors.muted} /> : <ChevronDown size={16} color={tokens.colors.muted} />}
          </View>
          {expandedSection === 'desc' && (
            <Text style={styles.bentoContent}>{sanitizeText(product.description)}</Text>
          )}
        </TouchableOpacity>
      </GlassCard>
      
      <View style={styles.bentoRow}>
        <GlassCard variant="bento-item" style={styles.bentoHalf}>
          <TouchableOpacity onPress={() => onToggleSection('ing')} activeOpacity={0.8}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoTitle}>Ingredients</Text>
              {expandedSection === 'ing' ? <ChevronUp size={16} color={tokens.colors.muted} /> : <ChevronDown size={16} color={tokens.colors.muted} />}
            </View>
            {expandedSection === 'ing' && (
              <Text style={styles.bentoContent}>
                {sanitizeText(product.ingredients || 'Aloe Barbadensis Leaf Juice, Centella Asiatica, Hyaluronic Acid, Niacinamide.')}
              </Text>
            )}
          </TouchableOpacity>
        </GlassCard>
        <GlassCard variant="bento-item" style={styles.bentoHalf}>
          <TouchableOpacity onPress={() => onToggleSection('use')} activeOpacity={0.8}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoTitle}>How to Use</Text>
              {expandedSection === 'use' ? <ChevronUp size={16} color={tokens.colors.muted} /> : <ChevronDown size={16} color={tokens.colors.muted} />}
            </View>
            {expandedSection === 'use' && (
              <Text style={styles.bentoContent}>
                {sanitizeText(product.usage || 'Massage 2–3 drops into face and neck morning and night.')}
              </Text>
            )}
          </TouchableOpacity>
        </GlassCard>
      </View>
    </View>
  );
};

import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  bentoGrid: {
    marginBottom: 30,
    gap: 12,
  },
  bentoFull: {
    padding: 20,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoHalf: {
    flex: 1,
    padding: 20,
  },
  bentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginBottom: 8,
  },
  bentoContent: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
});
