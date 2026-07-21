import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { ArrowLeft, Rotate3d, Sparkles, Check } from 'lucide-react-native';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { ModelViewer3D } from '../../components/common/ModelViewer3D';
import { useAppStore } from '../../store/useAppStore';

// Lazy-load GLB assets to prevent Metro from crashing during web bundling
const getGlbAssets = () => {
  try {
    return {
      faceSerum: require('../../../assets/models/face_serum_bottle.glb'),
      riceWater: require('../../../assets/models/rice_water_gel.glb'),
      faceWash: require('../../../assets/models/face_wash_tube.glb'),
    };
  } catch (err) {
    console.warn('[Showroom3DScreen] Missing 3D models. Did you run the generation script?', err);
    return { faceSerum: null, riceWater: null, faceWash: null };
  }
};
const { faceSerum, riceWater, faceWash } = getGlbAssets();

const MODELS_DATA = [
  {
    id: 'm1',
    name: 'Face Serum Bottle',
    description: 'Precision dropper bottle crafted for concentrated facial serums — delivering targeted, measured dosages of our Glass Skin Hydrating Serum.',
    asset: faceSerum,
    productId: '00000000-0000-0000-0000-000000000001',
    features: ['Precision Dropper', 'Borosilicate Glass', 'Double Seal'],
  },
  {
    id: 'm2',
    name: 'Rice Water Gel Jar',
    description: 'Airtight cosmetic jar preserving the delicate rice water gel formula — keeps ingredients potent and fresh from first use to last.',
    asset: riceWater,
    productId: '00000000-0000-0000-0000-000000000002',
    features: ['Airtight Seal', '100% Recyclable', 'Premium Glass'],
  },
  {
    id: 'm3',
    name: 'Face Wash Tube',
    description: 'Eco-friendly soft-touch tube perfectly sized for our Soothing Centella Gel Cleanser — travel-ready with a clean, hygienic flip-top cap.',
    asset: faceWash,
    productId: '00000000-0000-0000-0000-000000000006',
    features: ['Flip-Top Cap', 'Travel Friendly', 'Soft-Touch Finish'],
  },
];

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Showroom3D'>;
};

export const Showroom3DScreen = ({ navigation }: Props) => {
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const { addToCart, products } = useAppStore();

  const activeModel = MODELS_DATA[activeModelIndex];

  const handleAddToCart = () => {
    addToCart(activeModel.productId, 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#8E5D34" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>3D Showroom</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Help Banner */}
        <View style={styles.helpBanner}>
          <Rotate3d size={16} color="#D9B79A" />
          <Text style={styles.helpText}>Drag to rotate 360° • Pinch to zoom</Text>
        </View>

        {/* 3D Model Display Card */}
        <GlassCard intensity="high" style={styles.viewerCard}>
          <View style={styles.viewerContainer}>
            {(() => {
              const product = products.find(p => p.id === activeModel.productId);
              return (
                <ModelViewer3D 
                  modelAsset={activeModel.asset} 
                  fallbackImage={product?.images[0]}
                  testID={`model-viewer-${activeModel.id}`}
                />
              );
            })()}
          </View>
        </GlassCard>

        {/* Model Selector Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.selectorScroll}
        >
          {MODELS_DATA.map((model, index) => {
            const isActive = activeModelIndex === index;
            return (
              <TouchableOpacity
                key={model.id}
                onPress={() => setActiveModelIndex(index)}
                style={styles.tabWrapper}
              >
                <GlassCard
                  intensity={isActive ? 'high' : 'low'}
                  style={[
                    styles.tabCard,
                    isActive ? styles.tabCardSelected : null
                  ]}
                >
                  <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
                    {model.name.split(' ')[0]} {model.name.split(' ')[1] || ''}
                  </Text>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Product Details Info */}
        <GlassCard intensity="medium" style={styles.detailsCard}>
          <View style={styles.titleRow}>
            <Text style={styles.detailsTitle}>{activeModel.name}</Text>
            <View style={styles.arBadge}>
              <Sparkles size={10} color="#D9B79A" />
              <Text style={styles.arBadgeText}>AR Ready</Text>
            </View>
          </View>

          <Text style={styles.detailsDesc}>{activeModel.description}</Text>

          <Text style={styles.featureHeader}>Design Features</Text>
          {activeModel.features.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.checkIcon}>
                <Check size={12} color="#10B981" />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}

          <GlassButton
            title="Purchase Product"
            onPress={handleAddToCart}
            variant="primary"
            style={styles.buyBtn}
          />
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F2EE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: '#0B0B0C',
    fontSize: 16,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
  },
  headerBtn: {
    paddingVertical: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  helpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingVertical: 6,
    marginBottom: 16,
  },
  helpText: {
    color: '#D9B79A',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginLeft: 6,
  },
  viewerCard: {
    borderRadius: 20,
    padding: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  viewerContainer: {
    height: 350,
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  selectorScroll: {
    paddingBottom: 20,
  },
  tabWrapper: {
    marginRight: 10,
  },
  tabCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabCardSelected: {
    borderColor: '#8E5D34',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  tabText: {
    color: '#6B6660',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#8E5D34',
  },
  detailsCard: {
    padding: 20,
    borderRadius: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsTitle: {
    color: '#0B0B0C',
    fontSize: 18,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  arBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  arBadgeText: {
    color: '#D9B79A',
    fontSize: 10,
    fontFamily: 'Raleway_700Bold',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  detailsDesc: {
    color: 'rgba(248, 250, 252, 0.8)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 20,
  },
  featureHeader: {
    color: '#0B0B0C',
    fontSize: 14,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  featureText: {
    color: '#6B6660',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  buyBtn: {
    marginTop: 20,
    width: '100%',
  },
});
