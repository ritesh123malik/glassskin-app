import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, Alert, RefreshControl } from 'react-native';
import { ArrowLeft, Clock, MessageSquare, Truck, Package, Check } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/common/GlassCard';
import { analytics } from '../../services/analytics';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

type TrackingStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

const STATUS_STEPS = [
  { id: 'pending', label: 'Order Placed', desc: 'We have received your order request.', icon: Package },
  { id: 'processing', label: 'Processing', desc: 'Preparing and packing your skincare goodies.', icon: Clock },
  { id: 'shipped', label: 'Shipped', desc: 'Your parcel is on its way via DHL Express.', icon: Truck },
  { id: 'delivered', label: 'Delivered', desc: 'Handed over at your shipping location.', icon: Check },
];

import { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OrderTracking'>;
  route: RouteProp<RootStackParamList, 'OrderTracking'>;
};

export const OrderTrackingScreen = ({ route, navigation }: Props) => {
  const { orderId } = route.params;
  const currentOrder = useAppStore(state => state.currentOrder);
  const fetchOrderById = useAppStore(state => state.fetchOrderById);
  const [activeStatus, setActiveStatus] = useState<TrackingStatus>('pending');

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrderById(orderId);
    setRefreshing(false);
  }, [orderId, fetchOrderById]);

  useEffect(() => {
    fetchOrderById(orderId);
    analytics.trackScreenView('OrderTracking');
  }, [orderId, fetchOrderById]);

  // Simulate updating status when clicking refresh for testing
  // DEV-ONLY: gated behind __DEV__ so it is stripped from production builds
  const simulateStatusUpdate = () => {
    if (!__DEV__) return;
    const statuses: TrackingStatus[] = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIndex = statuses.indexOf(activeStatus);
    if (currentIndex < statuses.length - 1) {
      const nextStatus = statuses[currentIndex + 1];
      setActiveStatus(nextStatus);
      if (currentOrder) {
        currentOrder.status = nextStatus as any; // update local ref
      }
    } else {
      Alert.alert('Delivered', 'Your order is already delivered!');
    }
  };

  useEffect(() => {
    if (currentOrder) {
      setActiveStatus(currentOrder.status as any);
    }
  }, [currentOrder]);

  const handleContactSupport = () => {
    Alert.alert('Support Chat', 'Connecting you to GLASSSKIN Care representative...');
  };

  const getStepIndex = (status: TrackingStatus) => {
    const statuses = ['pending', 'processing', 'shipped', 'delivered'];
    return statuses.indexOf(status);
  };

  const currentStepIndex = getStepIndex(activeStatus);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('MainTabs')}>
          <ArrowLeft size={20} color={tokens.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        {__DEV__ && (
          <TouchableOpacity style={styles.headerBtn} onPress={simulateStatusUpdate}>
            <Text style={styles.refreshText}>Advance</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8E5D34"
            colors={['#8E5D34']}
          />
        }
      >
        {currentOrder && (
          <GlassCard variant="float-card" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Order Number</Text>
                <Text style={styles.summaryValue}>{currentOrder.id}</Text>
              </View>
              <View style={styles.carrierBadge}>
                <Text style={styles.carrierText}>DHL Express</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Tracking ID</Text>
                <Text style={styles.summaryValue}>DHL-{Math.floor(100000000 + Math.random() * 900000000)}</Text>
              </View>
              <View>
                <Text style={[styles.summaryLabel, { textAlign: 'right' }]}>Est. Delivery</Text>
                <Text style={styles.summaryValue}>3 Business Days</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Visual Vertical Timeline */}
        <Text style={styles.sectionTitle}>Delivery Progress</Text>
        <GlassCard variant="float-card" style={styles.timelineCard}>
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isActive = index === currentStepIndex;
            const StepIcon = step.icon;

            return (
              <View key={step.id} style={styles.timelineStep}>
                {/* Left Line & Indicator */}
                <View style={styles.indicatorCol}>
                  <View
                    style={[
                      styles.indicatorCircle,
                      isCompleted ? styles.circleCompleted : null,
                      isActive ? styles.circleActive : null,
                    ]}
                  >
                    <StepIcon size={12} color={isCompleted ? tokens.colors.ink : tokens.colors.muted} />
                  </View>
                  {index < STATUS_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.indicatorLine,
                        index < currentStepIndex ? styles.lineCompleted : null,
                      ]}
                    />
                  )}
                </View>

                {/* Right Details */}
                <View style={styles.detailsCol}>
                  <Text
                    style={[
                      styles.stepLabel,
                      isCompleted ? styles.stepLabelCompleted : null,
                      isActive ? styles.stepLabelActive : null,
                    ]}
                  >
                    {step.label}
                  </Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                  {isActive && (
                    <Text style={styles.statusTime}>Updated just now</Text>
                  )}
                </View>
              </View>
            );
          })}
        </GlassCard>

        {/* Contact Support Widget */}
        <GlassCard variant="float-card" style={styles.supportCard}>
          <View style={styles.supportRow}>
            <MessageSquare size={24} color={tokens.colors.accent} />
            <View style={styles.supportInfo}>
              <Text style={styles.supportTitle}>Need Help?</Text>
              <Text style={styles.supportSubtitle}>
                Chat with our clean skin specialists for delivery concerns.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.supportBtn} onPress={handleContactSupport}>
            <Text style={styles.supportBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </GlassCard>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderColor: tokens.colors.line,
  },
  headerTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
  },
  headerBtn: {
    paddingVertical: 4,
    width: 60,
  },
  refreshText: {
    ...typography.display,
    color: tokens.colors.accent,
    fontSize: 12,
    textAlign: 'right',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: tokens.colors.muted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  summaryValue: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 14,
    marginTop: 2,
  },
  carrierBadge: {
    backgroundColor: tokens.colors.glass,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  carrierText: {
    color: tokens.colors.accent,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  divider: {
    height: 0.5,
    backgroundColor: tokens.colors.line,
    marginVertical: 14,
  },
  sectionTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginBottom: 14,
  },
  timelineCard: {
    padding: 20,
    marginBottom: 24,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 70,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 24,
  },
  indicatorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  circleCompleted: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  circleActive: {
    backgroundColor: tokens.colors.background,
    borderColor: tokens.colors.accent,
  },
  indicatorLine: {
    width: 2,
    flex: 1,
    backgroundColor: tokens.colors.line,
    marginVertical: 4,
    zIndex: 1,
  },
  lineCompleted: {
    backgroundColor: tokens.colors.accent,
  },
  detailsCol: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 20,
  },
  stepLabel: {
    color: tokens.colors.muted,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
  },
  stepLabelCompleted: {
    color: tokens.colors.ink,
  },
  stepLabelActive: {
    color: tokens.colors.accent,
    fontWeight: 'bold',
  },
  stepDesc: {
    color: tokens.colors.muted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  statusTime: {
    color: tokens.colors.accent,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 6,
  },
  supportCard: {
    padding: 16,
    alignItems: 'center',
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportInfo: {
    flex: 1,
    marginLeft: 12,
  },
  supportTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 14,
  },
  supportSubtitle: {
    color: tokens.colors.muted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  supportBtn: {
    backgroundColor: tokens.colors.glass,
    borderColor: tokens.colors.line,
    borderWidth: 1,
    borderRadius: 10,
    width: '100%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  supportBtnText: {
    color: tokens.colors.ink,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
