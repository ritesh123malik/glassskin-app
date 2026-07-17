import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, ViewStyle, AccessibilityInfo } from 'react-native';
import { tokens } from '../../theme/tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  testID?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  testID,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulseAnim.setValue(0.7); // Static opacity when reduce motion is enabled
      return;
    }

    const sharedAnimation = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 850,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0.4,
        duration: 850,
        useNativeDriver: true,
      }),
    ]);

    const loop = Animated.loop(sharedAnimation);
    loop.start();

    return () => loop.stop();
  }, [pulseAnim, reduceMotion]);

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

export const ProductGridSkeleton: React.FC = () => {
  return (
    <View style={styles.gridCard}>
      <Skeleton height={140} borderRadius={12} style={{ marginBottom: 12 }} />
      <Skeleton width="40%" height={12} style={{ marginBottom: 8 }} />
      <Skeleton width="90%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="30%" height={12} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={36} borderRadius={8} />
    </View>
  );
};

export const ProductListSkeleton: React.FC = () => {
  return (
    <View style={styles.listCard}>
      <Skeleton width={80} height={80} borderRadius={8} style={{ marginRight: 16 }} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Skeleton width="30%" height={12} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={12} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={14} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: tokens.colors.surface, // Sand color for skeleton base
  },
  gridCard: {
    width: '48%',
    backgroundColor: tokens.colors.glass,
    borderColor: tokens.colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.glass,
    borderColor: tokens.colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
});
