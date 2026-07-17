import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert, Platform, Modal } from 'react-native';
import { MapPin, CreditCard, ShoppingBag, Check } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useStripe } from '../../utils/stripe';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/common/GlassCard';
import { GlassButton } from '../../components/common/GlassButton';
import { ShippingAddress } from '../../types';
import { SecureStoreAdapter, supabaseClient } from '../../services/supabaseClient';
import { analytics } from '../../services/analytics';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

export const CheckoutScreen = ({ navigation }: any) => {
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

  // Autocomplete suggestions states
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [autocompleteUnavailable, setAutocompleteUnavailable] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

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

  // Google Places Autocomplete Geocoding Suggestions via Edge Function
  const handleAddressChange = async (text: string) => {
    setShippingAddress(prev => ({ ...prev, addressLine1: text }));
    if (text.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    try {
      const { data, error } = await supabaseClient.functions.invoke('google-places-autocomplete', {
        body: { input: text }
      });

      if (error) {
        console.error('Google Autocomplete Edge Function Error:', error);
        setPredictions([]);
        setShowPredictions(false);
        setAutocompleteUnavailable(true);
        return;
      }

      if (data && data.predictions) {
        setPredictions(data.predictions);
        setShowPredictions(true);
        setAutocompleteUnavailable(false);
      }
    } catch (err) {
      console.error('Google Autocomplete Error:', err);
      setPredictions([]);
      setShowPredictions(false);
      setAutocompleteUnavailable(true);
    }
  };

  const handleSelectPrediction = (item: any) => {
    if (item.terms) {
      // Terms Autopopulation (keep for backward compatibility with actual Google places terms if structure is same)
      setShippingAddress({
        fullName: shippingAddress.fullName,
        addressLine1: item.terms[0]?.value || item.terms[0] || '',
        city: item.terms[1]?.value || item.terms[1] || '',
        state: item.terms[2]?.value || item.terms[2] || '',
        postalCode: item.terms[3]?.value || item.terms[3] || '',
        country: 'United States',
      });
    } else {
      // Real API parsing fallback
      const parts = item.description.split(',').map((s: string) => s.trim());
      if (parts.length >= 3) {
        const stateZip = parts[2].split(' ');
        setShippingAddress({
          fullName: shippingAddress.fullName,
          addressLine1: parts[0],
          city: parts[1],
          state: stateZip[0] || '',
          postalCode: stateZip[1] || parts[3] || '',
          country: 'United States',
        });
      }
    }
    setPredictions([]);
    setShowPredictions(false);
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
      if (paymentMethod === 'card') {
        if (!cardNumber || !cardExpiry || !cardCVV) {
          Alert.alert('Error', 'Please fill out card details.');
          return;
        }
      }
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
    const calculatedTotals = getCalculatedTotals();

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
        Alert.alert('Payment Error', 'Failed to initialize PayPal Payment. Please try again.');
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
          const totals = getCalculatedTotals();
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
  const getCalculatedTotals = () => {
    const { subtotal, discount } = getCartTotals();
    const stateStr = shippingAddress.state.toUpperCase().trim();
    
    let taxRate = 0.0700; // Default flat tax (7.0%)
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
      total
    };
  };

  const totals = getCalculatedTotals();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handlePrevStep}>
          <Text style={styles.headerBtnText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Progress Tracker */}
      <View style={styles.progressBar}>
        <View style={styles.progressRow}>
          <View style={styles.stepIndicatorWrapper}>
            <View style={[styles.stepIndicator, step >= 1 ? styles.stepActive : null]}>
              {step > 1 ? <Check size={12} color="#0B0B0C" /> : <Text style={styles.stepText}>1</Text>}
            </View>
            <Text style={styles.stepLabel}>Shipping</Text>
          </View>
          <View style={[styles.progressLine, step >= 2 ? styles.lineActive : null]} />
          <View style={styles.stepIndicatorWrapper}>
            <View style={[styles.stepIndicator, step >= 2 ? styles.stepActive : null]}>
              {step > 2 ? <Check size={12} color="#0B0B0C" /> : <Text style={styles.stepText}>2</Text>}
            </View>
            <Text style={styles.stepLabel}>Payment</Text>
          </View>
          <View style={[styles.progressLine, step >= 3 ? styles.lineActive : null]} />
          <View style={styles.stepIndicatorWrapper}>
            <View style={[styles.stepIndicator, step >= 3 ? styles.stepActive : null]}>
              <Text style={styles.stepText}>3</Text>
            </View>
            <Text style={styles.stepLabel}>Confirm</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* STEP 1: Shipping Address Form */}
        {step === 1 && (
          <View>
            <GlassCard variant="float-card" style={styles.formCard}>
              <Text style={styles.sectionTitle}>Shipping Address</Text>
              
              {!user && (
                <TextInput
                  testID="checkout-email-input"
                  placeholder="Email Address (for order updates)"
                  placeholderTextColor="rgba(248, 250, 252, 0.4)"
                  style={styles.input}
                  value={guestEmail}
                  onChangeText={setGuestEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}

              <TextInput
                testID="checkout-name-input"
                placeholder="Full Name"
                placeholderTextColor="rgba(248, 250, 252, 0.4)"
                style={styles.input}
                value={shippingAddress.fullName}
                onChangeText={(text) => setShippingAddress(prev => ({ ...prev, fullName: text }))}
              />

              <TextInput
                testID="checkout-address-input"
                placeholder="Address Line 1"
                placeholderTextColor="rgba(248, 250, 252, 0.4)"
                style={styles.input}
                value={shippingAddress.addressLine1}
                onChangeText={handleAddressChange}
              />
              
              {autocompleteUnavailable && (
                <Text style={{ color: '#FCD34D', fontSize: 12, marginTop: -10, marginBottom: 15, marginLeft: 5 }}>
                  Autocomplete unavailable. Please enter address manually.
                </Text>
              )}

              {/* Suggestions dropdown */}
              {showPredictions && predictions.length > 0 && (
                <View style={styles.autocompleteContainer}>
                  {predictions.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.autocompleteItem}
                      onPress={() => handleSelectPrediction(item)}
                    >
                      <Text style={styles.autocompleteText}>{item.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TextInput
                testID="checkout-city-input"
                placeholder="City"
                placeholderTextColor="rgba(248, 250, 252, 0.4)"
                style={styles.input}
                value={shippingAddress.city}
                onChangeText={(text) => setShippingAddress(prev => ({ ...prev, city: text }))}
              />

              <TextInput
                testID="checkout-state-input"
                placeholder="State (e.g. CA, NY, TX)"
                placeholderTextColor="rgba(248, 250, 252, 0.4)"
                style={styles.input}
                value={shippingAddress.state}
                onChangeText={(text) => setShippingAddress(prev => ({ ...prev, state: text }))}
                autoCapitalize="characters"
              />

              <TextInput
                testID="checkout-postal-input"
                placeholder="Postal Code"
                placeholderTextColor="rgba(248, 250, 252, 0.4)"
                style={styles.input}
                value={shippingAddress.postalCode}
                onChangeText={(text) => setShippingAddress(prev => ({ ...prev, postalCode: text }))}
                keyboardType="numeric"
              />
            </GlassCard>
          </View>
        )}

        {/* STEP 2: Payment Selector */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>

            {/* Credit Card Option */}
            <TouchableOpacity 
              style={[styles.paymentOption, paymentMethod === 'card' ? styles.paymentOptionActive : null]}
              onPress={() => setPaymentMethod('card')}
              activeOpacity={0.8}
            >
              <GlassCard variant="float-card" style={[styles.paymentCardInner, paymentMethod === 'card' && styles.paymentCardActive]}>
                <View style={styles.paymentCardHeader}>
                  <View style={styles.radioRow}>
                    <View style={styles.radioButton}>
                      {paymentMethod === 'card' && <View style={styles.radioButtonDot} />}
                    </View>
                    <Text style={styles.paymentOptionText}>Credit or Debit Card</Text>
                  </View>
                  <CreditCard size={20} color="#D9B79A" />
                </View>

                {paymentMethod === 'card' && (
                  <View style={styles.cardForm}>
                    <TextInput
                      testID="checkout-card-number"
                      placeholder="Card Number (Stripe test: 4242...)"
                      placeholderTextColor="rgba(248, 250, 252, 0.4)"
                      style={styles.input}
                      value={cardNumber}
                      onChangeText={setCardNumber}
                      keyboardType="numeric"
                    />
                    <View style={styles.row}>
                      <TextInput
                        testID="checkout-card-expiry"
                        placeholder="MM/YY"
                        placeholderTextColor="rgba(248, 250, 252, 0.4)"
                        style={[styles.input, { flex: 1, marginRight: 10 }]}
                        value={cardExpiry}
                        onChangeText={setCardExpiry}
                      />
                      <TextInput
                        testID="checkout-card-cvv"
                        placeholder="CVV"
                        placeholderTextColor="rgba(248, 250, 252, 0.4)"
                        style={[styles.input, { flex: 1 }]}
                        value={cardCVV}
                        onChangeText={setCardCVV}
                        secureTextEntry
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}
              </GlassCard>
            </TouchableOpacity>

            {/* PayPal Option */}
            <TouchableOpacity 
              style={[styles.paymentOption, paymentMethod === 'paypal' ? styles.paymentOptionActive : null]}
              onPress={() => setPaymentMethod('paypal')}
              activeOpacity={0.8}
            >
              <GlassCard variant="float-card" style={[styles.paymentCardInner, paymentMethod === 'paypal' && styles.paymentCardActive]}>
                <View style={styles.paymentCardHeader}>
                  <View style={styles.radioRow}>
                    <View style={styles.radioButton}>
                      {paymentMethod === 'paypal' && <View style={styles.radioButtonDot} />}
                    </View>
                    <Text style={styles.paymentOptionText}>PayPal Checkout</Text>
                  </View>
                  <Text style={styles.paypalLogo}>PayPal</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Order Review */}
        {step === 3 && (
          <View>
            {/* Shipping details review */}
            <GlassCard variant="float-card" style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                <MapPin size={16} color="#D9B79A" />
                <Text style={styles.reviewCardTitle}>Shipping Details</Text>
              </View>
              <Text style={styles.reviewText}>{shippingAddress.fullName}</Text>
              {!user && <Text style={styles.reviewText}>Email: {guestEmail}</Text>}
              <Text style={styles.reviewText}>
                {shippingAddress.addressLine1}, {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
              </Text>
            </GlassCard>

            {/* Payment details review */}
            <GlassCard variant="float-card" style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                <CreditCard size={16} color="#D9B79A" />
                <Text style={styles.reviewCardTitle}>Payment Details</Text>
              </View>
              <Text style={styles.reviewText}>
                {paymentMethod === 'card' ? `Credit Card ending in ${cardNumber.slice(-4)}` : 'PayPal Account'}
              </Text>
            </GlassCard>

            {/* Cart products review */}
            <GlassCard variant="float-card" style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                <ShoppingBag size={16} color="#D9B79A" />
                <Text style={styles.reviewCardTitle}>Review Items</Text>
              </View>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.reviewItemRow}>
                  <Text style={styles.reviewItemQty}>{item.quantity}x</Text>
                  <Text style={styles.reviewItemName} numberOfLines={1}>{item.product?.name}</Text>
                  <Text style={styles.reviewItemPrice}>
                    ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </GlassCard>

            {/* Financial totals breakdown */}
            <GlassCard variant="bento-item" style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalVal}>${totals.subtotal.toFixed(2)}</Text>
              </View>
              {totals.discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={[styles.totalVal, styles.discountVal]}>-${totals.discount.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping</Text>
                <Text style={styles.totalVal}>{totals.shipping === 0 ? 'FREE' : `$${totals.shipping.toFixed(2)}`}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({shippingAddress.state.toUpperCase()})</Text>
                <Text style={styles.totalVal}>${totals.tax.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={[styles.totalRow, styles.finalTotalRow]}>
                <Text style={styles.finalTotalLabel}>Grand Total</Text>
                <Text style={styles.finalTotalVal}>${totals.total.toFixed(2)}</Text>
              </View>
            </GlassCard>
          </View>
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
      <Modal
        visible={paypalUrl !== null}
        animationType="slide"
        onRequestClose={() => setPaypalUrl(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F2EE' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPaypalUrl(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>PayPal Checkout</Text>
            <View style={{ width: 50 }} />
          </View>
          {paypalUrl && (
            <WebView
              source={{ uri: paypalUrl }}
              onNavigationStateChange={handlePayPalNavigation}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoader}>
                  <ActivityIndicator size="large" color="#8E5D34" />
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* PayPal Processing Loading Overlay */}
      {isPayPalProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#8E5D34" />
          <Text style={styles.processingText}>Processing PayPal Payment...</Text>
        </View>
      )}
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
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
  },
  headerTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
  },
  headerBtn: {
    paddingVertical: 4,
    width: 80,
  },
  headerBtnText: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  progressBar: {
    paddingHorizontal: 30,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: tokens.colors.background,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  stepIndicatorWrapper: {
    alignItems: 'center',
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.colors.glass,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  stepText: {
    color: tokens.colors.ink,
    fontSize: 11,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
  },
  stepLabel: {
    color: tokens.colors.muted,
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: tokens.colors.line,
    marginHorizontal: 10,
    marginTop: -16,
  },
  lineActive: {
    backgroundColor: tokens.colors.accent,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  formCard: {
    padding: 20,
    borderRadius: 20,
  },
  sectionTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  input: {
    height: 48,
    backgroundColor: tokens.colors.glass,
    borderColor: tokens.colors.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  paymentOption: {
    marginBottom: 14,
  },
  paymentOptionActive: {
    borderRadius: 20,
  },
  paymentCardInner: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentCardActive: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accentGlow,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: tokens.colors.muted,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.colors.accent,
  },
  paymentOptionText: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  cardForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.line,
  },
  paypalLogo: {
    color: '#0079C1',
    fontFamily: 'Raleway_700Bold',
    fontSize: 15,
    fontWeight: 'bold',
  },
  reviewCard: {
    padding: 16,
    marginBottom: 12,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewCardTitle: {
    ...typography.eyebrow,
    color: tokens.colors.muted,
    marginLeft: 8,
  },
  reviewText: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  reviewItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: tokens.colors.line,
  },
  reviewItemQty: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
    width: 24,
  },
  reviewItemName: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  reviewItemPrice: {
    color: tokens.colors.ink,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  totalsCard: {
    padding: 16,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    color: tokens.colors.muted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  totalVal: {
    color: tokens.colors.ink,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  discountVal: {
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.line,
    marginVertical: 12,
  },
  finalTotalRow: {
    marginBottom: 0,
  },
  finalTotalLabel: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
  },
  finalTotalVal: {
    color: tokens.colors.accent,
    fontSize: 18,
    fontFamily: 'Raleway_700Bold',
    fontWeight: '700',
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
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  closeBtn: {
    paddingVertical: 8,
  },
  closeBtnText: {
    color: '#EF4444',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  modalTitle: {
    ...typography.display,
    color: tokens.colors.ink,
    fontSize: 16,
  },
  webviewLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.background,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 999,
  },
  processingText: {
    color: tokens.colors.ink,
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  autocompleteContainer: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.line,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 12,
    maxHeight: 180,
    zIndex: 10,
  },
  autocompleteItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  autocompleteText: {
    color: tokens.colors.ink,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
