import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { analytics } from '../../services/analytics';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

const slides = [
  {
    id: 1,
    title: 'Clean Beauty, Reimagined',
    description: 'Welcome to GLASSSKIN. We believe in natural, toxin-free skincare that nourishes your skin and enhances your natural radiance.',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 2,
    title: 'Certified Organic & Pure',
    description: 'Our products are crafted with premium botanicals, certified organic ingredients, and are 100% cruelty-free.',
    image: 'https://images.unsplash.com/photo-1608248597481-496100c80836?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 3,
    title: 'Premium Shopping Experience',
    description: 'Discover your perfect skincare routine, save favorites to your wishlist, and enjoy secure checkout with order tracking.',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80',
  },
];

export const OnboardingScreen = ({ navigation }: any) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    analytics.trackScreenView('Onboarding');
  }, []);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigation.navigate('Login');
    }
  };

  const slide = slides[currentSlide];

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: slide.image }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={200}
        cachePolicy="disk"
      />
      {/* Dark overlay for text contrast */}
      <View style={styles.overlay} />

      <View style={{ flex: 1 }}>
        <View style={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 }
        ]}>
        <GlassCard variant="float-card" style={styles.glassCard}>
          <Text style={styles.brandTitle}>GLASSSKIN</Text>
          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={styles.slideDescription}>{slide.description}</Text>

          {/* Dots Indicator */}
          <View style={styles.indicatorContainer}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentSlide ? styles.activeDot : null,
                ]}
              />
            ))}
          </View>

          {/* Action Button */}
          <GlassButton
            title={currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
            variant="primary"
            style={styles.button}
          />
        </GlassCard>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Light tint instead of dark for light mode
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    zIndex: 10,
  },
  glassCard: {
    padding: 24,
    alignItems: 'center',
  },
  brandTitle: {
    ...typography.wordmark,
    color: tokens.colors.accent,
    fontSize: 14,
    marginBottom: 8,
  },
  slideTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDescription: {
    color: tokens.colors.inkLight,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    backgroundColor: tokens.colors.line,
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: tokens.colors.accent,
    width: 20,
  },
  button: {
    width: '100%',
  },
});
