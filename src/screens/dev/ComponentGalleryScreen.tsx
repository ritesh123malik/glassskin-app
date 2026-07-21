import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { GlassButton } from '../../components/common/GlassButton';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassInput } from '../../components/common/GlassInput';
import { Skeleton, ProductGridSkeleton } from '../../components/common/Skeleton';
import { ProductCard } from '../../components/product/ProductCard';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { Search } from 'lucide-react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Product } from '../../types';
import { ModelViewer3D } from '../../components/common/ModelViewer3D';

const mockProduct: Product = {
  id: 'dev-1',
  name: 'Hydrating Face Cream',
  description: 'Rich moisturizing cream.',
  price: 25.99,
  category: 'Skincare',
  skin_types: ['dry'],
  certifications: ['organic'],
  images: ['https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-blank/assets/icon.png'],
  stock_quantity: 8,
  rating: 4.5,
  review_count: 128,
  created_at: '',
  updated_at: '',
};

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ComponentGallery'>;
};

export const ComponentGalleryScreen = ({ navigation }: Props) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={tokens.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Component Gallery</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>GlassButton</Text>
        <View style={styles.row}>
          <GlassButton title="Primary Button" onPress={() => {}} style={{ flex: 1, marginRight: 8 }} />
          <GlassButton title="Ghost Button" variant="ghost" onPress={() => {}} style={{ flex: 1 }} />
        </View>

        <Text style={styles.sectionTitle}>GlassInput</Text>
        <GlassInput 
          label="Search"
          placeholder="Placeholder..."
          icon={<Search size={18} color={tokens.colors.muted} />}
        />
        <GlassInput 
          label="Error State"
          placeholder="Placeholder..."
          error="This is an error message."
        />

        <Text style={styles.sectionTitle}>GlassCard</Text>
        <GlassCard variant="float-card" style={styles.cardSpacing}>
          <Text style={styles.cardText}>Float Card Variant</Text>
          <Text style={styles.cardSubText}>Used for floating UI, modals, header overlays.</Text>
        </GlassCard>

        <GlassCard variant="bento-item" style={styles.cardSpacing}>
          <Text style={styles.cardText}>Bento Item Variant</Text>
          <Text style={styles.cardSubText}>Used for larger grid feature blocks with heavy padding.</Text>
        </GlassCard>

        <Text style={styles.sectionTitle}>ProductCard</Text>
        <View style={styles.productGrid}>
          <ProductCard product={mockProduct} onPress={() => {}} />
          <ProductCard product={mockProduct} onPress={() => {}} feature />
        </View>

        <Text style={styles.sectionTitle}>Skeleton</Text>
        <GlassCard variant="float-card" style={styles.cardSpacing}>
          <Skeleton height={20} borderRadius={4} style={{ marginBottom: 12 }} />
          <Skeleton height={20} width="60%" borderRadius={4} />
        </GlassCard>

        <View style={styles.row}>
          <ProductGridSkeleton />
        </View>

        <Text style={styles.sectionTitle}>ModelViewer3D (Fallback)</Text>
        <View style={{ height: 350, width: '100%', marginBottom: 16, borderRadius: 18, overflow: 'hidden' }}>
          <ModelViewer3D 
            modelAsset={null}
            fallbackImage={mockProduct.images[0]}
          />
        </View>

        <Text style={styles.sectionTitle}>ModelViewer3D (Broken Fallback)</Text>
        <View style={{ height: 350, width: '100%', marginBottom: 16, borderRadius: 18, overflow: 'hidden' }}>
          <ModelViewer3D 
            modelAsset={null} 
            fallbackImage={mockProduct.images[0]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    ...typography.display,
    fontSize: 20,
    color: tokens.colors.ink,
  },
  scroll: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionTitle: {
    ...typography.eyebrow,
    color: tokens.colors.muted,
    marginTop: 24,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardSpacing: {
    marginBottom: 16,
  },
  cardText: {
    ...typography.display,
    fontSize: 18,
    color: tokens.colors.ink,
    marginBottom: 4,
  },
  cardSubText: {
    ...typography.italic,
    color: tokens.colors.muted,
    fontSize: 14,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  }
});
