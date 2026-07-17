module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|nativewind|react-native-svg|lucide-react-native|@stripe/stripe-react-native|react-native-gesture-handler|react-native-reanimated)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/store/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
    'src/screens/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/theme/**/*',
  ],
  coverageThreshold: {
    './src/store/': {
      statements: 30,
      branches: 20,
      functions: 30,
      lines: 30,
    },
    './src/utils/': {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50,
    },
    './src/screens/': {
      statements: 12,
      branches: 10,
      functions: 5,
      lines: 12,
    },
    './src/services/': {
      statements: 15,
      branches: 12,
      functions: 15,
      lines: 15,
    },
    './src/components/': {
      statements: 20,
      branches: 15,
      functions: 15,
      lines: 20,
    },
  },
};
