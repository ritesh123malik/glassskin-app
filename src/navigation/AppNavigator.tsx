import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef } from '@react-navigation/native';
import { Home, Search, Heart, ShoppingCart, User } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProductListingScreen } from '../screens/home/ProductListingScreen';
import { ProductDetailScreen } from '../screens/home/ProductDetailScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/cart/CheckoutScreen';
import { OrderConfirmationScreen } from '../screens/cart/OrderConfirmationScreen';
import { OrderTrackingScreen } from '../screens/orders/OrderTrackingScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { WishlistScreen } from '../screens/home/WishlistScreen';
import { Showroom3DScreen } from '../screens/home/Showroom3DScreen';
import { ComponentGalleryScreen } from '../screens/dev/ComponentGalleryScreen';

// Global Navigation Reference
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Types
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Signup: { email?: string; fullName?: string } | undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  MainTabs: undefined;
  Cart: undefined;
  ProductDetails: { productId: string };
  Checkout: undefined;
  OrderConfirmation: { orderId: string };
  OrderTracking: { orderId: string };
  Showroom3D: undefined;
  ComponentGallery: undefined;
};

// Deep-link config — maps URL paths & notification screen names to routes.
// Used by NavigationContainer's `linking` prop.
export const linkingConfig = {
  prefixes: ['glassskin://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Cart: 'cart',
          Profile: 'profile',
        },
      },
      OrderTracking: 'order/:orderId',
      OrderConfirmation: 'order-confirmation/:orderId',
      ProductDetails: 'product/:productId',
      ResetPassword: 'auth-callback',
    },
  },
};

export type TabParamList = {
  Home: undefined;
  Shop: undefined;
  Wishlist: undefined;
  Cart: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Custom Glassmorphic Tab Bar Styles
const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size: _size }) => {
          const iconSize = 22;
          switch (route.name) {
            case 'Home':
              return <Home size={iconSize} color={color} />;
            case 'Shop':
              return <Search size={iconSize} color={color} />;
            case 'Wishlist':
              return <Heart size={iconSize} color={color} />;
            case 'Cart':
              return <ShoppingCart size={iconSize} color={color} />;
            case 'Profile':
              return <User size={iconSize} color={color} />;
            default:
              return null;
          }
        },
        tabBarActiveTintColor: '#8E5D34', // Primary Blue
        tabBarInactiveTintColor: '#6B6660', // Secondary Gray
        tabBarStyle: {
          backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.95)',
          borderColor: 'rgba(255, 255, 255, 0.7)',
          borderWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          bottom: insets.bottom + 16, // Suspends the floating tab bar card exactly 16px above the device's system safe area
          left: 20,
          right: 20,
          borderRadius: 999,
          elevation: 10,
          shadowColor: '#0B0B0C',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 10,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shop" component={ProductListingScreen} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

interface AppNavigatorProps {
  initialRouteName?: keyof RootStackParamList;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({ initialRouteName = 'Onboarding' }) => {

  // Cold-start deep-link: if the app was killed and user tapped a notification,
  // getLastNotificationResponseAsync() returns the tapped response.
  // We wait for the navigator to be ready before navigating.
  useEffect(() => {
    let cancelled = false;

    async function handleColdStartNotification() {
      if (Platform.OS === 'web') return;
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (!lastResponse || cancelled) return;

        const data = lastResponse.notification.request.content.data;
        if (!data?.screen) return;

        // Poll until the navigation ref is ready (max 3s)
        let waited = 0;
        while (!navigationRef.isReady() && waited < 3000) {
          await new Promise(r => setTimeout(r, 100));
          waited += 100;
        }
        if (!navigationRef.isReady() || cancelled) return;

        navigationRef.navigate(data.screen as any, data.params || {});
      } catch (err) {
        console.warn('Failed to get last notification response', err);
      }
    }

    handleColdStartNotification();
    return () => { cancelled = true; };
  }, []);

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F6F2EE' }, // Deep dark background
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="ProductDetails" component={ProductDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <Stack.Screen name="Showroom3D" component={Showroom3DScreen} />
      {__DEV__ && <Stack.Screen name="ComponentGallery" component={ComponentGalleryScreen} />}
    </Stack.Navigator>
  );
};
