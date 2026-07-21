import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Platform, RefreshControl, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/common/GlassCard';
import { analytics } from '../../services/analytics';
import { supabaseClient } from '../../services/supabaseClient';
import { tokens } from '../../theme/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

import {
  HomeHeader,
  SearchBar,
  HeroCarousel,
  ModelShowcase,
  MarqueeStrip,
  PromoBanner,
  CategoryGrid,
  FeaturedProducts,
  NewsletterSignup,
} from './components';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { id: '1', name: 'All', icon: '✨' },
  { id: '2', name: 'Skincare', icon: '🧴' },
  { id: '3', name: 'Body Care', icon: '🧼' },
  { id: '4', name: 'Hair Care', icon: '🌿' }
];

const getGlbAssets = () => {
  try {
    return {
      faceSerum: require('../../../assets/models/face_serum_bottle.glb'),
      riceWater: require('../../../assets/models/rice_water_gel.glb'),
      faceWash: require('../../../assets/models/face_wash_tube.glb'),
      skincareProduct5: require('../../../assets/models/skincare_product_5.glb'),
    };
  } catch {
    return {
      faceSerum: null,
      riceWater: null,
      faceWash: null,
      skincareProduct5: null,
    };
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

const MODELS_SHOWCASE = [
  { id: 'ms1', name: 'Face Serum', asset: assets.faceSerum },
  { id: 'ms2', name: 'Rice Water Gel', asset: assets.riceWater },
  { id: 'ms3', name: 'Face Wash', asset: assets.faceWash },
  { id: 'ms4', name: 'Skincare Product 5', asset: assets.skincareProduct5 },
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
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
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

  const handleSubscribe = async () => {
    setNewsletterError(null);

    const email = emailInput.trim();
    if (!email) {
      setNewsletterError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setNewsletterError('Please enter a valid email address.');
      return;
    }

    if (isOffline) {
      setNewsletterError('You appear to be offline. Please check your connection and try again.');
      return;
    }

    setNewsletterLoading(true);

    try {
      const { error } = await supabaseClient
        .from('newsletter_subscribers')
        .insert({ email, source: 'homepage' });

      if (error) {
        if (error.code === '23505') {
          setNewsletterError('This email is already subscribed to our newsletter.');
        } else {
          setNewsletterError('Something went wrong. Please try again later.');
        }
        console.error('Newsletter subscription error:', error);
        return;
      }

      setEmailSubscribed(true);
      setEmailInput('');
      analytics.trackEvent('newsletter_subscribed', { email });
    } catch (err) {
      setNewsletterError('Something went wrong. Please try again later.');
      console.error('Newsletter subscription error:', err);
    } finally {
      setNewsletterLoading(false);
      setTimeout(() => {
        setEmailSubscribed(false);
        setNewsletterError(null);
      }, 5000);
    }
  };

  const cartItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <SafeAreaView style={styles.container}>
      <HomeHeader
        userName={user?.full_name || 'Guest User'}
        cartItemsCount={cartItemsCount}
        onCartPress={() => navigation.navigate('Cart')}
      />

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
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
        />

        <HeroCarousel
          heroes={HERO_MOMENTS}
          products={products}
          activeHeroIndex={activeHeroIndex}
          onHeroScroll={handleHeroScroll}
          scrollToHero={scrollToHero}
          onShopPress={() => navigation.navigate('Shop')}
          onProductPress={(id) => navigation.navigate('ProductDetails', { productId: id })}
        />

        <ModelShowcase models={MODELS_SHOWCASE} />

        <MarqueeStrip />

        <PromoBanner
          scrollY={scrollY}
          screenHeight={SCREEN_HEIGHT}
          onPress={() => navigation.navigate('Shop')}
        />

        <CategoryGrid
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          scrollY={scrollY}
          screenHeight={SCREEN_HEIGHT}
        />

        <FeaturedProducts
          products={products}
          filteredProducts={filteredProducts}
          productsLoading={productsLoading}
          scrollY={scrollY}
          screenHeight={SCREEN_HEIGHT}
          onProductPress={(id) => navigation.navigate('ProductDetails', { productId: id })}
          onSeeAllPress={() => navigation.navigate('Shop')}
        />

        <NewsletterSignup
          emailInput={emailInput}
          emailSubscribed={emailSubscribed}
          newsletterLoading={newsletterLoading}
          newsletterError={newsletterError}
          scrollY={scrollY}
          screenHeight={SCREEN_HEIGHT}
          onEmailChange={setEmailInput}
          onSubscribe={handleSubscribe}
        />
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
  scrollContent: {
    paddingBottom: 120, // Extra space for custom floating bottom tab
  },
});
