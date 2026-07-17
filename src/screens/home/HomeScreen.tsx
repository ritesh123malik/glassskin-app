import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Platform, RefreshControl, Dimensions, ScrollView } from 'react-native';
import { Search, ShoppingBag, Bell, Sparkles, Send, WifiOff, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useAppStore } from '../../store/useAppStore';
import { ProductCard } from '../../components/product/ProductCard';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { ProductGridSkeleton } from '../../components/common/Skeleton';
import { ModelViewer3D } from '../../components/common/ModelViewer3D';
import { Marquee } from '../../components/common/Marquee';
import { RevealOnScroll } from '../../components/common/RevealOnScroll';
import { analytics } from '../../services/analytics';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { id: '1', name: 'All', icon: '✨' },
  { id: '2', name: 'Skincare', icon: '🧴' },
  { id: '3', name: 'Body Care', icon: '🧼' },
  { id: '4', name: 'Hair Care', icon: '🌿' }
];

// Lazy-load GLB for the Hero Stage
const getGlbAssets = () => {
  try {
    return {
      faceSerum: require('../../../assets/models/face_serum_bottle.glb'),
      riceWater: require('../../../assets/models/rice_water_gel.glb'),
      faceWash: require('../../../assets/models/face_wash_tube.glb'),
    };
  } catch {
    return { faceSerum: null, riceWater: null, faceWash: null };
  }
};
const assets = getGlbAssets();

const HERO_MOMENTS = [
  {
    id: 'hero1',
    eyebrow: 'SIGNATURE COLLECTION',
    headline: 'Radiance,',
    italic: 'Redefined.',
    lede: 'Experience our award-winning Hydrating Serum, formulated with pure botanical extracts for an effortless, glass-skin glow.',
    asset: assets.faceSerum,
    badgeLeft: 'Award Winning',
    badgeRight: '100% Vegan',
    productId: '00000000-0000-0000-0000-000000000001',
  },
  {
    id: 'hero2',
    eyebrow: 'CULT CLASSIC',
    headline: 'Purity,',
    italic: 'Preserved.',
    lede: 'Airtight cosmetic jar preserving the delicate rice water gel formula — keeps ingredients potent and fresh from first use to last.',
    asset: assets.riceWater,
    badgeLeft: 'Best Seller',
    badgeRight: 'Cruelty Free',
    productId: '00000000-0000-0000-0000-000000000002',
  },
  {
    id: 'hero3',
    eyebrow: 'NEW ARRIVAL',
    headline: 'Balance,',
    italic: 'Restored.',
    lede: 'Eco-friendly soft-touch tube perfectly sized for our Soothing Centella Gel Cleanser — travel-ready with a clean, hygienic finish.',
    asset: assets.faceWash,
    badgeLeft: 'Derm Tested',
    badgeRight: 'Eco Friendly',
    productId: '00000000-0000-0000-0000-000000000006',
  },
];

