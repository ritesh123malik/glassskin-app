import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { RevealOnScroll } from '../../../components/common/RevealOnScroll';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  scrollY: any;
  screenHeight: number;
  onPress: () => void;
};

export const PromoBanner = ({ scrollY, screenHeight, onPress }: Props) => {
  return (
    <RevealOnScroll scrollY={scrollY} screenHeight={screenHeight}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.promoContainer}
        onPress={onPress}
      >
        <GlassCard variant="bento-item" style={styles.promoCard}>
          <View style={styles.promoContent}>
            <View style={styles.promoBadge}>
              <Sparkles size={10} color={tokens.colors.accent} fill={tokens.colors.accent} />
              <Text style={styles.promoBadgeText}>Special Offer</Text>
            </View>
            <Text style={styles.promoTitle}>Summer Glow Sale</Text>
            <Text style={styles.promoSubtitle}>Get 20% off all skincare products</Text>
            <Text style={styles.promoAction}>Tap to Shop Now →</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </RevealOnScroll>
  );
};

const styles = StyleSheet.create({
  promoContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  promoCard: {
    minHeight: 120,
    justifyContent: 'center',
  },
  promoContent: {
    zIndex: 2,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(176, 122, 74, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  promoBadgeText: {
    color: tokens.colors.accent,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
    marginLeft: 4,
  },
  promoTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 20,
  },
  promoSubtitle: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 4,
  },
  promoAction: {
    color: tokens.colors.accent,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 12,
  },
});
