import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Sparkles, CheckCircle2, XCircle } from 'lucide-react-native';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { supabaseClient } from '../../services/supabaseClient';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

import { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OrderConfirmation'>;
  route: RouteProp<RootStackParamList, 'OrderConfirmation'>;
};

export const OrderConfirmationScreen = ({ route, navigation }: Props) => {
  const { orderId, guestEmail, guestName } = route.params || {};
  const [orderStatus, setOrderStatus] = useState<'payment_pending' | 'processing' | 'cancelled' | 'pending' | 'shipped' | 'delivered'>('payment_pending');
  const channelRef = useRef<ReturnType<typeof supabaseClient.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch current order status
    const getInitialStatus = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('orders')
          .select('status')
          .eq('id', orderId)
          .single();
        
        if (!error && data && isMounted) {
          setOrderStatus(data.status as any);
        }
      } catch (err) {
        console.error('Error fetching order status:', err);
      }
    };
    
    getInitialStatus();

    // 2. Subscribe to real-time changes for this specific order
    const channel = supabaseClient
      .channel(`order-confirmation-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('Realtime Order status update:', payload.new.status);
          if (isMounted && payload.new) {
            setOrderStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    isSubscribedRef.current = true;

    return () => {
      isMounted = false;
      if (isSubscribedRef.current && channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
      }
    };
  }, [orderId]);

  const handleContinueShopping = () => {
    navigation.navigate('MainTabs');
  };

  const handleTrackOrder = () => {
    navigation.navigate('OrderTracking', { orderId });
  };

  // Generate a realistic delivery date (e.g. 4 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 4);
  const deliveryDateString = deliveryDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  if (orderStatus === 'payment_pending') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pendingContainer}>
          <ActivityIndicator size="large" color="#8E5D34" />
          <Text style={styles.pendingTitle}>Verifying Payment...</Text>
          <Text style={styles.pendingText}>
            We are waiting for Stripe/PayPal to finalize your payment transaction. Please keep this screen open.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (orderStatus === 'cancelled') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pendingContainer}>
          <XCircle size={64} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={styles.pendingTitle}>Payment Failed</Text>
          <Text style={styles.pendingText}>
            Your payment could not be processed. This order has been cancelled, and any reserved stock has been released.
          </Text>
          <GlassButton
            title="Return to Shop"
            onPress={handleContinueShopping}
            variant="secondary"
            style={{ width: '100%', marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!orderId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pendingContainer}>
          <XCircle size={64} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={styles.pendingTitle}>Order Details Unavailable</Text>
          <Text style={styles.pendingText}>
            We could not retrieve your order information. If you just completed a purchase, please try again or contact support.
          </Text>
          <GlassButton
            title="Continue Shopping"
            onPress={handleContinueShopping}
            variant="secondary"
            style={{ width: '100%', marginTop: 24 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Success Icon */}
          <View style={styles.successIconWrapper}>
            <CheckCircle2 size={64} color="#10B981" />
          </View>

          <Text style={styles.title}>Order Placed!</Text>
          <Text style={styles.subtitle}>
            Thank you for choosing GLASSSKIN. Your order of clean, natural cosmetics has been successfully processed.
          </Text>

          <GlassCard variant="float-card" style={styles.card}>
            <Text style={styles.orderLabel}>Order Number</Text>
            <Text style={styles.orderNumber}>{orderId}</Text>
            
            <View style={styles.divider} />

            <View style={styles.row}>
              <Sparkles size={16} color="#D9B79A" />
              <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
            </View>
            <Text style={styles.deliveryDate}>{deliveryDateString}</Text>

            <Text style={styles.infoText}>
              We will send you push notifications and email updates as your order progresses.
            </Text>
          </GlassCard>

          {guestEmail ? (
            <GlassCard variant="float-card" style={[styles.card, styles.guestPromptCard]}>
              <Text style={styles.guestPromptTitle}>Save details for next time?</Text>
              <Text style={styles.guestPromptText}>
                Create an account using your order email to track updates, save addresses, and checkout faster.
              </Text>
              <GlassButton
                title="Create Account"
                onPress={() => navigation.navigate('Signup', { email: guestEmail, fullName: guestName })}
                variant="accent"
                style={styles.guestPromptBtn}
              />
            </GlassCard>
          ) : null}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <GlassButton
          title="Track Order"
          onPress={handleTrackOrder}
          variant="primary"
          style={styles.actionBtn}
        />
        <GlassButton
          title="Continue Shopping"
          onPress={handleContinueShopping}
          variant="secondary"
          style={[styles.actionBtn, styles.continueBtn]}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    justifyContent: 'space-between',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 120,
  },
  successIconWrapper: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  title: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    color: tokens.colors.muted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  card: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  orderLabel: {
    ...typography.eyebrow,
    color: tokens.colors.muted,
  },
  orderNumber: {
    color: tokens.colors.ink,
    fontSize: 20,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.line,
    width: '100%',
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deliveryLabel: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginLeft: 6,
  },
  deliveryDate: {
    color: tokens.colors.accent,
    fontSize: 16,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
  },
  infoText: {
    color: tokens.colors.muted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
  },
  guestPromptCard: {
    marginTop: 16,
  },
  guestPromptTitle: {
    color: tokens.colors.ink,
    fontFamily: 'Raleway_700Bold',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  guestPromptText: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  guestPromptBtn: {
    height: 38,
    width: '100%',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: tokens.colors.background,
  },
  actionBtn: {
    width: '100%',
    marginBottom: 12,
  },
  continueBtn: {
    borderColor: tokens.colors.line,
  },
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  pendingTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 22,
    marginTop: 16,
    textAlign: 'center',
  },
  pendingText: {
    color: tokens.colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});
