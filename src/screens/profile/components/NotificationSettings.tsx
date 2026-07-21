import React from 'react';
import { View, Text, Switch, StyleSheet, Platform } from 'react-native';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  orderNotifications: boolean;
  promoNotifications: boolean;
  recoNotifications: boolean;
  onToggleOrders: (val: boolean) => void;
  onTogglePromo: (val: boolean) => void;
  onToggleReco: (val: boolean) => void;
};

export const NotificationSettings = ({
  orderNotifications,
  promoNotifications,
  recoNotifications,
  onToggleOrders,
  onTogglePromo,
  onToggleReco,
}: Props) => {
  return (
    <View>
      <Text style={styles.sectionTitle}>Notification Settings</Text>
      <GlassCard variant="float-card" style={styles.menuCard}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Order Status Updates</Text>
          <Switch
            value={orderNotifications}
            onValueChange={onToggleOrders}
            trackColor={{ false: tokens.colors.glass, true: tokens.colors.accent }}
            thumbColor={Platform.OS === 'android' ? tokens.colors.ink : undefined}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Promotions & Offers</Text>
          <Switch
            value={promoNotifications}
            onValueChange={onTogglePromo}
            trackColor={{ false: tokens.colors.glass, true: tokens.colors.accent }}
            thumbColor={Platform.OS === 'android' ? tokens.colors.ink : undefined}
          />
        </View>

        <View style={[styles.switchRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <Text style={styles.switchLabel}>Personalised Reminders</Text>
          <Switch
            value={recoNotifications}
            onValueChange={onToggleReco}
            trackColor={{ false: tokens.colors.glass, true: tokens.colors.accent }}
            thumbColor={Platform.OS === 'android' ? tokens.colors.ink : undefined}
          />
        </View>
      </GlassCard>
    </View>
  );
};

import { GlassCard } from '../../../components/common/GlassCard';

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginBottom: 12,
    marginTop: 10,
  },
  menuCard: {
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderColor: tokens.colors.line,
  },
  switchLabel: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
