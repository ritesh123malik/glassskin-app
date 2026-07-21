import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { ModelViewer3D } from '../../../components/common/ModelViewer3D';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type ModelShowcaseItem = {
  id: string;
  name: string;
  asset: any;
};

type Props = {
  models: ModelShowcaseItem[];
};

export const ModelShowcase = ({ models }: Props) => {
  return (
    <View style={styles.showcaseSection}>
      <Text style={styles.showcaseTitle}>Award Winning Collection</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.showcaseScroll}
      >
        {models.map((model) => (
          <View key={model.id} style={styles.showcaseCard}>
            <GlassCard variant="float-card" style={styles.showcaseCardInner}>
              <View style={styles.showcaseModelContainer}>
                <ModelViewer3D
                  modelAsset={model.asset}
                  testID={`showcase-model-${model.id}`}
                />
              </View>
              <Text style={styles.showcaseModelName}>{model.name}</Text>
            </GlassCard>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  showcaseSection: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  showcaseTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 18,
    marginBottom: 16,
  },
  showcaseScroll: {
    paddingRight: 20,
  },
  showcaseCard: {
    width: 160,
    marginRight: 16,
  },
  showcaseCardInner: {
    padding: 8,
    alignItems: 'center',
  },
  showcaseModelContainer: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    marginBottom: 10,
  },
  showcaseModelName: {
    color: tokens.colors.ink,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
});
