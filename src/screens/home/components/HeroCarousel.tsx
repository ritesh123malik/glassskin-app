import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { GlassButton } from '../../../components/common/GlassButton';
import { ModelViewer3D } from '../../../components/common/ModelViewer3D';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';
import { Product } from '../../../types';

type HeroMoment = {
  id: string;
  eyebrow: string;
  headline: string;
  italic: string;
  lede: string;
  asset: any;
  badgeLeft: string;
  badgeRight: string;
  productId: string;
};

type Props = {
  heroes: HeroMoment[];
  products: Product[];
  activeHeroIndex: number;
  onHeroScroll: (event: any) => void;
  scrollToHero: (index: number) => void;
  onShopPress: () => void;
  onProductPress: (productId: string) => void;
};

export const HeroCarousel = ({
  heroes,
  products,
  activeHeroIndex,
  onHeroScroll,
  scrollToHero,
  onShopPress,
  onProductPress,
}: Props) => {
  return (
    <View style={styles.heroSection}>
      <ScrollView 
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH}
        decelerationRate="fast"
        disableIntervalMomentum={true}
        onScroll={onHeroScroll}
        scrollEventThrottle={16}
      >
        {heroes.map((hero) => (
          <View key={hero.id} style={{ width: SCREEN_WIDTH }}>
            <View style={[styles.heroTextContainer, { paddingHorizontal: 20 }]}>
              <Text style={styles.heroEyebrow}>{hero.eyebrow}</Text>
              <Text style={styles.heroHeadline}>
                {hero.headline}{'\n'}
                <Text style={styles.heroHeadlineItalic}>{hero.italic}</Text>
              </Text>
              <Text style={styles.heroLede}>{hero.lede}</Text>
              <View style={styles.heroButtons}>
                <GlassButton 
                  title="Shop Now" 
                  variant="primary" 
                  onPress={onShopPress}
                  style={{ flex: 1, marginRight: 12 }}
                />
                <GlassButton 
                  title="View All" 
                  variant="ghost" 
                  onPress={onShopPress}
                  style={{ flex: 1 }}
                />
              </View>
            </View>

            <View style={[styles.heroStageWrapper, { paddingHorizontal: 20 }]}>
              <GlassCard variant="bento-item" style={styles.heroStageCard}>
                <View style={styles.viewerContainer}>
                  {(() => {
                    const product = products.find(p => p.id === hero.productId);
                    return (
                      <ModelViewer3D 
                        modelAsset={hero.asset} 
                        fallbackImage={product?.images[0]}
                        testID={`model-viewer-${hero.id}`}
                      />
                    );
                  })()}
                </View>
                {/* Floating Badges */}
                <GlassCard variant="float-card" style={styles.heroBadgeLeft}>
                  <Text style={styles.heroBadgeText}>{hero.badgeLeft}</Text>
                </GlassCard>
                <GlassCard variant="float-card" style={styles.heroBadgeRight}>
                  <Text style={styles.heroBadgeText}>{hero.badgeRight}</Text>
                </GlassCard>
              </GlassCard>
            </View>
          </View>
        ))}
      </ScrollView>
      
      {/* Pagination Indicators and Arrows */}
      <View style={styles.paginationContainer}>
        <TouchableOpacity 
          onPress={() => scrollToHero(activeHeroIndex - 1)} 
          disabled={activeHeroIndex === 0}
          style={[styles.chevronButton, { opacity: activeHeroIndex === 0 ? 0 : 1 }]}
        >
          <ChevronLeft size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.dotsWrapper}>
          {heroes.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => scrollToHero(i)}>
              <View 
                style={[
                  styles.paginationDot, 
                  i === activeHeroIndex ? styles.paginationDotActive : null
                ]} 
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          onPress={() => scrollToHero(activeHeroIndex + 1)} 
          disabled={activeHeroIndex === heroes.length - 1}
          style={[styles.chevronButton, { opacity: activeHeroIndex === heroes.length - 1 ? 0 : 1 }]}
        >
          <ChevronRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

import { Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  heroSection: {
    marginBottom: 10,
  },
  heroTextContainer: {
    marginBottom: 24,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    color: tokens.colors.muted,
    marginBottom: 12,
  },
  heroHeadline: {
    ...typography.display,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1,
    color: tokens.colors.ink,
    marginBottom: 16,
  },
  heroHeadlineItalic: {
    ...typography.italic,
    color: tokens.colors.accent,
  },
  heroLede: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: tokens.colors.ink,
    opacity: 0.8,
    marginBottom: 24,
  },
  heroButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStageWrapper: {
    position: 'relative',
    height: 400,
    marginBottom: 20,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  chevronButton: {
    backgroundColor: tokens.colors.ink,
    borderRadius: 999,
    padding: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0B0B0C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  dotsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.muted,
    marginHorizontal: 4,
    opacity: 0.5,
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: tokens.colors.accent,
    opacity: 1,
  },
  heroStageCard: {
    height: '100%',
    padding: 2, 
    borderRadius: 24,
  },
  viewerContainer: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surface,
  },
  heroBadgeLeft: {
    position: 'absolute',
    top: 20,
    left: -10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  heroBadgeRight: {
    position: 'absolute',
    bottom: 40,
    right: -10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  heroBadgeText: {
    ...typography.eyebrow,
    color: tokens.colors.ink,
    fontSize: 10,
  },
});
