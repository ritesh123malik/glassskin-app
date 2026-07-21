import './global.css'; // NativeWind Global CSS
import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { 
  Raleway_300Light, Raleway_700Bold, Raleway_800ExtraBold 
} from '@expo-google-fonts/raleway';
import { 
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold 
} from '@expo-google-fonts/inter';
import { 
  PlayfairDisplay_400Regular_Italic 
} from '@expo-google-fonts/playfair-display';
import { ActivityIndicator, View, StyleSheet, Platform, Text } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { StripeProvider } from './src/utils/stripe';
import { AppNavigator, navigationRef, linkingConfig } from './src/navigation/AppNavigator';
import { useAppStore } from './src/store/useAppStore';
import { supabaseClient, isSupabaseConfigured } from './src/services/supabaseClient';
// import * as Sentry from '@sentry/react-native';
import { GlassCard } from './src/components/common/GlassCard';
import { GlassButton } from './src/components/common/GlassButton';
import { MissingConfigScreen } from './src/screens/MissingConfigScreen';

// try {
//   SplashScreen.preventAutoHideAsync();
// } catch (e) {
//   console.warn('[App] SplashScreen.preventAutoHideAsync failed:', e);
// }


// Setup default notification display behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('[App] Notification handler setup failed:', e);
}

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

const FallbackComponent = (props: { error: any; componentStack: string; eventId?: string; resetError?: () => void }) => {
  return (
    <View style={styles.errorBoundaryContainer}>
      <GlassCard intensity="high" style={styles.errorBoundaryCard}>
        <Text style={styles.errorBoundaryTitle}>Something Went Wrong</Text>
        <Text style={styles.errorBoundarySubtitle}>
          An unexpected error occurred in GLASSSKIN. Don't worry, our team has been notified and we are looking into it.
        </Text>
        <Text style={{color: 'red', fontSize: 10, marginTop: 10}}>{String(props.error)}</Text>
        {props.resetError && (
          <GlassButton
            title="Reload App"
            onPress={props.resetError}
            variant="primary"
            style={styles.errorBoundaryBtn}
          />
        )}
      </GlassCard>
    </View>
  );
};

class SimpleErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SimpleErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <FallbackComponent error={this.state.error} componentStack="" />;
    }
    return this.props.children;
  }
}

function App() {
  const user = useAppStore(state => state.user);
  const checkAuth = useAppStore(state => state.checkAuth);
  const initializeAuthListener = useAppStore(state => state.initializeAuthListener);
  const cleanupAuthListener = useAppStore(state => state.cleanupAuthListener);
  const setRecoveringPassword = useAppStore(state => state.setRecoveringPassword);
  const registerPushToken = useAppStore(state => state.registerPushToken);

  const [fontsLoaded, fontError] = useFonts({
    Raleway_300Light, Raleway_700Bold, Raleway_800ExtraBold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    PlayfairDisplay_400Regular_Italic,
  });

  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const prepare = async () => {
      try {
        await Promise.race([
          checkAuth(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Auth check timeout')), 5000))
        ]);
      } catch (e) {
        console.error('[App] Auth check failed or timed out:', e);
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    };

    prepare();

    // Safety timeout: always hide splash screen after 3 seconds to prevent infinite white screen
    const splashTimeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);

    initializeAuthListener();

    const handleUrlEvent = (event: { url: string }) => {
      console.log('Deep link received:', event.url);
    };

    const subscription = Linking.addEventListener('url', handleUrlEvent);

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial deep link:', url);
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
      isMounted = false;
      clearTimeout(splashTimeout);
      subscription.remove();
      responseListener.remove();
      cleanupAuthListener();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (isAuthReady) {
        SplashScreen.hideAsync().catch((err: Error) => {
          console.warn('[App] Failed to hide splash screen:', err);
        });
      }
    }
  }, [fontsLoaded, fontError, isAuthReady]);

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

  // Temporarily bypass font gate to prevent stuck loading screen
  // if (!fontsLoaded && !fontError) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <ActivityIndicator size="large" color="#8E5D34" />
  //     </View>
  //   );
  // }

  if (!isSupabaseConfigured) {
    return <MissingConfigScreen />;
  }


  return (
    <SimpleErrorBoundary>
      <SafeAreaProvider>
        <StripeProvider
          publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy_key_to_prevent_crash'}
        >
          <NavigationContainer ref={navigationRef} linking={linkingConfig}>
            <AppNavigator initialRouteName="Onboarding" />
            <StatusBar style="dark" />
          </NavigationContainer>
        </StripeProvider>
      </SafeAreaProvider>
    </SimpleErrorBoundary>
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

export default App;
