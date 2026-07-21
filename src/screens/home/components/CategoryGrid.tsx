import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { RevealOnScroll } from '../../../components/common/RevealOnScroll';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Category = {
  id: string;
  name: string;
  icon: string;
};

type Props = {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  scrollY: any;
  screenHeight: number;
};

export const CategoryGrid = ({ categories, selectedCategory, onSelectCategory, scrollY, screenHeight }: Props) => {
  return (
    <RevealOnScroll scrollY={scrollY} screenHeight={screenHeight}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(cat.name)}
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
});
