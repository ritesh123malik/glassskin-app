import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView, Platform, Alert } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/common/GlassCard';
import { analytics } from '../../services/analytics';
import { supabase } from '../../services/supabaseClient';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { Order, Product } from '../../types';

import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../../navigation/AppNavigator';

import {
  GuestView,
  ProfileHeader,
  OrderHistory,
  AnalyticsInsights,
  AccountMenu,
  NotificationSettings,
  DataPrivacy,
  LogoutButton,
} from './components';

type Props = {
  navigation: BottomTabNavigationProp<TabParamList, 'Profile'>;
};

export const ProfileScreen = ({ navigation }: Props) => {
  const user = useAppStore(state => state.user);
  const signOut = useAppStore(state => state.signOut);
  const orders = useAppStore(state => state.orders);
  const fetchOrders = useAppStore(state => state.fetchOrders);
  const preferences = useAppStore(state => state.preferences);
  const updateUserPreferences = useAppStore(state => state.updateUserPreferences);
  const products = useAppStore(state => state.products);

  // Notification states
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [promoNotifications, setPromoNotifications] = useState(false);
  const [recoNotifications, setRecoNotifications] = useState(true);

  // Active view states
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showAnalyticsInsights, setShowAnalyticsInsights] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
    analytics.trackScreenView('Profile');
  }, [user]);

  // Sync state with server-side preferences
  useEffect(() => {
    if (preferences) {
      setOrderNotifications(preferences.order_notifications);
      setPromoNotifications(preferences.promo_notifications);
      setRecoNotifications(preferences.cart_reminders);
    }
  }, [preferences]);

  const handleToggleOrders = (val: boolean) => {
    setOrderNotifications(val);
    updateUserPreferences({ order_notifications: val });
  };

  const handleTogglePromo = (val: boolean) => {
    setPromoNotifications(val);
    updateUserPreferences({ promo_notifications: val });
  };

  const handleToggleReco = (val: boolean) => {
    setRecoNotifications(val);
    updateUserPreferences({ cart_reminders: val });
  };

  const handleLogout = () => {
    signOut().then(() => {
      navigation.navigate('Login');
    });
  };

  const handleExportData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('export-user-data');
      if (error) throw error;
      Alert.alert('Export Successful', 'Your data has been exported successfully. (In a real app, this would trigger a file download or send an email.)');
    } catch (err: any) {
      Alert.alert('Export Failed', err.message);
    }
  };

  const handleDeleteAccount = () => {
    signOut().then(() => navigation.navigate('Login'));
  };

  // Analytics & Insights Calculations
  const getAnalyticsInsights = () => {
    const completedOrders = orders.filter(o => o.status !== 'cancelled');
    const totalSpend = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalOrders = completedOrders.length;
    const averageValue = totalOrders > 0 ? totalSpend / totalOrders : 0;

    // Favorite Categories
    const categoryCounts: Record<string, number> = {};
    const categorySpend: Record<string, number> = {};
    
    completedOrders.forEach(order => {
      order.items?.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        const category = prod ? prod.category : 'Skincare';
        
        categoryCounts[category] = (categoryCounts[category] || 0) + item.quantity;
        categorySpend[category] = (categorySpend[category] || 0) + (item.price * item.quantity);
      });
    });

    let favoriteCategory = 'None';
    let maxCount = 0;
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteCategory = cat;
      }
    });

    // Spending over time (by order date)
    const spendingHistory = completedOrders
      .map(o => ({
        date: new Date(o.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        amount: o.total_amount,
        id: o.id
      }))
      .slice(0, 5)
      .reverse();

    return {
      totalSpend,
      totalOrders,
      averageValue,
      favoriteCategory,
      spendingHistory
    };
  };

  const insights = getAnalyticsInsights();

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>User Profile</Text>
        </View>
        <GuestView onLoginPress={() => navigation.navigate('Login')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ProfileHeader user={user} />

        {showOrderHistory ? (
          <OrderHistory
            orders={orders}
            onBack={() => setShowOrderHistory(false)}
            onOrderPress={(orderId) => navigation.navigate('OrderTracking', { orderId })}
          />
        ) : showAnalyticsInsights ? (
          <AnalyticsInsights
            insights={insights}
            orders={orders}
            products={products}
            onBack={() => setShowAnalyticsInsights(false)}
          />
        ) : (
          <View>
            <AccountMenu
              ordersCount={orders.length}
              onOrderHistoryPress={() => setShowOrderHistory(true)}
              onAnalyticsPress={() => setShowAnalyticsInsights(true)}
              onWishlistPress={() => navigation.navigate('Wishlist')}
              onAddressesPress={() => {}}
              onPaymentsPress={() => {}}
              onComponentGalleryPress={() => navigation.navigate('ComponentGallery')}
              showDevOption={__DEV__}
            />

            <NotificationSettings
              orderNotifications={orderNotifications}
              promoNotifications={promoNotifications}
              recoNotifications={recoNotifications}
              onToggleOrders={handleToggleOrders}
              onTogglePromo={handleTogglePromo}
              onToggleReco={handleToggleReco}
            />

            <DataPrivacy
              onExportData={handleExportData}
              onDeleteAccount={handleDeleteAccount}
              onComponentGalleryPress={() => navigation.navigate('ComponentGallery')}
              showDevOption={__DEV__}
            />

            <LogoutButton onLogout={handleLogout} />

            <Text style={styles.versionText}>GLASSSKIN App v1.0.0 (Expo Core)</Text>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderColor: tokens.colors.line,
  },
  headerTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  versionText: {
    color: tokens.colors.muted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
});
