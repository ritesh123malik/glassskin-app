import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, RefreshControl } from 'react-native';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/common/GlassCard';
import { Image } from 'expo-image';
import { analytics } from '../../services/analytics';

export const WishlistScreen = ({ navigation }: any) => {
  const wishlistItems = useAppStore(state => state.wishlistItems);
  const fetchWishlist = useAppStore(state => state.fetchWishlist);
  const toggleWishlist = useAppStore(state => state.toggleWishlist);
  const addToCart = useAppStore(state => state.addToCart);
  const user = useAppStore(state => state.user);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
    analytics.trackScreenView('Wishlist');
  }, [user]);

  const onRefresh = useCallback(async () => {
    if (user) {
      setRefreshing(true);
      await fetchWishlist();
      setRefreshing(false);
    }
  }, [user]);

  const handleQuickAdd = (productId: string) => {
    addToCart(productId, 1);
  };

  const handleRemove = (productId: string) => {
    toggleWishlist(productId);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
      </View>

      {wishlistItems.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8E5D34"
              colors={['#8E5D34']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyHeartWrapper}>
                <Heart size={48} color="#6B6660" strokeWidth={1} />
              </View>
              <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
              <Text style={styles.emptySubtitle}>
                Save your favorite clean beauty products here to purchase them later.
              </Text>
              <TouchableOpacity
                style={styles.shopBtn}
                onPress={() => navigation.navigate('Shop')}
              >
                <Text style={styles.shopBtnText}>Explore Products</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      ) : (
        <FlatList
          data={wishlistItems}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={15}
          windowSize={7}
          keyExtractor={(item) => item.id}
          getItemLayout={(data, index) => ({
            length: 86,
            offset: 86 * index,
            index,
          })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8E5D34"
              colors={['#8E5D34']}
            />
          }
          renderItem={({ item }) => {
            const product = item.product;
            if (!product) return null;
            return (
              <GlassCard intensity="medium" style={styles.itemCard}>
                <View style={styles.itemRow}>
                  {/* Thumbnail Image */}
                  <View style={styles.itemImageContainer}>
                    {product.images && product.images[0] ? (
                      <Image
                        source={{ uri: product.images[0] }}
                        style={styles.itemImage}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="disk"
                      />
                    ) : (
                      <View style={styles.itemImagePlaceholder}>
                        <Text style={styles.emojiIcon}>🧴</Text>
                      </View>
                    )}
                  </View>

                  {/* Left: Product Info */}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemCategory}>{product.category}</Text>
                    <Text style={styles.itemName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.itemPrice}>${product.price.toFixed(2)}</Text>
                  </View>

                  {/* Right: Quick actions */}
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.addBtn]}
                      onPress={() => handleQuickAdd(product.id)}
                      activeOpacity={0.7}
                    >
                      <ShoppingBag size={16} color="#0B0B0C" />
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.removeBtn]}
                      onPress={() => handleRemove(product.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F2EE',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: '#0B0B0C',
    fontSize: 20,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  itemCard: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EFE8E1',
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiIcon: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemCategory: {
    color: '#94A3B8',
    fontSize: 10,
    textTransform: 'uppercase',
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
  },
  itemName: {
    color: '#0B0B0C',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
    marginTop: 2,
  },
  itemPrice: {
    color: '#8E5D34',
    fontSize: 14,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: '#8E5D34',
    paddingHorizontal: 10,
    marginRight: 6,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#0B0B0C',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  removeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    width: 36,
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyHeartWrapper: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#0B0B0C',
    fontFamily: 'Raleway_700Bold',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 24,
  },
  shopBtn: {
    backgroundColor: '#8E5D34',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  shopBtnText: {
    color: '#0B0B0C',
    fontSize: 14,
    fontFamily: 'Raleway_700Bold',
    fontWeight: 'bold',
  },
});
