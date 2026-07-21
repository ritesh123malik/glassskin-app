import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Heart } from 'lucide-react-native';
import { Product } from '../../types';
import { GlassCard } from '../common/GlassCard';
import { useAppStore } from '../../store/useAppStore';
import { typography } from '../../theme/typography';
import { tokens } from '../../theme/tokens';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  /** Whether to render as a larger editorial feature card */
  feature?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, feature = false }) => {
  const { addToCart, toggleWishlist, isProductWishlisted } = useAppStore();
  const wishlisted = isProductWishlisted(product.id);

  const handleAddToCart = (e: any) => {
    e.stopPropagation();
    addToCart(product.id, 1);
  };

  const handleWishlistPress = (e: any) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <GlassCard variant="product-card">
        {/* Product Image Section */}
        <View style={[styles.visual, feature && styles.visualFeature]}>
          <Image
            source={{ uri: product.images[0] }}
            style={styles.image}
            contentFit="contain"
            transition={200}
            cachePolicy="disk"
          />
          <TouchableOpacity
            testID="product-card-wishlist"
            style={styles.wishlistButton}
            onPress={handleWishlistPress}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <Heart
              size={18}
              color={wishlisted ? '#EF4444' : tokens.colors.muted}
              fill={wishlisted ? '#EF4444' : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        {/* Product Info Section */}
        <View style={styles.body}>
          <Text style={styles.category}>Nº01 {product.category}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>

          <View style={styles.row}>
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
            
            <TouchableOpacity
              testID="product-card-add-to-cart"
              style={styles.addButton}
              onPress={handleAddToCart}
              hitSlop={10}
            >
              <Text style={styles.addText}>ADD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginHorizontal: 4,
    marginVertical: 6,
  },
  visual: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: tokens.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  visualFeature: {
    aspectRatio: 1, // slightly different aspect ratio for feature cards if desired
  },
  image: {
    width: '70%',
    height: '70%',
  },
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingTop: 22,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  category: {
    ...typography.eyebrow,
    color: tokens.colors.muted,
  },
  name: {
    ...typography.display,
    fontSize: 22, // overriding the default display size for the card
    letterSpacing: -0.01 * 22,
    lineHeight: 22 * 1.2,
    marginTop: 6,
    marginBottom: 8,
    color: tokens.colors.ink,
  },
  price: {
    ...typography.italic,
    color: tokens.colors.inkLight,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: tokens.colors.ink,
  },
  addText: {
    ...typography.eyebrow,
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 10 * 0.24,
  }
});
