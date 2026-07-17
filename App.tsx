import './global.css'; // NativeWind Global CSS
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { 
  Raleway_200ExtraLight, Raleway_300Light, Raleway_400Regular, 
  Raleway_500Medium, Raleway_600SemiBold, Raleway_700Bold, Raleway_800ExtraBold 
} from '@expo-google-fonts/raleway';
import { 
  Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold 
} from '@expo-google-fonts/inter';
import { 
  PlayfairDisplay_400Regular_Italic, PlayfairDisplay_500Medium_Italic, PlayfairDisplay_600SemiBold_Italic 
} from '@expo-google-fonts/playfair-display';
import { ActivityIndicator, View, StyleSheet, Platform, Text } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { StripeProvider } from './src/utils/stripe';
import { AppNavigator, navigationRef, linkingConfig } from './src/navigation/AppNavigator';
import { useAppStore } from './src/store/useAppStore';
import { supabaseClient } from './src/services/supabaseClient';
import * as Sentry from '@sentry/react-native';
import { GlassCard } from './src/components/common/GlassCard';
import { GlassButton } from './src/components/common/GlassButton';

// Initialize Sentry per Sentry React Native Expo setup guidelines
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://placeholder@sentry.io/123456',
  debug: __DEV__,
  beforeSend(event) {
    // centrally scrub PII and payment data
    const cardRegex = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;
    
    if (event.request && event.request.headers) {
      // Scrub authorization headers
      const sensitiveHeaders = ['Authorization', 'auth', 'apikey', 'cookie', 'x-client-info'];
      sensitiveHeaders.forEach(header => {
        if (event.request!.headers![header]) {
          event.request!.headers![header] = '[SCRUBBED]';
        }
        if (event.request!.headers![header.toLowerCase()]) {
          event.request!.headers![header.toLowerCase()] = '[SCRUBBED]';
        }
      });
    }

    const scrubData = (obj: any): any => {
      if (typeof obj === 'string') {
        let temp = obj.replace(cardRegex, '[REDACTED_PAN]');
        // scrub bearer tokens without wiping out the whole message
        temp = temp.replace(/(bearer\s+)[a-zA-Z0-9\-_\.]+/gi, '$1[REDACTED_BEARER_TOKEN]');
        return temp;
      }
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const keyLower = key.toLowerCase();
            if (
              keyLower.includes('password') ||
              keyLower.includes('cvv') ||
              keyLower.includes('cvc') ||
              keyLower.includes('token') ||
              keyLower.includes('card') ||
              keyLower.includes('authorization') ||
              keyLower.includes('secret') ||
              keyLower.includes('key')
            ) {
              obj[key] = '[SCRUBBED_PII]';
            } else {
              obj[key] = scrubData(obj[key]);
            }
          }
        }
      }
      return obj;
    };

    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data) {
          breadcrumb.data = scrubData(breadcrumb.data);
        }
        return breadcrumb;
      });
    }

    if (event.extra) {
      event.extra = scrubData(event.extra);
    }

    if (event.message) {
      event.message = scrubData(event.message);
    }

    if (event.exception && event.exception.values) {
      event.exception.values = event.exception.values.map(val => {
        if (val.value) {
          val.value = scrubData(val.value);
        }
        return val;
      });
    }

    // We retain event.user.email for customer support debugging, as allowed by Requirement 2,
    // but strip sensitive auth tags
    if (event.user) {
      delete event.user.password;
    }

    return event;
  },
});

// Setup default notification display behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get permission for push notifications!');
    return null;
  }

  try {
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || 'temp-app';
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  } catch (err) {
    console.error('Error generating Expo push token:', err);
    return null;
  }
}

// Graceful Sentry Error Boundary Fallback Screen
const FallbackComponent = (props: { error: any; componentStack: string; eventId: string; resetError: () => void }) => {
  return (
    <View style={styles.errorBoundaryContainer}>
      <GlassCard intensity="high" style={styles.errorBoundaryCard}>
        <Text style={styles.errorBoundaryTitle}>Something Went Wrong</Text>
        <Text style={styles.errorBoundarySubtitle}>
          An unexpected error occurred in GLASSSKIN. Don't worry, our team has been notified and we are looking into it.
        </Text>
        <GlassButton
          title="Reload App"
          onPress={props.resetError}
          variant="primary"
          style={styles.errorBoundaryBtn}
        />
      </GlassCard>
    </View>
  );
};

function App() {
  const user = useAppStore(state => state.user);
  const checkAuth = useAppStore(state => state.checkAuth);
  const initializeAuthListener = useAppStore(state => state.initializeAuthListener);
  const setRecoveringPassword = useAppStore(state => state.setRecoveringPassword);
  const registerPushToken = useAppStore(state => state.registerPushToken);

  const [fontsLoaded, fontError] = useFonts({
    Raleway_200ExtraLight, Raleway_300Light, Raleway_400Regular, 
    Raleway_500Medium, Raleway_600SemiBold, Raleway_700Bold, Raleway_800ExtraBold,
    Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    PlayfairDisplay_400Regular_Italic, PlayfairDisplay_500Medium_Italic, PlayfairDisplay_600SemiBold_Italic
  });

  const handleDeepLink = async (url: string) => {
    console.log('Intercepted Deep Link URL:', url);
    
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return;

    const hash = url.substring(hashIndex + 1);
    const params: Record<string, string> = {};
    hash.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
    });

    if (params.access_token && params.refresh_token) {
      console.log('Setting session from deep link recovery...');
      const { error } = await supabaseClient.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token
      });

      if (error) {
        console.error('Failed to set deep link session:', error.message);
        return;
      }

      if (params.type === 'recovery') {
        console.log('Redirecting to ResetPasswordScreen...');
        setRecoveringPassword(true);
        if (navigationRef.isReady()) {
          navigationRef.navigate('ResetPassword' as any);
        }
      }
    }
  };

  useEffect(() => {
    initializeAuthListener();
    checkAuth();

    const handleUrlEvent = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    const subscription = Linking.addEventListener('url', handleUrlEvent);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification Response Received:', data);
      
      if (data && data.screen) {
        if (navigationRef.isReady()) {
          navigationRef.navigate(data.screen as any, data.params || {});
        }
      }
    });

    return () => {
      subscription.remove();
      responseListener.remove();
    };
  }, []);

  // Register push notifications when user logs in
  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          registerPushToken(token, Platform.OS as any);
        }
      });
    }
  }, [user]);

  if (fontError) {
    console.warn("Fonts failed to load, falling back to system fonts:", fontError);
  }

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8E5D34" />
      </View>
    );
  }

  return (
    <Sentry.ErrorBoundary fallback={FallbackComponent}>
      <SafeAreaProvider>
        <StripeProvider
          publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
        >
          <NavigationContainer ref={navigationRef} linking={linkingConfig}>
            <AppNavigator initialRouteName="Onboarding" />
            <StatusBar style="light" />
          </NavigationContainer>
        </StripeProvider>
      </SafeAreaProvider>
    </Sentry.ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBoundaryContainer: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorBoundaryCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  errorBoundaryTitle: {
    color: '#0B0B0C',
    fontSize: 20,
    fontFamily: 'Raleway_700Bold',
    marginBottom: 12,
  },
  errorBoundarySubtitle: {
    color: '#6B6660',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorBoundaryBtn: {
    width: '100%',
  },
});

export default Sentry.wrap(App);
