import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';

const GoalSkeleton = () => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmer.start();

    return () => shimmer.stop();
  }, []);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.nameIconContainer}>
          <Animated.View style={[styles.iconSkeleton, { opacity }]} />
          <Animated.View style={[styles.nameSkeleton, { opacity }]} />
        </View>
        <Animated.View style={[styles.arrowSkeleton, { opacity }]} />
      </View>
      <View style={styles.moreInfoContainer}>
        <View style={styles.textInfoContainer}>
          <Animated.View style={[styles.textSkeleton, { opacity }]} />
          <Animated.View style={[styles.textSkeleton, { opacity }]} />
        </View>
        <Animated.View style={[styles.progressBarSkeleton, { opacity }]} />
        <View style={styles.textInfoContainer}>
          <Animated.View style={[styles.textSkeleton, { opacity }]} />
          <Animated.View style={[styles.textSkeleton, { opacity }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 11,
    marginTop: 14,
  },
  innerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameIconContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconSkeleton: {
    backgroundColor: COLORS.background,
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  nameSkeleton: {
    backgroundColor: COLORS.background,
    width: 120,
    height: 16,
    borderRadius: 8,
  },
  arrowSkeleton: {
    backgroundColor: COLORS.background,
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  moreInfoContainer: {
    backgroundColor: COLORS.background,
    marginTop: 10,
    borderRadius: 16,
    padding: 14,
  },
  textInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textSkeleton: {
    backgroundColor: COLORS.backgroundSecondary,
    width: 80,
    height: 14,
    borderRadius: 7,
  },
  progressBarSkeleton: {
    backgroundColor: COLORS.backgroundSecondary,
    height: 4,
    borderRadius: 10,
    marginVertical: 7,
  },
});

export default GoalSkeleton;
