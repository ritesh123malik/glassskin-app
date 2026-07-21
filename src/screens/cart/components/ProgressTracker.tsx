import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { tokens } from '../../../theme/tokens';
import { typography } from '../../../theme/typography';

type Props = {
  step: number;
};

export const ProgressTracker = ({ step }: Props) => {
  return (
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
  );
};

const styles = StyleSheet.create({
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
});
