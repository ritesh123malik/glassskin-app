process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://dummy-project.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'dummy-anon-key';
process.env.EXPO_PUBLIC_PROJECT_ID = 'dummy-project-id';

// Mock react-native-worklets at the very top
jest.mock('react-native-worklets', () => ({
  createSerializable: (val) => val,
  isWorkletFunction: () => false,
  RuntimeKind: {},
  scheduleOnUI: (fn) => fn,
  serializableMappingCache: {
    set: () => {},
    get: () => {},
    has: () => false,
  },
  Worklets: {
    createRunInJSFn: (fn) => fn,
    createRunInContextFn: (fn) => fn,
  },
}));

import 'react-native-gesture-handler/jestSetup';

// Mock Supabase Client globally
jest.mock('./src/services/supabaseClient', () => ({
  supabaseClient: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
  SecureStoreAdapter: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});


// Mock Stripe
jest.mock('@stripe/stripe-react-native', () => {
  return {
    useStripe: () => ({
      initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
      presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
    }),
    StripeProvider: (props) => props.children,
  };
});

// Mock Expo SQLite
jest.mock('expo-sqlite', () => {
  return {
    openDatabaseSync: jest.fn().mockReturnValue({
      execSync: jest.fn(),
      runSync: jest.fn(),
      getFirstSync: jest.fn().mockReturnValue(null),
      getAllSync: jest.fn().mockReturnValue([]),
    }),
  };
});

// Mock Expo Secure Store
jest.mock('expo-secure-store', () => {
  const store = {};
  return {
    setItemAsync: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((key) => {
      return Promise.resolve(store[key] || null);
    }),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
  };
});

// Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (App) => App,
  ErrorBoundary: (props) => props.children,
  withErrorBoundary: (component) => component,
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'expo-token' }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({
    remove: jest.fn(),
  }),
}));

// Mock Expo Font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn().mockReturnValue(true),
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => {
  return new Proxy({}, {
    get: (target, name) => {
      const React = require('react');
      const { Text } = require('react-native');
      return (props) => React.createElement(Text, props, name);
    }
  });
});

// Mock WebView
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props) => React.createElement(View, props, props.children)
  };
});
