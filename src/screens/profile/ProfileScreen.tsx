import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView, Platform, Alert } from 'react-native';
import { User, LogOut, ShoppingBag, Heart, MapPin, CreditCard, ChevronRight, BarChart3, TrendingUp, PieChart, Download, UserX, LayoutTemplate } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/common/GlassCard';
import { analytics } from '../../services/analytics';
import { supabase } from '../../services/supabaseClient';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

export const ProfileScreen = ({ navigation }: any) => {
  const user = useAppStore(state => state.user);
  const signOut = useAppStore(state => state.signOut);
  const orders = useAppStore(state => state.orders);
  const fetchOrders = useAppStore(state => state.fetchOrders);
  const preferences = useAppStore(state => state.preferences);
  const updateUserPreferences = useAppStore(state => state.updateUserPreferences);

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
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('delete-user-data');
              if (error) throw error;
              Alert.alert('Account Deleted', 'Your account and personal data have been deleted.');
              signOut().then(() => navigation.navigate('Login'));
            } catch (err: any) {
              Alert.alert('Deletion Failed', err.message);
            }
          }
        }
      ]
    );
  };

  // Analytics & Insights Calculations (Priority 3 feature backed by real order data)
  const getAnalyticsInsights = () => {
    const completedOrders = orders.filter(o => o.status !== 'cancelled');
    const totalSpend = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalOrders = completedOrders.length;
    const averageValue = totalOrders > 0 ? totalSpend / totalOrders : 0;

    // Favorite Categories
    const categoryCounts: Record<string, number> = {};
    const categorySpend: Record<string, number> = {};
    
    // State products lookup
    const productsList = useAppStore.getState().products;

    completedOrders.forEach(order => {
      order.items?.forEach(item => {
        const prod = productsList.find(p => p.id === item.product_id);
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
      .slice(0, 5) // Last 5 orders
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
        <View style={styles.guestContainer}>
          <GlassCard variant="float-card" style={styles.guestCard}>
            <View style={styles.avatarWrapper}>
              <User size={36} color={tokens.colors.muted} />
            </View>
            <Text style={styles.guestTitle}>Create a Profile</Text>
            <Text style={styles.guestSubtitle}>
              Sign in or create an account to view your order history, manage shipping addresses, and save default payment methods.
            </Text>
            <TouchableOpacity 
              style={styles.guestBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.guestBtnText}>Log In / Sign Up</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
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
        {/* User Details Header Card */}
        <GlassCard variant="float-card" style={styles.profileHeaderCard}>
          <View style={styles.avatarWrapper}>
            <User size={36} color={tokens.colors.accent} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.full_name || 'Guest User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'guest@glassskin.com'}</Text>
          </View>
        </GlassCard>

        {/* Dynamic Section: Order History list */}
        {showOrderHistory ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Order History</Text>
              <TouchableOpacity onPress={() => setShowOrderHistory(false)}>
                <Text style={styles.backLink}>← Back</Text>
              </TouchableOpacity>
            </View>
            
            {orders.length === 0 ? (
              <Text style={styles.noOrdersText}>You haven't placed any orders yet.</Text>
            ) : (
              orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
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
        ) : showAnalyticsInsights ? (
          // Analytics & Insights Dashboard view
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Analytics & Insights</Text>
              <TouchableOpacity onPress={() => setShowAnalyticsInsights(false)}>
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
        ) : (
          <View>
            {/* Navigation Menu */}
            <Text style={styles.sectionTitle}>Account Menu</Text>
            <GlassCard variant="float-card" style={styles.menuCard}>
              {/* Orders */}
              <TouchableOpacity style={styles.menuItem} onPress={() => setShowOrderHistory(true)}>
                <View style={styles.menuItemLeft}>
                  <ShoppingBag size={18} color={tokens.colors.accent} />
                  <Text style={styles.menuItemText}>Order History ({orders.length})</Text>
                </View>
                <ChevronRight size={16} color={tokens.colors.muted} />
              </TouchableOpacity>

              {/* Analytics & Insights (Priority 3 stats entry point) */}
              <TouchableOpacity style={styles.menuItem} onPress={() => setShowAnalyticsInsights(true)}>
                <View style={styles.menuItemLeft}>
                  <BarChart3 size={18} color={tokens.colors.accent} />
                  <Text style={styles.menuItemText}>Analytics & Insights</Text>
                </View>
                <ChevronRight size={16} color={tokens.colors.muted} />
              </TouchableOpacity>

              {/* Wishlist */}
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Wishlist')}>
                <View style={styles.menuItemLeft}>
                  <Heart size={18} color="#D9B79A" />
                  <Text style={styles.menuItemText}>My Wishlist</Text>
                </View>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>

              {/* Addresses */}
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <MapPin size={18} color={tokens.colors.accent} />
                  <Text style={styles.menuItemText}>Saved Addresses</Text>
                </View>
                <ChevronRight size={16} color={tokens.colors.muted} />
              </TouchableOpacity>

              {/* Payments */}
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <CreditCard size={18} color={tokens.colors.accent} />
                  <Text style={styles.menuItemText}>Payment Methods</Text>
                </View>
                <ChevronRight size={16} color={tokens.colors.muted} />
              </TouchableOpacity>
            </GlassCard>

            {/* Notification preferences */}
            <Text style={styles.sectionTitle}>Notification Settings</Text>
            <GlassCard variant="float-card" style={styles.menuCard}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Order Status Updates</Text>
                <Switch
                  value={orderNotifications}
                  onValueChange={handleToggleOrders}
                  trackColor={{ false: tokens.colors.glass, true: tokens.colors.accent }}
                  thumbColor={Platform.OS === 'android' ? tokens.colors.ink : undefined}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Promotions & Offers</Text>
                <Switch
                  value={promoNotifications}
                  onValueChange={handleTogglePromo}
                  trackColor={{ false: tokens.colors.glass, true: tokens.colors.accent }}
                  thumbColor={Platform.OS === 'android' ? tokens.colors.ink : undefined}
                />
              </View>

              <View style={[styles.switchRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={styles.switchLabel}>Personalised Reminders</Text>
                <Switch
                  value={recoNotifications}
                  onValueChange={handleToggleReco}
                  trackColor={{ false: tokens.colors.glass, true: tokens.colors.accent }}
                  thumbColor={Platform.OS === 'android' ? tokens.colors.ink : undefined}
                />
              </View>
            </GlassCard>

            {/* Data & Privacy */}
            <Text style={styles.sectionTitle}>Data & Privacy</Text>
            <GlassCard variant="float-card" style={styles.menuCard}>
              <TouchableOpacity style={styles.menuItem} onPress={handleExportData}>
                <View style={styles.menuItemLeft}>
                  <Download size={18} color={tokens.colors.accent} />
                  <Text style={styles.menuItemText}>Export My Data</Text>
                </View>
                <ChevronRight size={16} color={tokens.colors.muted} />
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.menuItem, !__DEV__ && { borderBottomWidth: 0 }]} onPress={handleDeleteAccount}>
                <View style={styles.menuItemLeft}>
                  <UserX size={18} color="#EF4444" />
                  <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete Account</Text>
                </View>
                <ChevronRight size={16} color={tokens.colors.muted} />
              </TouchableOpacity>
              
              {__DEV__ && (
                <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('ComponentGallery')}>
                  <View style={styles.menuItemLeft}>
                    <LayoutTemplate size={18} color={tokens.colors.accent} />
                    <Text style={styles.menuItemText}>Component Gallery (Dev)</Text>
                  </View>
                  <ChevronRight size={16} color={tokens.colors.muted} />
                </TouchableOpacity>
              )}
            </GlassCard>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            {/* App version info */}
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
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: tokens.colors.glass,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 16,
  },
  userName: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 18,
  },
  userEmail: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
    height: 48,
    marginTop: 20,
    marginBottom: 24,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontFamily: 'Raleway_700Bold',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  versionText: {
    color: tokens.colors.muted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: tokens.colors.background,
  },
  guestCard: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  guestTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  guestSubtitle: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  guestBtn: {
    backgroundColor: tokens.colors.accent,
    borderRadius: 12,
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestBtnText: {
    color: tokens.colors.background,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    fontWeight: 'bold',
  },

  // Insights Dashboard Styles
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

export default ProfileScreen;
export { ProfileScreen as Profile };
