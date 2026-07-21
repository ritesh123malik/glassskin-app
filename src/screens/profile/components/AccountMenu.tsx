import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  ShoppingBag, BarChart3, Heart, MapPin, CreditCard, ChevronRight, LayoutTemplate
} from 'lucide-react-native';
import { GlassCard } from '../../../components/common/GlassCard';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  ordersCount: number;
  onOrderHistoryPress: () => void;
  onAnalyticsPress: () => void;
  onWishlistPress: () => void;
  onAddressesPress: () => void;
  onPaymentsPress: () => void;
  onComponentGalleryPress?: () => void;
  showDevOption?: boolean;
};

export const AccountMenu = ({
  ordersCount,
  onOrderHistoryPress,
  onAnalyticsPress,
  onWishlistPress,
  onAddressesPress,
  onPaymentsPress,
  onComponentGalleryPress,
  showDevOption = false,
}: Props) => {
  return (
    <View>
      <Text style={styles.sectionTitle}>Account Menu</Text>
      <GlassCard variant="float-card" style={styles.menuCard}>
        {/* Orders */}
        <TouchableOpacity style={styles.menuItem} onPress={onOrderHistoryPress}>
          <View style={styles.menuItemLeft}>
            <ShoppingBag size={18} color={tokens.colors.accent} />
            <Text style={styles.menuItemText}>Order History ({ordersCount})</Text>
          </View>
          <ChevronRight size={16} color={tokens.colors.muted} />
        </TouchableOpacity>

        {/* Analytics & Insights */}
        <TouchableOpacity style={styles.menuItem} onPress={onAnalyticsPress}>
          <View style={styles.menuItemLeft}>
            <BarChart3 size={18} color={tokens.colors.accent} />
            <Text style={styles.menuItemText}>Analytics & Insights</Text>
          </View>
          <ChevronRight size={16} color={tokens.colors.muted} />
        </TouchableOpacity>

        {/* Wishlist */}
        <TouchableOpacity style={styles.menuItem} onPress={onWishlistPress}>
          <View style={styles.menuItemLeft}>
            <Heart size={18} color="#D9B79A" />
            <Text style={styles.menuItemText}>My Wishlist</Text>
          </View>
          <ChevronRight size={16} color="#94A3B8" />
        </TouchableOpacity>

        {/* Addresses */}
        <TouchableOpacity style={styles.menuItem} onPress={onAddressesPress}>
          <View style={styles.menuItemLeft}>
            <MapPin size={18} color={tokens.colors.accent} />
            <Text style={styles.menuItemText}>Saved Addresses</Text>
          </View>
          <ChevronRight size={16} color={tokens.colors.muted} />
        </TouchableOpacity>

        {/* Payments */}
        <TouchableOpacity style={styles.menuItem} onPress={onPaymentsPress}>
          <View style={styles.menuItemLeft}>
            <CreditCard size={18} color={tokens.colors.accent} />
            <Text style={styles.menuItemText}>Payment Methods</Text>
          </View>
          <ChevronRight size={16} color={tokens.colors.muted} />
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
};

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
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderColor: tokens.colors.line,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    color: tokens.colors.ink,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginLeft: 12,
  },
});
