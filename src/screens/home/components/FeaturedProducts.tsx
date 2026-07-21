import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ProductCard } from '../../../components/product/ProductCard';
import { ProductGridSkeleton } from '../../../components/common/Skeleton';
import { RevealOnScroll } from '../../../components/common/RevealOnScroll';
import { Product } from '../../../types';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  products: Product[];
  filteredProducts: Product[];
  productsLoading: boolean;
  scrollY: any;
  screenHeight: number;
  onProductPress: (productId: string) => void;
  onSeeAllPress: () => void;
};

export const FeaturedProducts = ({
  products,
  filteredProducts,
  productsLoading,
  scrollY,
  screenHeight,
  onProductPress,
  onSeeAllPress,
}: Props) => {
  return (
    <RevealOnScroll scrollY={scrollY} screenHeight={screenHeight}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Products</Text>
        <TouchableOpacity onPress={onSeeAllPress}>
          <Text style={styles.seeAllLink}>See All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.productsGrid}>
        {productsLoading && filteredProducts.length === 0 ? (
          Array.from({ length: 4 }).map((_, index) => (
            <ProductGridSkeleton key={index} />
          ))
        ) : (
          filteredProducts.slice(0, 4).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => onProductPress(product.id)}
            />
          ))
        )}
      </View>
    </RevealOnScroll>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 18,
  },
  seeAllLink: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    marginBottom: 30,
  },
});
