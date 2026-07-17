import React, { useState, useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent, AccessibilityInfo, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';

interface RevealOnScrollProps {
  children: React.ReactNode;
  scrollY: SharedValue<number>;
  screenHeight: number;
  style?: ViewStyle;
}

export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({ children, scrollY, screenHeight, style }) => {
  const [componentY, setComponentY] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });
  }, []);

  const handleLayout = (e: LayoutChangeEvent) => {
    // Determine where this component is located vertically in the ScrollView
    setComponentY(e.nativeEvent.layout.y);
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion || componentY === 0) {
      return {
        opacity: 1,
        transform: [{ translateY: 0 }],
      };
    }

    // scrollY.value is how far the user has scrolled down (0 at top).
    // The bottom of the screen in terms of scroll content coordinates is: scrollY.value + screenHeight.
    // We want the reveal to start when the element enters the bottom of the screen,
    // and finish revealing by the time it scrolls up a bit (e.g., 100px into the screen).
    const revealStart = componentY - screenHeight + 50; // trigger a bit before it hits bottom
    const revealEnd = componentY - screenHeight + 200; // fully revealed after 150px of scrolling

    const opacity = interpolate(
      scrollY.value,
      [revealStart, revealEnd],
      [0, 1],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [revealStart, revealEnd],
      [50, 0], // Rise 50px
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  if (reduceMotion) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  return (
    <Animated.View style={[styles.container, style, animatedStyle]} onLayout={handleLayout}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Basic container style if needed
  },
});
