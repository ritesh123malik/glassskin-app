import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Modal, Platform, FlatList, RefreshControl } from 'react-native';
import { Filter, ArrowUpDown, Grid, List, X, Check, WifiOff } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { ProductCard } from '../../components/product/ProductCard';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { Image } from 'expo-image';
import { ProductGridSkeleton, ProductListSkeleton } from '../../components/common/Skeleton';
import { analytics } from '../../services/analytics';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

const SKIN_TYPES = ['dry', 'oily', 'sensitive', 'normal', 'combination'];
const CERTIFICATIONS = ['organic', 'vegan', 'cruelty-free', 'toxin-free'];
const CATEGORIES = ['Skincare', 'Body Care', 'Hair Care'];

export const ProductListingScreen = ({ route, navigation }: any) => {
  const products = useAppStore(state => state.products);
  const fetchProducts = useAppStore(state => state.fetchProducts);
  const productsLoading = useAppStore(state => state.productsLoading);
  const isOffline = useAppStore(state => state.isOffline);
  
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isGridView, setIsGridView] = useState(true);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<string[]>([]);
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState<number>(100);
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'newest' | 'rating'>('rating');

  useEffect(() => {
    if (route.params) {
      if (route.params.query) {
        setSearch(route.params.query);
      }
      if (route.params.category) {
        setSelectedCategory(route.params.category);
      }
    }
  }, [route.params]);

  const [refreshing, setRefreshing] = useState(false);

  const applyFilters = useCallback((forceRefresh = false) => {
    const filters: any = {
      search: search || undefined,
      category: selectedCategory || undefined,
      skinTypes: selectedSkinTypes.length > 0 ? selectedSkinTypes : undefined,
      certifications: selectedCerts.length > 0 ? selectedCerts : undefined,
      priceRange: [0, priceMax],
      sortBy: sortBy
    };
    analytics.trackFilter(filters);
    fetchProducts(filters, forceRefresh);
  }, [search, selectedCategory, selectedSkinTypes, selectedCerts, priceMax, sortBy]);

  useEffect(() => {
    applyFilters(false);
    analytics.trackScreenView('ProductListing');
  }, [applyFilters]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await applyFilters(true);
    setRefreshing(false);
  }, [applyFilters]);

  const toggleSkinType = (type: string) => {
    if (selectedSkinTypes.includes(type)) {
      setSelectedSkinTypes(selectedSkinTypes.filter(t => t !== type));
    } else {
      setSelectedSkinTypes([...selectedSkinTypes, type]);
    }
  };

  const toggleCert = (cert: string) => {
    if (selectedCerts.includes(cert)) {
      setSelectedCerts(selectedCerts.filter(c => c !== cert));
    } else {
      setSelectedCerts([...selectedCerts, cert]);
    }
  };

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedSkinTypes([]);
    setSelectedCerts([]);
    setPriceMax(100);
    setSearch('');
  };

  const activeFilterCount = 
    (selectedCategory ? 1 : 0) + 
    selectedSkinTypes.length + 
    selectedCerts.length + 
    (priceMax < 100 ? 1 : 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header / Search */}
      <View style={styles.header}>
        <GlassCard variant="float-card" style={styles.searchBar}>
          <TextInput
            placeholder="Search products..."
            placeholderTextColor={tokens.colors.muted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={tokens.colors.muted} />
            </TouchableOpacity>
          )}
        </GlassCard>
      </View>

      {/* Controls Bar */}
      <View style={styles.controlsBar}>
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => setIsFilterOpen(true)}
        >
          <Filter size={16} color={activeFilterCount > 0 ? tokens.colors.accent : tokens.colors.ink} />
          <Text style={[styles.controlText, activeFilterCount > 0 ? styles.activeControlText : null]}>
            Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => setIsSortOpen(true)}
        >
          <ArrowUpDown size={16} color={tokens.colors.ink} />
          <Text style={styles.controlText}>Sort</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.viewToggle} 
          onPress={() => setIsGridView(!isGridView)}
        >
          {isGridView ? <List size={18} color={tokens.colors.ink} /> : <Grid size={18} color={tokens.colors.ink} />}
        </TouchableOpacity>
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color="#F59E0B" />
          <Text style={styles.offlineBannerText}>Offline — showing cached results</Text>
        </View>
      )}

      {productsLoading && products.length === 0 ? (
        <View style={[
          isGridView ? styles.gridContent : styles.listContent,
          { paddingTop: 12, flexDirection: isGridView ? 'row' : 'column', flexWrap: isGridView ? 'wrap' : 'nowrap', justifyContent: 'space-between' }
        ]}>
          {Array.from({ length: 6 }).map((_, index) => 
            isGridView ? (
              <ProductGridSkeleton key={index} />
            ) : (
              <ProductListSkeleton key={index} />
            )
          )}
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found matching filters.</Text>
          <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={isGridView ? 'grid' : 'list'}
          data={products}
          numColumns={isGridView ? 2 : 1}
          contentContainerStyle={[
            styles.scrollContent,
            isGridView ? styles.gridContentFlat : styles.listContent
          ]}
          columnWrapperStyle={isGridView ? { justifyContent: 'space-between' } : undefined}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          keyExtractor={(item) => item.id}
          getItemLayout={(data, index) => ({
            length: isGridView ? 240 : 120,
            offset: (isGridView ? 240 : 120) * index,
            index,
          })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.colors.accent}
              colors={[tokens.colors.accent]}
            />
          }
          renderItem={({ item: product }) => {
            if (isGridView) {
              return (
                <ProductCard
                  product={product}
                  onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
                />
              );
            }
            return (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
              >
                <GlassCard variant="float-card" style={styles.listItemCard}>
                  <View style={styles.listItemRow}>
                    <View style={styles.listItemImageContainer}>
                      {product.images && product.images[0] ? (
                        <Image
                          source={{ uri: product.images[0] }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                          transition={200}
                          cachePolicy="disk"
                        />
                      ) : (
                        <View style={styles.listItemImagePlaceholder}>
                          <Text style={styles.emojiIcon}>🧴</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.listItemDetails}>
                      <Text style={styles.listItemCategory}>{product.category}</Text>
                      <Text style={styles.listItemName}>{product.name}</Text>
                      <Text style={styles.listItemRating}>⭐️ {product.rating} ({product.review_count})</Text>
                      <Text style={styles.listItemPrice}>${product.price.toFixed(2)}</Text>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FILTER MODAL */}
      <Modal
        visible={isFilterOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setIsFilterOpen(false)}>
                <X size={20} color={tokens.colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Category */}
              <Text style={styles.filterSectionTitle}>Categories</Text>
              <View style={styles.filterOptionsRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.filterChip, isSelected ? styles.filterChipSelected : null]}
                      onPress={() => setSelectedCategory(isSelected ? null : cat)}
                    >
                      <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextSelected : null]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Skin Types */}
              <Text style={styles.filterSectionTitle}>Target Skin Types</Text>
              <View style={styles.filterOptionsRow}>
                {SKIN_TYPES.map((type) => {
                  const isSelected = selectedSkinTypes.includes(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.filterChip, isSelected ? styles.filterChipSelected : null]}
                      onPress={() => toggleSkinType(type)}
                    >
                      <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextSelected : null]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Certifications */}
              <Text style={styles.filterSectionTitle}>Certifications</Text>
              <View style={styles.filterOptionsRow}>
                {CERTIFICATIONS.map((cert) => {
                  const isSelected = selectedCerts.includes(cert);
                  return (
                    <TouchableOpacity
                      key={cert}
                      style={[styles.filterChip, isSelected ? styles.filterChipSelected : null]}
                      onPress={() => toggleCert(cert)}
                    >
                      <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextSelected : null]}>
                        {cert}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Price Max */}
              <Text style={styles.filterSectionTitle}>Max Price (${priceMax})</Text>
              <View style={styles.priceContainer}>
                <View style={styles.sliderOptions}>
                  {[30, 50, 70, 100].map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.priceOption, priceMax === val ? styles.priceOptionSelected : null]}
                      onPress={() => setPriceMax(val)}
                    >
                      <Text style={[styles.priceOptionText, priceMax === val ? styles.filterChipTextSelected : null]}>${val}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalResetBtn} onPress={resetFilters}>
                <Text style={styles.modalResetBtnText}>Reset All</Text>
              </TouchableOpacity>
              <GlassButton
                title="Apply Filters"
                onPress={() => setIsFilterOpen(false)}
                variant="primary"
                style={styles.modalApplyBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* SORT MODAL */}
      <Modal
        visible={isSortOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsSortOpen(false)}
      >
        <TouchableOpacity 
          style={styles.sortOverlay} 
          activeOpacity={1} 
          onPress={() => setIsSortOpen(false)}
        >
          <View style={styles.sortContent}>
            <Text style={styles.sortTitle}>Sort By</Text>
            {[
              { id: 'rating', label: 'Customer Rating' },
              { id: 'price-low', label: 'Price: Low to High' },
              { id: 'price-high', label: 'Price: High to Low' },
              { id: 'newest', label: 'Newest Arrivals' }
            ].map((opt) => {
              const isSelected = sortBy === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.sortOptionRow}
                  onPress={() => {
                    setSortBy(opt.id as any);
                    setIsSortOpen(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, isSelected ? styles.sortOptionTextSelected : null]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Check size={16} color={tokens.colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderBottomWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingVertical: 8,
    gap: 8,
  },
  offlineBannerText: {
    color: '#F59E0B',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  gridContentFlat: {
    paddingHorizontal: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: tokens.colors.ink,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    padding: 0,
    height: 40,
  },
  controlsBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.glass,
    height: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlText: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
    marginLeft: 6,
  },
  activeControlText: {
    color: tokens.colors.accent,
  },
  viewToggle: {
    padding: 6,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 120, // tab bar padding
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  listItem: {
    marginBottom: 16,
  },
  listItemCard: {
    padding: 12,
  },
  listItemRow: {
    flexDirection: 'row',
  },
  listItemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surface,
  },
  listItemImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiIcon: {
    fontSize: 32,
  },
  listItemDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  listItemCategory: {
    ...typography.eyebrow,
    color: tokens.colors.muted,
  },
  listItemName: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginTop: 4,
  },
  listItemRating: {
    color: tokens.colors.ink,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  listItemPrice: {
    color: tokens.colors.accent,
    fontSize: 16,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
    marginTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: tokens.colors.muted,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: tokens.colors.muted,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  resetBtn: {
    borderColor: tokens.colors.accent,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resetBtnText: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: tokens.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
  },
  modalTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 20,
  },
  modalBody: {
    padding: 20,
  },
  filterSectionTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: tokens.colors.glass,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipSelected: {
    backgroundColor: tokens.colors.accentGlow,
    borderColor: tokens.colors.accent,
  },
  filterChipText: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  filterChipTextSelected: {
    color: tokens.colors.accent,
    fontWeight: '600',
  },
  priceContainer: {
    marginBottom: 20,
  },
  sliderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceOption: {
    flex: 0.22,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: tokens.colors.glass,
  },
  priceOptionSelected: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accentGlow,
  },
  priceOptionText: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: tokens.colors.line,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalResetBtn: {
    paddingVertical: 12,
  },
  modalResetBtnText: {
    color: tokens.colors.muted,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  modalApplyBtn: {
    flex: 0.7,
  },
  
  // Sort Styles
  sortOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortContent: {
    width: '80%',
    backgroundColor: tokens.colors.background,
    borderRadius: 24,
    padding: 24,
  },
  sortTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 20,
    marginBottom: 20,
  },
  sortOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
  },
  sortOptionText: {
    color: tokens.colors.muted,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  sortOptionTextSelected: {
    color: tokens.colors.accent,
    fontWeight: '600',
  },
});
