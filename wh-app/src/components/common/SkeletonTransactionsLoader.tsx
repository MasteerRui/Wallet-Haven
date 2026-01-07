import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';

interface SkeletonTransactionsLoadingProps {
  showHeader?: boolean;
  compact?: boolean;
}

const SkeletonTransactionsLoading: React.FC<SkeletonTransactionsLoadingProps> = ({ 
  showHeader = true,
  compact = false,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 1, 0.6],
    }),
  };

  return (
    <Animated.View style={[{ flex: 1 }, shimmerStyle]}>
      <View style={[styles.container, compact && styles.compactContainer]}>
        {}
        {showHeader && (
          <View style={styles.header}>
            <Animated.View style={[styles.skeleton, styles.headerTitle]} />
            <Animated.View style={[styles.skeleton, styles.headerSubtitle]} />
          </View>
        )}

        {}
        {Array.from({ length: 3 }).map((_, dateIndex) => (
          <View key={dateIndex} style={styles.dateGroup}>
            {}
            <Animated.View style={[styles.skeleton, styles.dateHeader]} />

            {}
            {Array.from({ length: 3 }).map((_, txIndex) => (
              <View
                key={`${dateIndex}-${txIndex}`}
                style={styles.transactionItem}
              >
                <Animated.View
                  style={[styles.skeleton, styles.transactionIcon]}
                />
                <View style={styles.transactionTextContainer}>
                  <Animated.View
                    style={[styles.skeleton, styles.transactionName]}
                  />
                  <Animated.View
                    style={[styles.skeleton, styles.transactionSubtext]}
                  />
                </View>
                <Animated.View
                  style={[styles.skeleton, styles.transactionAmount]}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SIZES.padding,
  },
  compactContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  skeleton: {
    backgroundColor: '#D1D5DB',
  },

  header: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerTitle: {
    width: '40%',
    height: 28,
    borderRadius: 4,
    marginBottom: 8,
  },
  headerSubtitle: {
    width: '30%',
    height: 14,
    borderRadius: 3,
  },

  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    width: 120,
    height: 14,
    borderRadius: 3,
    marginBottom: 12,
  },

  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  transactionTextContainer: {
    flex: 1,
  },
  transactionName: {
    width: '65%',
    height: 14,
    borderRadius: 3,
    marginBottom: 6,
  },
  transactionSubtext: {
    width: '45%',
    height: 12,
    borderRadius: 3,
  },
  transactionAmount: {
    width: 60,
    height: 14,
    borderRadius: 3,
    marginLeft: 12,
  },
});

export default SkeletonTransactionsLoading;