export const HomeScreen = ({ navigation }: { navigation: HomeScreenNavigationProp }) => {
  const products = useAppStore(state => state.products);
  const fetchProducts = useAppStore(state => state.fetchProducts);
  const productsLoading = useAppStore(state => state.productsLoading);
  const cartItems = useAppStore(state => state.cartItems);
  const user = useAppStore(state => state.user);
  const isOffline = useAppStore(state => state.isOffline);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroScrollRef = useRef<ScrollView>(null);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const handleHeroScroll = (event: any) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(xOffset / SCREEN_WIDTH);
    if (index !== activeHeroIndex && index >= 0 && index < HERO_MOMENTS.length) {
      setActiveHeroIndex(index);
    }
  };

  const scrollToHero = (index: number) => {
    if (index >= 0 && index < HERO_MOMENTS.length) {
      heroScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    }
  };

  useEffect(() => {
    fetchProducts();
    analytics.trackScreenView('Home');
  }, [fetchProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts(undefined, true);
    setRefreshing(false);
  }, [fetchProducts]);

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const handleSearch = () => {
    analytics.trackSearch(searchQuery);
    navigation.navigate('Shop', { query: searchQuery });
  };

  const handleSubscribe = () => {
    if (emailInput && emailInput.includes('@')) {
      setEmailSubscribed(true);
      setEmailInput('');
      setTimeout(() => setEmailSubscribed(false), 5000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.userName}>{user?.full_name || 'Guest User'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Cart')}
          >
            <ShoppingBag size={20} color={tokens.colors.ink} />
            {cartItems.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Bell size={20} color={tokens.colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={14} color="#F59E0B" />
          <Text style={styles.offlineBannerText}>Offline — showing cached results</Text>
        </View>
      )}

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.colors.accent}
            colors={[tokens.colors.accent]}
          />
        }
      >
        {/* Sticky Search bar */}
        <View style={styles.searchContainer}>
          <GlassCard variant="float-card" style={styles.searchBar}>
            <Search size={18} color={tokens.colors.muted} style={styles.searchIcon} />
            <TextInput
              placeholder="Search products, ingredients..."
              placeholderTextColor={tokens.colors.muted}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleSearch} style={styles.searchGoBtn}>
                <Text style={styles.searchGoBtnText}>Go</Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        </View>

        {/* 3D Hero Section */}
        <View style={styles.heroSection}>
          <ScrollView 
            ref={heroScrollRef}
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            snapToInterval={SCREEN_WIDTH}
            decelerationRate="fast"
            disableIntervalMomentum={true}
            onScroll={handleHeroScroll}
            scrollEventThrottle={16}
          >
            {HERO_MOMENTS.map((hero) => (
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
                      onPress={() => navigation.navigate('Shop')}
                      style={{ flex: 1, marginRight: 12 }}
                    />
                    <GlassButton 
                      title="View All" 
                      variant="ghost" 
                      onPress={() => navigation.navigate('Shop')}
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
              {HERO_MOMENTS.map((_, i) => (
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
              disabled={activeHeroIndex === HERO_MOMENTS.length - 1}
              style={[styles.chevronButton, { opacity: activeHeroIndex === HERO_MOMENTS.length - 1 ? 0 : 1 }]}
            >
              <ChevronRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Marquee Strip */}
        <View style={styles.marqueeSection}>
          <Marquee duration={12000}>
            <Text 
              style={styles.marqueeText}
              numberOfLines={1}
              adjustsFontSizeToFit={false}
            >  •  CRUELTY FREE  •  CLINICALLY PROVEN  •  SUSTAINABLY SOURCED  •  DERMATOLOGIST TESTED</Text>
          </Marquee>
        </View>

        {/* Promotion Banner */}
        <RevealOnScroll scrollY={scrollY} screenHeight={SCREEN_HEIGHT}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.promoContainer}
            onPress={() => navigation.navigate('Shop')}
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

        {/* Category Grid */}
        <RevealOnScroll scrollY={scrollY} screenHeight={SCREEN_HEIGHT}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.name)}
                  style={styles.categoryItemWrapper}
                >
                  <GlassCard
                    variant="float-card"
                    style={[
                      styles.categoryCard,
                      isSelected ? styles.categoryCardSelected : null
                    ]}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.categoryName,
                        isSelected ? styles.categoryNameSelected : null
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </RevealOnScroll>

        {/* Featured Products */}
        <RevealOnScroll scrollY={scrollY} screenHeight={SCREEN_HEIGHT}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Shop')}>
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
                  onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
                />
              ))
            )}
          </View>
        </RevealOnScroll>

        {/* Newsletter Signup Widget */}
        <RevealOnScroll scrollY={scrollY} screenHeight={SCREEN_HEIGHT}>
          <View style={{ marginHorizontal: 20 }}>
            <GlassCard variant="bento-item" style={styles.newsletterCard}>
              <Text style={styles.newsletterTitle}>Join the GLASSSKIN Club</Text>
              <Text style={styles.newsletterSubtitle}>
                Subscribe for exclusive offers, toxin-free skincare tips, and product releases.
              </Text>
              {emailSubscribed ? (
                <Text style={styles.subscribedText}>✨ Thank you for subscribing!</Text>
              ) : (
                <View style={styles.newsletterInputRow}>
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor={tokens.colors.muted}
                    style={styles.newsletterInput}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.newsletterSendBtn} onPress={handleSubscribe}>
                    <Send size={16} color={tokens.colors.ink} />
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>
          </View>
        </RevealOnScroll>
      </Animated.ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
  },
  welcomeText: {
    color: tokens.colors.muted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  userName: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 18,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    backgroundColor: tokens.colors.glass,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderRadius: 10,
    padding: 10,
    marginLeft: 10,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: tokens.colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Raleway_700Bold',
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for custom floating bottom tab
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6, // float-card already has 16 padding, adjust this
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: tokens.colors.ink,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    padding: 0,
    height: 40,
  },
  searchGoBtn: {
    backgroundColor: tokens.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchGoBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Raleway_700Bold',
  },

  // Hero Section Styles
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

  // Marquee
  marqueeSection: {
    marginBottom: 30,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
    paddingVertical: 12,
    backgroundColor: tokens.colors.glass,
  },
  marqueeText: {
    ...typography.eyebrow,
    color: tokens.colors.ink,
    fontSize: 12,
    letterSpacing: 2,
  },

  // Promo
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
  
  // Categories
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
  categoriesScroll: {
    paddingLeft: 20,
    paddingRight: 10,
    marginBottom: 30,
  },
  categoryItemWrapper: {
    marginRight: 10,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryCardSelected: {
    borderColor: tokens.colors.accent,
    backgroundColor: 'rgba(176, 122, 74, 0.1)',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryName: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
  },
  categoryNameSelected: {
    color: tokens.colors.accent,
  },
  
  // Products Grid
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    marginBottom: 30,
  },

  // Newsletter
  newsletterCard: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  newsletterTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 18,
  },
  newsletterSubtitle: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  newsletterInputRow: {
    flexDirection: 'row',
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: tokens.colors.glass,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    overflow: 'hidden',
  },
  newsletterInput: {
    flex: 1,
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 12,
  },
  newsletterSendBtn: {
    backgroundColor: tokens.colors.glass,
    borderLeftWidth: 1,
    borderColor: tokens.colors.line,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribedText: {
    color: tokens.colors.accent,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
});
