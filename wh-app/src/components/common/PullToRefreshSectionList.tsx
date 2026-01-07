import React, { useRef, useState, useEffect, useImperativeHandle } from 'react';
import {
  View,
  Animated,
  SectionList,
  SectionListProps,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../../constants/theme';

interface PullToRefreshSectionListProps<ItemT, SectionT> extends Omit<SectionListProps<ItemT, SectionT>, 'ref'> {
  onRefresh: () => Promise<void>;
  pullThreshold?: number;
  primaryColor?: string;
  onPullStateChange?: (isPulling: boolean) => void;
  maxPullDistanceMultiplier?: number;
  maxExtraPadding?: number;
  innerRef?: React.Ref<SectionList<ItemT, SectionT>>;
}

function PullToRefreshSectionList<ItemT, SectionT extends { data: ItemT[] }>({
  onRefresh,
  pullThreshold = 80,
  primaryColor = COLORS.primary,
  onPullStateChange,
  maxPullDistanceMultiplier,
  maxExtraPadding,
  innerRef,
  ...sectionListProps
}: PullToRefreshSectionListProps<ItemT, SectionT>) {
  const [refreshing, setRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const pullDistance = useRef(new Animated.Value(0)).current;
  const contentPaddingTop = useRef(new Animated.Value(0)).current;
  const dismissAnimation = useRef(new Animated.Value(1)).current;
  const sectionListRef = useRef<SectionList<ItemT, SectionT>>(null);

  useImperativeHandle(innerRef, () => sectionListRef.current as SectionList<ItemT, SectionT>);
  const scrollY = useRef(0);
  const currentPullValue = useRef(0);
  const [pullValueTrigger, setPullValueTrigger] = useState(0);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDismissing) {
      onPullStateChange?.(false);
    } else {
      const shouldShowWhiteStatusBar =
        (isPulling || refreshing) && currentPullValue.current > 20;
      onPullStateChange?.(shouldShowWhiteStatusBar);
    }
  }, [
    isPulling,
    refreshing,
    isDismissing,
    pullValueTrigger,
    onPullStateChange,
  ]);

  useEffect(() => {
    if (refreshing || isDismissing) {
      shimmerAnim.setValue(0);
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
      ).start();
    } else {
      shimmerAnim.stopAnimation();
      shimmerAnim.setValue(0);
    }
  }, [refreshing, isDismissing, shimmerAnim]);

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    setIsPulling(false);

    contentPaddingTop.setValue(currentPullValue.current);

    try {
      await onRefresh();
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      
      setIsDismissing(true);

      Animated.parallel([
        Animated.timing(dismissAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(pullDistance, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(contentPaddingTop, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setRefreshing(false);
        setIsDismissing(false);
        dismissAnimation.setValue(1);
        pullDistance.setValue(0);
        contentPaddingTop.setValue(0);
        currentPullValue.current = 0;
        setPullValueTrigger(prev => prev + 1);
      });
    }
  };

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    scrollY.current = y;

    if (y < 0 && !refreshing && !isDismissing) {
      const distance = Math.abs(y);

      const maxPullDistance = pullThreshold * (maxPullDistanceMultiplier ?? 1.5);
      const clampedDistance = Math.min(distance, maxPullDistance);

      currentPullValue.current = clampedDistance;
      setPullValueTrigger(prev => prev + 1);

      pullDistance.setValue(clampedDistance);

      const maxContentPadding = pullThreshold + (maxExtraPadding ?? 60);
      const contentPadding = Math.min(clampedDistance, maxContentPadding);
      contentPaddingTop.setValue(contentPadding);
    } else if (!refreshing && !isDismissing) {
      currentPullValue.current = 0;
      pullDistance.setValue(0);
      contentPaddingTop.setValue(0);
    }

    if (sectionListProps.onScroll) {
      sectionListProps.onScroll(event);
    }
  };

  const handleScrollBeginDrag = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y <= 0 && !refreshing && !isDismissing) {
      setIsPulling(true);
    }
    sectionListProps.onScrollBeginDrag?.(event);
  };

  const handleScrollEndDrag = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;

    if (y < -pullThreshold && !refreshing && !isDismissing) {
      handleRefresh();
    } else if (!refreshing) {
      setIsPulling(false);
      currentPullValue.current = 0;
      setPullValueTrigger(prev => prev + 1);
      
      Animated.parallel([
        Animated.spring(pullDistance, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }),
        Animated.spring(contentPaddingTop, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }),
      ]).start();
    }

    sectionListProps.onScrollEndDrag?.(event);
  };

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

  const originalListHeaderComponent = sectionListProps.ListHeaderComponent;
  const wrappedListHeaderComponent = originalListHeaderComponent
    ? (props: any) => (
        <Animated.View style={{ paddingTop: contentPaddingTop }}>
          {typeof originalListHeaderComponent === 'function'
            ? originalListHeaderComponent(props)
            : originalListHeaderComponent}
        </Animated.View>
      )
    : undefined;

  return (
    <View style={styles.container}>
      {}
      {(isPulling || refreshing || isDismissing) && (
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
      )}

      <SectionList
        ref={sectionListRef}
        {...sectionListProps}
        ListHeaderComponent={wrappedListHeaderComponent}
        onScroll={handleScroll}
        scrollEventThrottle={sectionListProps.scrollEventThrottle ?? 16}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        bounces={true}
        alwaysBounceVertical={true}
        bouncesZoom={false}
        contentContainerStyle={[
          sectionListProps.contentContainerStyle,
          { flexGrow: 1, minHeight: '100%' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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

export default PullToRefreshSectionList;

