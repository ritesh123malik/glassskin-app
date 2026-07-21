import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, ShoppingBag, CreditCard, PieChart } from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { Order, Product } from '../../../types';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Insights = {
  totalSpend: number;
  totalOrders: number;
  averageValue: number;
  favoriteCategory: string;
  spendingHistory: { date: string; amount: number; id: string }[];
};

type Props = {
  insights: Insights;
  orders: Order[];
  products: Product[];
  onBack: () => void;
};

export const AnalyticsInsights = ({ insights, orders, products, onBack }: Props) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Analytics & Insights</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Key Metrics Grid */}
      <View style={styles.insightsGrid}>
        <GlassCard variant="float-card" style={styles.insightMiniCard}>
          <TrendingUp size={16} color={tokens.colors.accent} />
          <Text style={styles.insightLabel}>Total Spend</Text>
          <Text style={styles.insightVal}>${insights.totalSpend.toFixed(2)}</Text>
        </GlassCard>
        <GlassCard variant="float-card" style={styles.insightMiniCard}>
          <ShoppingBag size={16} color={tokens.colors.accent} />
          <Text style={styles.insightLabel}>Total Orders</Text>
          <Text style={styles.insightVal}>{insights.totalOrders}</Text>
        </GlassCard>
      </View>

      <View style={styles.insightsGrid}>
        <GlassCard variant="float-card" style={styles.insightMiniCard}>
          <CreditCard size={16} color="#22C55E" />
          <Text style={styles.insightLabel}>Avg Order Value</Text>
          <Text style={styles.insightVal}>${insights.averageValue.toFixed(2)}</Text>
        </GlassCard>
        <GlassCard variant="float-card" style={styles.insightMiniCard}>
          <PieChart size={16} color="#FBBF24" />
          <Text style={styles.insightLabel}>Favorite Cat</Text>
          <Text style={styles.insightVal}>{insights.favoriteCategory}</Text>
        </GlassCard>
      </View>

      {/* Spending History Chart-like representation */}
      <Text style={styles.subSectionTitle}>Recent Spending Funnel</Text>
      <GlassCard variant="float-card" style={styles.chartCard}>
        {insights.spendingHistory.length === 0 ? (
          <Text style={styles.noHistoryText}>Complete purchases to build spending insights.</Text>
        ) : (
          insights.spendingHistory.map((h, i) => (
            <View key={h.id || i} style={styles.chartRow}>
              <Text style={styles.chartDate}>{h.date}</Text>
              <View style={styles.chartBarWrapper}>
                <View 
                  style={[
                    styles.chartBar, 
                    { width: `${Math.max(10, Math.min(100, (h.amount / (insights.totalSpend || 1)) * 100))}%` }
                  ]}
                />
              </View>
              <Text style={styles.chartAmount}>${h.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
      </GlassCard>
    </View>
  );
};

import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginBottom: 12,
    marginTop: 10,
  },
  subSectionTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 15,
    marginBottom: 10,
    marginTop: 20,
  },
  backLink: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  insightMiniCard: {
    flex: 1,
    padding: 16,
    alignItems: 'flex-start',
  },
  insightLabel: {
    color: tokens.colors.muted,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 8,
  },
  insightVal: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 18,
    marginTop: 4,
  },
  chartCard: {
    padding: 16,
  },
  noHistoryText: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: 20,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  chartDate: {
    color: tokens.colors.muted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    width: 60,
  },
  chartBarWrapper: {
    flex: 1,
    height: 10,
    backgroundColor: tokens.colors.glass,
    borderRadius: 5,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    backgroundColor: tokens.colors.accent,
    borderRadius: 5,
  },
  chartAmount: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 12,
    width: 60,
    textAlign: 'right',
  },
});
