import React, { useEffect, useState } from 'react';
import { View, StyleSheet, AccessibilityInfo, LayoutChangeEvent, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface MarqueeProps {
  children: React.ReactNode;
  duration?: number;
  style?: ViewStyle;
  testID?: string;
}

export const Marquee: React.FC<MarqueeProps> = ({ children, duration = 10000, style, testID }) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });
  }, []);

  useEffect(() => {
    if (contentWidth === 0) {
      cancelAnimation(translateX);
      translateX.value = 0;
      return;
    }

    // Reset translation
    translateX.value = 0;
    
    // Animate from 0 to -contentWidth (which is exactly half the total doubled width)
    translateX.value = withRepeat(
      withTiming(-contentWidth, {
        duration: duration,
        easing: Easing.linear,
      }),
      -1, // Infinite loop
      false // No reverse
    );
  }, [contentWidth, reduceMotion, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== contentWidth) {
      setContentWidth(width);
    }
  };

  const renderChildren = () => {
    return React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        // Automatically inject wrapping prevention properties for Text children
        const typeName = typeof child.type === 'string' 
          ? child.type 
          : (child.type as any)?.displayName || (child.type as any)?.name || '';
        
        if (typeName === 'Text') {
          return React.cloneElement(child as React.ReactElement<any>, {
            numberOfLines: 1,
            adjustsFontSizeToFit: false,
          });
        }
      }
      return child;
    });
  };

  if (reduceMotion) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.staticContent}>
          {renderChildren()}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID || 'marquee-container'}>
      <Animated.View style={[styles.track, animatedStyle]}>
        {/* We double the content to make the loop seamless */}
        <View onLayout={handleLayout} style={styles.contentUnit}>
          {renderChildren()}
        </View>
        <View style={styles.contentUnit}>
          {renderChildren()}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
  },
  track: {
    flexDirection: 'row',
  },
  contentUnit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staticContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
