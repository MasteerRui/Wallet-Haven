import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  refreshing: boolean;
  pullDistance: Animated.AnimatedValue;
  pullThreshold?: number;
  primaryColor?: string;
}

const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  isPulling,
  refreshing,
  pullDistance,
  pullThreshold = 40,
  primaryColor = COLORS.primary,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const dismissAnimation = useRef(new Animated.Value(1)).current;
  const isDismissing = useRef(false);

  useEffect(() => {
    if (refreshing) {
      isDismissing.current = false;
      shimmerAnim.setValue(0);
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
      ).start();
    } else if (!refreshing && !isPulling) {
      
      isDismissing.current = true;
      Animated.timing(dismissAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }).start(() => {
        dismissAnimation.setValue(1);
        isDismissing.current = false;
      });
    } else {
      dismissAnimation.setValue(1);
      isDismissing.current = false;
    }
  }, [refreshing, isPulling, shimmerAnim, dismissAnimation]);

  const ovalHeight = pullDistance.interpolate({
    inputRange: [0, pullThreshold * 0.5, pullThreshold, pullThreshold * 2],
    outputRange: [
      0,
      pullThreshold + 30,
      pullThreshold + 80,
      pullThreshold + 120,
    ],
    extrapolate: 'clamp',
  });

  const ovalBorderRadius = pullDistance.interpolate({
    inputRange: [0, pullThreshold, pullThreshold * 2],
    outputRange: [0, pullThreshold, pullThreshold * 1.5],
    extrapolate: 'clamp',
  });

  const iconOpacity = pullDistance.interpolate({
    inputRange: [0, pullThreshold * 0.5, pullThreshold],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const dismissTranslateY = dismissAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 0],
  });

  const dismissOpacity = dismissAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  const shouldShow = isPulling || refreshing || isDismissing.current;

  if (!shouldShow && !isDismissing.current) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ovalContainer,
        {
          height: ovalHeight,
          borderBottomLeftRadius: ovalBorderRadius,
          borderBottomRightRadius: ovalBorderRadius,
          backgroundColor: primaryColor,
          opacity: dismissOpacity,
          transform: [{ translateY: dismissTranslateY }],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <View style={styles.skeletonTrack}>
          <Animated.View
            style={[
              styles.skeletonShimmer,
              {
                opacity: iconOpacity,
                transform: [
                  {
                    translateX: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-40, 40],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  ovalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -100,
    width: '100%',
    zIndex: 100,
    overflow: 'hidden',
  },
  iconContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonTrack: {
    width: 80,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  skeletonShimmer: {
    width: 40,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});

export default PullToRefreshIndicator;

