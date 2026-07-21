import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert, Platform } from 'react-native';
import { useStripe } from '../../utils/stripe';
import { useAppStore } from '../../store/useAppStore';
import { GlassButton } from '../../components/common/GlassButton';
import { ShippingAddress } from '../../types';
import { SecureStoreAdapter, supabaseClient } from '../../services/supabaseClient';
import { analytics } from '../../services/analytics';
import { tokens } from '../../theme/tokens';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

import { CheckoutHeader, ProgressTracker, ShippingStep, PaymentStep, ReviewStep, PayPalModal, ProcessingOverlay } from './components';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Checkout'>;
};

export const CheckoutScreen = ({ navigation }: Props) => {
  const cartItems = useAppStore(state => state.cartItems);
  const getCartTotals = useAppStore(state => state.getCartTotals);
  const createOrder = useAppStore(state => state.createOrder);
  const ordersLoading = useAppStore(state => state.ordersLoading);
  const user = useAppStore(state => state.user);
  const appliedPromo = useAppStore(state => state.appliedPromo);
  const fetchStripePaymentSheetParams = useAppStore(state => state.fetchStripePaymentSheetParams);
  const createPayPalCheckoutOrder = useAppStore(state => state.createPayPalCheckoutOrder);
  const capturePayPalCheckoutOrder = useAppStore(state => state.capturePayPalCheckoutOrder);
  const clearCartLocally = useAppStore(state => state.clearCartLocally);
  
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Review
  const [guestEmail, setGuestEmail] = useState('');
  
  // PayPal Checkout WebView states
  const [paypalUrl, setPaypalUrl] = useState<string | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isPayPalProcessing, setIsPayPalProcessing] = useState(false);

  // Shipping State
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');

  // Server-computed totals state
  const [serverTotals, setServerTotals] = useState<{
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    taxRate: number;
  } | null>(null);
  const [isLoadingTotals, setIsLoadingTotals] = useState(false);

  // 1. Load partial checkout progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const saved = await SecureStoreAdapter.getItem('checkout_progress');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.step) setStep(data.step);
          if (data.shippingAddress) setShippingAddress(data.shippingAddress);
          if (data.guestEmail) setGuestEmail(data.guestEmail);
          if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
        }
      } catch (err) {
        console.error('Failed to load checkout progress:', err);
      }
    };
    loadProgress();
    analytics.trackScreenView('Checkout');
  }, []);

  // Helper to save checkout state
  const saveProgress = async (nextStep: number) => {
    try {
      await SecureStoreAdapter.setItem('checkout_progress', JSON.stringify({
        step: nextStep,
        shippingAddress,
        guestEmail,
        paymentMethod
      }));
    } catch (err) {
      console.error('Failed to save checkout progress:', err);
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!user) {
        if (!guestEmail) {
          Alert.alert('Error', 'Please enter your email address.');
          return;
        }
        if (!/\S+@\S+\.\S+/.test(guestEmail)) {
          Alert.alert('Error', 'Please enter a valid email address.');
          return;
        }
      }
      if (!shippingAddress.fullName || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
        Alert.alert('Error', 'Please fill out all shipping details (including state).');
        return;
      }
      const next = 2;
      analytics.trackCheckoutStep(1, 'Shipping Address Completed');
      setStep(next);
      await saveProgress(next);
    } else if (step === 2) {
      const next = 3;
      analytics.trackCheckoutStep(2, 'Payment Method Completed');
      setStep(next);
      await saveProgress(next);
    }
  };

  const handlePrevStep = async () => {
    if (step > 1) {
      const prev = step - 1;
      setStep(prev);
      await saveProgress(prev);
    } else {
      navigation.goBack();
    }
  };

  const handlePlaceOrder = async () => {
    const finalAddress = {
      ...shippingAddress,
      email: user ? user.email : guestEmail
    };

    // Calculate totals matching the state-based region calculators
    const calculatedTotals = displayTotals;

    analytics.trackCheckoutStep(3, 'Order Review Completed');

    // Create the order in "payment_pending" status, reserving stock
    const order = await createOrder(
      {
        ...finalAddress,
        state: shippingAddress.state // Explicitly pass state
      },
      paymentMethod === 'card' ? 'Credit Card' : 'PayPal',
      appliedPromo?.code
    );

    if (!order) {
      Alert.alert('Checkout Failed', 'Something went wrong processing your order. Please try again.');
      return;
    }

    // 1. Stripe PaymentSheet Flow
    if (paymentMethod === 'card') {
      const params = await fetchStripePaymentSheetParams(order.id);
      if (!params) {
        Alert.alert('Payment Error', 'Failed to initialize Stripe Payment. Please try again.');
        return;
      }

      // Handle server-side errors (e.g. stock shortages returned as 409 status payloads)
      if ((params as any).error === 'STOCK_SHORTAGE') {
        Alert.alert(
          'Out of Stock',
          (params as any).message || 'One of the items in your cart has run out of stock. Please modify your order.',
          [{ text: 'Update Cart', onPress: () => navigation.navigate('Cart') }]
        );
        return;
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: params.paymentIntent,
        merchantDisplayName: 'GLASSSKIN',
        defaultBillingDetails: {
          name: finalAddress.fullName,
          email: finalAddress.email,
        }
      });

      if (initError) {
        Alert.alert('Payment Initialization Failed', initError.message);
        return;
      }

      analytics.trackPaymentAttempt('Stripe', calculatedTotals.total);
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        Alert.alert('Payment Failed', paymentError.message);
      } else {
        // Clear progress persistence on successful checkout
        await SecureStoreAdapter.removeItem('checkout_progress');
        await clearCartLocally();
        analytics.trackPurchase(order.id, calculatedTotals.total, cartItems.length);
        navigation.navigate('OrderConfirmation', { 
          orderId: order.id, 
          guestEmail: user ? undefined : guestEmail, 
          guestName: user ? undefined : shippingAddress.fullName 
        });
      }
      return;
    }

    // 2. PayPal WebView Flow
    if (paymentMethod === 'paypal') {
      analytics.trackPaymentAttempt('PayPal', calculatedTotals.total);
      const params = await createPayPalCheckoutOrder(order.id);
      if (!params) {
        Alert.alert(
          'Payment Error',
          'Failed to initialize PayPal. Make sure the paypal-checkout Edge Function is deployed or running locally, and that PayPal secrets are configured.'
        );
        return;
      }

      // Handle PayPal server-side stock shortages
      if ((params as any).error === 'STOCK_SHORTAGE') {
        Alert.alert(
          'Out of Stock',
          (params as any).message || 'One of the items in your cart is out of stock. Please update your cart.',
          [{ text: 'Update Cart', onPress: () => navigation.navigate('Cart') }]
        );
        return;
      }

      setCurrentOrderId(order.id);
      setPaypalOrderId(params.paypalOrderId);
      setPaypalUrl(params.approvalUrl);
    }
  };

  const handlePayPalNavigation = async (navState: any) => {
    const url = navState.url;
    console.log('PayPal Navigation Intercepted:', url);
    
    if (url.includes('paypal-callback') || url.includes('token=')) {
      setPaypalUrl(null);
      setIsPayPalProcessing(true);
      if (currentOrderId && paypalOrderId) {
        const success = await capturePayPalCheckoutOrder(currentOrderId, paypalOrderId);
        setIsPayPalProcessing(false);
        if (success) {
          // Clear progress persistence on success
          await SecureStoreAdapter.removeItem('checkout_progress');
          const totals = displayTotals;
          analytics.trackPurchase(currentOrderId, totals.total, cartItems.length);
          navigation.navigate('OrderConfirmation', { 
            orderId: currentOrderId, 
            guestEmail: user ? undefined : guestEmail, 
            guestName: user ? undefined : shippingAddress.fullName 
          });
        } else {
          Alert.alert('Payment Failed', 'PayPal payment capture failed. Please try again.');
        }
      }
    } else if (url.includes('paypal-cancel') || url.includes('cancel')) {
      setPaypalUrl(null);
      Alert.alert('Payment Cancelled', 'You cancelled the PayPal payment.');
    }
  };

  // Pluggable Region Tax and Shipping calculators matching server-side rules
  const fetchTotals = async () => {
    setIsLoadingTotals(true);
    try {
      const { subtotal, discount } = getCartTotals();
      const items = cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }));

      const { data, error } = await supabaseClient.rpc('compute_order_totals', {
        p_items: items,
        p_promo_code: appliedPromo?.code || null,
        p_state: shippingAddress.state || 'US',
      });

      if (error) throw error;

      const result = data as any;
      setServerTotals({
        subtotal: parseFloat(result.subtotal),
        discount: parseFloat(result.discount_amount),
        shipping: parseFloat(result.shipping_amount),
        tax: parseFloat(result.tax_amount),
        total: parseFloat(result.total_amount),
        taxRate: parseFloat(result.tax_rate),
      });
    } catch (err) {
      console.error('Failed to fetch server-computed totals:', err);
    } finally {
      setIsLoadingTotals(false);
    }
  };

  useEffect(() => {
    if (shippingAddress.state || step >= 3) {
      fetchTotals();
    }
  }, [shippingAddress.state, appliedPromo?.code, step]);

  const getCalculatedTotals = () => {
    if (serverTotals) {
      return serverTotals;
    }
    const { subtotal, discount } = getCartTotals();
    const stateStr = shippingAddress.state.toUpperCase().trim();
    
    let taxRate = 0.0700;
    if (stateStr === 'CA' || stateStr === 'CALIFORNIA') taxRate = 0.0825;
    else if (stateStr === 'NY' || stateStr === 'NEW YORK') taxRate = 0.08875;
    else if (stateStr === 'TX' || stateStr === 'TEXAS') taxRate = 0.0625;
    else if (stateStr === 'FL' || stateStr === 'FLORIDA') taxRate = 0.0600;

    let baseShipping = 5.99;
    if (stateStr === 'HI' || stateStr === 'HAWAII' || stateStr === 'AK' || stateStr === 'ALASKA') {
      baseShipping = 15.00;
    }

    const shipping = (subtotal - discount) >= 50.00 ? 0.00 : baseShipping;
    const tax = parseFloat(((subtotal - discount) * taxRate).toFixed(2));
    const total = parseFloat((subtotal - discount + tax + shipping).toFixed(2));

    return {
      subtotal,
      discount,
      shipping,
      tax,
      total,
      taxRate,
    };
  };

  const displayTotals = serverTotals || getCalculatedTotals();

  return (
    <SafeAreaView style={styles.container}>
      <CheckoutHeader step={step} onBack={handlePrevStep} />
      <ProgressTracker step={step} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* STEP 1: Shipping Address Form */}
        {step === 1 && (
          <ShippingStep
            shippingAddress={shippingAddress}
            guestEmail={guestEmail}
            onShippingChange={setShippingAddress}
            onEmailChange={setGuestEmail}
            isGuest={!user}
          />
        )}

        {/* STEP 2: Payment Selector */}
        {step === 2 && (
          <PaymentStep
            paymentMethod={paymentMethod}
            onSelect={setPaymentMethod}
          />
        )}

        {/* STEP 3: Order Review */}
        {step === 3 && (
          <ReviewStep
            shippingAddress={shippingAddress}
            guestEmail={guestEmail}
            isGuest={!user}
            paymentMethod={paymentMethod}
            cartItems={cartItems}
            displayTotals={displayTotals}
          />
        )}
      </ScrollView>

      {/* Footer Nav Buttons */}
      <View style={styles.footer}>
        {step < 3 ? (
          <GlassButton
            title="Next Step"
            onPress={handleNextStep}
            variant="primary"
            style={styles.nextBtn}
          />
        ) : (
          <GlassButton
            title="Place Order"
            onPress={handlePlaceOrder}
            variant="primary"
            loading={ordersLoading}
            style={styles.nextBtn}
          />
        )}
      </View>

      {/* PayPal In-App Checkout Modal */}
      <PayPalModal
        visible={paypalUrl !== null}
        paypalUrl={paypalUrl}
        onClose={() => setPaypalUrl(null)}
        onNavigationStateChange={handlePayPalNavigation}
      />

      {/* PayPal Processing Loading Overlay */}
      <ProcessingOverlay visible={isPayPalProcessing} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colors.glass2,
    borderTopWidth: 1,
    borderColor: tokens.colors.line,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    // Add blur logic fallback (usually handled via NativeWind/BlurView but for now just color)
    ...tokens.shadows.glass,
  },
  nextBtn: {
    width: '100%',
  },
});
