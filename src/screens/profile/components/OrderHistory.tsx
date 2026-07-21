import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { Order } from '../../../types';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  orders: Order[];
  onBack: () => void;
  onOrderPress: (orderId: string) => void;
};

export const OrderHistory = ({ orders, onBack, onOrderPress }: Props) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Order History</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </View>
      
      {orders.length === 0 ? (
        <Text style={styles.noOrdersText}>You haven't placed any orders yet.</Text>
      ) : (
        orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            onPress={() => onOrderPress(order.id)}
            activeOpacity={0.8}
          >
            <GlassCard variant="float-card" style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>{order.id}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    order.status === 'delivered' ? styles.statusDelivered : null,
                    order.status === 'shipped' ? styles.statusShipped : null,
                  ]}
                >
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>
              <View style={styles.orderBody}>
                <Text style={styles.orderDate}>
                  Date: {new Date(order.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.orderTotal}>Total: ${order.total_amount.toFixed(2)}</Text>
              </View>
              <Text style={styles.trackLink}>Tap to track order →</Text>
            </GlassCard>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
};

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
  backLink: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  noOrdersText: {
    color: tokens.colors.muted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: 30,
  },
  orderCard: {
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 14,
  },
  statusBadge: {
    backgroundColor: tokens.colors.glass,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusDelivered: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusShipped: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  statusText: {
    color: '#F59E0B',
    fontSize: 10,
    textTransform: 'uppercase',
    fontFamily: 'Inter_500Medium',
    fontWeight: 'bold',
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  orderDate: {
    color: tokens.colors.muted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  orderTotal: {
    color: tokens.colors.ink,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  trackLink: {
    color: tokens.colors.accent,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 10,
    textAlign: 'right',
  },
});
