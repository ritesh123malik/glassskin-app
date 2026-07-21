import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, TextInput, Alert, Platform, RefreshControl } from 'react-native';
import { ShoppingCart, Plus, Minus, Trash2, Ticket, X } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { Image } from 'expo-image';
import { analytics } from '../../services/analytics';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

const FLOATING_TAB_BAR_CLEARANCE = 96;

import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: BottomTabNavigationProp<TabParamList, 'Cart'>;
};

export const CartScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const cartItems = useAppStore(state => state.cartItems);
  const fetchCart = useAppStore(state => state.fetchCart);
  const updateCartQuantity = useAppStore(state => state.updateCartQuantity);
  const removeFromCart = useAppStore(state => state.removeFromCart);
  const applyPromoCode = useAppStore(state => state.applyPromoCode);
  const removePromoCode = useAppStore(state => state.removePromoCode);
  const appliedPromo = useAppStore(state => state.appliedPromo);
  const getCartTotals = useAppStore(state => state.getCartTotals);
  const user = useAppStore(state => state.user);

  const [promoInput, setPromoInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Undo snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [lastRemovedItem, setLastRemovedItem] = useState<{ item: any; index: number } | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<any>(null);
  const [hiddenItemIds, setHiddenItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchCart();
    }
    analytics.trackScreenView('Cart');
  }, [user]);

  // Clean up timeouts on unmount and finalize any pending deletions
  useEffect(() => {
    return () => {
      if (undoTimeout) {
        clearTimeout(undoTimeout);
        if (lastRemovedItem) {
          removeFromCart(lastRemovedItem.item.id);
        }
      }
    };
  }, [undoTimeout, lastRemovedItem]);

  const onRefresh = useCallback(async () => {
    if (user) {
      setRefreshing(true);
      await fetchCart();
      setRefreshing(false);
    }
  }, [user]);

  const [promoLoading, setPromoLoading] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    const success = await applyPromoCode(promoInput);
    setPromoLoading(false);
    if (success) {
      Alert.alert('Coupon Applied', `Promo code ${promoInput.toUpperCase().trim()} has been applied!`);
      setPromoInput('');
    } else {
      Alert.alert('Invalid Code', 'The promo code you entered is invalid or has expired.');
    }
  };

  const handleSwipeDelete = (itemId: string) => {
    const itemIndex = cartItems.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const targetItem = cartItems[itemIndex];

    // Clear any pending undo before starting a new one
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      if (lastRemovedItem) {
        removeFromCart(lastRemovedItem.item.id);
      }
    }

    setLastRemovedItem({ item: targetItem, index: itemIndex });
    setHiddenItemIds(prev => [...prev, itemId]);
    setSnackbarVisible(true);

    const timeout = setTimeout(() => {
      removeFromCart(targetItem.id);
      setSnackbarVisible(false);
      setLastRemovedItem(null);
      setUndoTimeout(null);
      setHiddenItemIds(prev => prev.filter(id => id !== itemId));
    }, 5000);

    setUndoTimeout(timeout);
  };

  const handleUndo = () => {
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }
    setHiddenItemIds([]);
    setSnackbarVisible(false);
    setLastRemovedItem(null);
  };

  const renderRightActions = (itemId: string) => {
    return (
      <TouchableOpacity
        style={styles.swipeDeleteBtn}
        onPress={() => handleSwipeDelete(itemId)}
      >
        <Trash2 size={24} color="#0B0B0C" />
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const totals = getCartTotals();
  const visibleItems = cartItems.filter(item => !hiddenItemIds.includes(item.id));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
        </View>

        {visibleItems.length === 0 ? (
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
                <View style={styles.emptyCartWrapper}>
                  <ShoppingCart size={48} color="#6B6660" strokeWidth={1} />
                </View>
                <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
                <Text style={styles.emptySubtitle}>
                  Looks like you haven't added any clean skincare products to your cart yet.
                </Text>
                <TouchableOpacity
                  style={styles.shopBtn}
                  onPress={() => navigation.navigate('Shop')}
                >
                  <Text style={styles.shopBtnText}>Shop Skincare</Text>
                </TouchableOpacity>
              </View>
            }
            contentContainerStyle={{ flexGrow: 1 }}
          />
        ) : (
          <View style={styles.cartContentContainer}>
            <FlatList
              data={visibleItems}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              initialNumToRender={8}
              maxToRenderPerBatch={15}
              windowSize={7}
              getItemLayout={(data, index) => ({
                length: 106,
                offset: 106 * index,
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
                  <Swipeable
                    renderRightActions={() => renderRightActions(item.id)}
                    onSwipeableOpen={(direction) => {
                      if (direction === 'right') {
                        handleSwipeDelete(item.id);
                      }
                    }}
                  >
                    <GlassCard variant="float-card" style={styles.itemCard}>
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

                        {/* Item Details */}
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemCategory}>{product.category}</Text>
                          <Text style={styles.itemName} numberOfLines={1}>{product.name}</Text>
                          <Text style={styles.itemPrice}>${product.price.toFixed(2)}</Text>
                        </View>

                        {/* Quantity Selector and Delete */}
                        <View style={styles.itemActions}>
                          <View style={styles.quantitySelector}>
                            <TouchableOpacity
                              style={styles.quantityBtn}
                              onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus size={14} color="#0B0B0C" />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={styles.quantityBtn}
                              onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus size={14} color="#0B0B0C" />
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleSwipeDelete(item.id)}
                          >
                            <Trash2 size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </GlassCard>
                  </Swipeable>
                );
              }}
              ListFooterComponent={
                <View>
                  {/* Promo Code Input */}
                  <GlassCard variant="float-card" style={styles.promoCard}>
                    <View style={styles.promoInputRow}>
                      <Ticket size={18} color="rgba(248, 250, 252, 0.5)" style={styles.promoIcon} />
                      <TextInput
                        placeholder="Enter Promo Code"
                        placeholderTextColor="rgba(248, 250, 252, 0.4)"
                        style={styles.promoInput}
                        value={promoInput}
                        onChangeText={setPromoInput}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity
                        style={[styles.promoApplyBtn, promoLoading && styles.promoApplyBtnDisabled]}
                        onPress={handleApplyPromo}
                        disabled={promoLoading}
                      >
                        <Text style={styles.promoApplyBtnText}>{promoLoading ? 'Applying' : 'Apply'}</Text>
                      </TouchableOpacity>
                    </View>

                    {appliedPromo && (
                      <View style={styles.appliedPromoBadge}>
                        <Text style={styles.appliedPromoText}>
                          Code: {appliedPromo.code} (
                          {appliedPromo.discountType === 'percent'
                            ? `${appliedPromo.discountValue}% Off`
                            : `$${appliedPromo.discountValue} Off`}
                          )
                        </Text>
                        <TouchableOpacity onPress={removePromoCode}>
                          <X size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </GlassCard>

                  {/* Order Summary breakdown */}
                  <GlassCard variant="bento-item" style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Order Summary</Text>
                    
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryValue}>${totals.subtotal.toFixed(2)}</Text>
                    </View>

                    {totals.discount > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Discount</Text>
                        <Text style={[styles.summaryValue, styles.discountText]}>
                          -${totals.discount.toFixed(2)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Shipping</Text>
                      <Text style={styles.summaryValue}>
                        {totals.shipping === 0 ? 'FREE' : `$${totals.shipping.toFixed(2)}`}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Tax (8%)</Text>
                      <Text style={styles.summaryValue}>${totals.tax.toFixed(2)}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={[styles.summaryRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Grand Total</Text>
                      <Text style={[styles.summaryValue, styles.totalLabel]}>${totals.total.toFixed(2)}</Text>
                    </View>
                  </GlassCard>
                </View>
              }
            />

            {/* Checkout Button */}
            <View
              style={[
                styles.footer,
                { marginBottom: insets.bottom + FLOATING_TAB_BAR_CLEARANCE },
              ]}
            >
              <GlassButton
                title="Proceed to Checkout"
                onPress={() => navigation.navigate('Checkout')}
                variant="primary"
                style={styles.checkoutBtn}
              />
            </View>
          </View>
        )}

        {/* Undoable Deletion Snackbar */}
        {snackbarVisible && lastRemovedItem && (
          <View style={[styles.snackbar, { bottom: insets.bottom + FLOATING_TAB_BAR_CLEARANCE }]}>
            <Text style={styles.snackbarText} numberOfLines={1}>
              Removed "{lastRemovedItem.item.product?.name}"
            </Text>
            <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
              <Text style={styles.undoText}>UNDO</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
  },
  headerTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 20,
  },
  cartContentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 160,
  },
  itemCard: {
    padding: 12,
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
    backgroundColor: tokens.colors.surface,
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
    ...typography.eyebrow,
    color: tokens.colors.muted,
  },
  itemName: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 14,
    marginTop: 2,
  },
  itemPrice: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.glass,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    marginRight: 10,
  },
  quantityBtn: {
    padding: 8,
  },
  quantityText: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  swipeDeleteBtn: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '88%',
    borderRadius: 16,
    marginBottom: 12,
  },
  swipeDeleteText: {
    color: tokens.colors.background,
    fontSize: 12,
    fontFamily: 'Raleway_700Bold',
    fontWeight: 'bold',
    marginTop: 4,
  },
  promoCard: {
    padding: 16,
    marginBottom: 16,
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.glass,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    paddingHorizontal: 12,
    height: 44,
  },
  promoIcon: {
    marginRight: 8,
  },
  promoInput: {
    flex: 1,
    color: tokens.colors.ink,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  promoApplyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: tokens.colors.accent,
    borderRadius: 6,
  },
  promoApplyBtnDisabled: {
    opacity: 0.6,
  },
  promoApplyBtnText: {
    color: tokens.colors.background,
    fontSize: 12,
    fontFamily: 'Raleway_700Bold',
    fontWeight: 'bold',
  },
  appliedPromoBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.accentGlow,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  appliedPromoText: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  summaryCard: {
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    color: tokens.colors.muted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  summaryValue: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  discountText: {
    color: '#22C55E',
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.line,
    marginVertical: 12,
  },
  totalRow: {
    marginBottom: 0,
  },
  totalLabel: {
    color: tokens.colors.accent,
    fontSize: 16,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    backgroundColor: tokens.colors.background,
    borderTopWidth: 1,
    borderColor: tokens.colors.line,
  },
  checkoutBtn: {
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyCartWrapper: {
    backgroundColor: tokens.colors.surface,
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 18,
  },
  emptySubtitle: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 24,
  },
  shopBtn: {
    backgroundColor: tokens.colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  shopBtnText: {
    color: tokens.colors.background,
    fontSize: 14,
    fontFamily: 'Raleway_700Bold',
    fontWeight: 'bold',
  },
  snackbar: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: tokens.colors.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.line,
    ...tokens.shadows.glass,
  },
  snackbarText: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
    marginRight: 8,
  },
  undoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  undoText: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Raleway_700Bold',
    fontWeight: 'bold',
  },
});
