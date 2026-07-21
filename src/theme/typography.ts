import { StyleSheet } from 'react-native';

/**
 * Helper to convert CSS em-based letter spacing to RN points.
 * Native letterSpacing is an absolute point value, so it must be calculated relative to fontSize.
 */
const getTracking = (fontSize: number, emTracking: number) => fontSize * emTracking;

export const typography = {
  wordmark: {
    fontFamily: 'Raleway_800ExtraBold',
    textTransform: 'uppercase' as const,
    // 0.35em tracking
    letterSpacing: getTracking(24, 0.35),
  },
  display: {
    fontFamily: 'Raleway_300Light',
    // -0.035em tracking
    letterSpacing: getTracking(32, -0.035),
    lineHeight: 32 * 0.92,
  },
  eyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    // 0.32em tracking
    letterSpacing: getTracking(11, 0.32),
    textTransform: 'uppercase' as const,
  },
  italic: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    // -0.01em tracking
    letterSpacing: getTracking(16, -0.01),
  },
};

export const getTypography = {
  wordmark: (fontSize: number) => ({
    fontFamily: 'Raleway_800ExtraBold',
    textTransform: 'uppercase' as const,
    letterSpacing: getTracking(fontSize, 0.35),
    fontSize,
  }),
  display: (fontSize: number) => ({
    fontFamily: 'Raleway_300Light',
    letterSpacing: getTracking(fontSize, -0.035),
    lineHeight: fontSize * 0.92,
    fontSize,
  }),
  italic: (fontSize: number) => ({
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    letterSpacing: getTracking(fontSize, -0.01),
    fontSize,
  }),
};
