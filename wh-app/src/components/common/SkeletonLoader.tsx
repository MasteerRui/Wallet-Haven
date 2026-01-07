import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';

const SkeletonHomeLoading: React.FC = () => {
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
      <View style={styles.container}>
        {}
        <View style={styles.headerSection}>
          <View style={styles.headerLeft}>
            <View style={[styles.skeleton, styles.greetingText]} />
            <View style={[styles.skeleton, styles.accountNameText]} />
          </View>
          <View style={[styles.skeleton, styles.avatarCircle]} />
        </View>

        {}
        <View style={styles.balanceCard}>
          <View style={styles.balanceContent}>
            <View>
              <View style={[styles.skeleton, styles.balanceLabel]} />
              <View style={[styles.skeleton, styles.balanceAmount]} />
            </View>
            <View style={[styles.skeleton, styles.compactAvatar]} />
          </View>
        </View>

        {}
        <View style={styles.sectionTitleWrapper}>
          <View style={[styles.skeleton, styles.sectionTitle]} />
        </View>

        {}
        <View style={styles.transactionsContainer}>
          {}
          <View style={[styles.skeleton, styles.dateHeader]} />

          {}
          {Array.from({ length: 8 }).map((_, index) => (
            <View key={index} style={styles.transactionItem}>
              <View style={[styles.skeleton, styles.transactionIcon]} />
              <View style={styles.transactionTextContainer}>
                <View style={[styles.skeleton, styles.transactionName]} />
                <View style={[styles.skeleton, styles.transactionSubtext]} />
              </View>
              <View style={[styles.skeleton, styles.transactionAmount]} />
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
  },
  skeleton: {
    backgroundColor: '#D1D5DB',
  },

  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    width: 80,
    height: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  accountNameText: {
    width: 180,
    height: 28,
    borderRadius: 6,
    marginBottom: 0,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 12,
  },

  balanceCard: {
    backgroundColor: '#E5E7EB',
    borderRadius: 24,
    padding: SIZES.padding,
    marginBottom: 24,
    height: 200,
    justifyContent: 'space-between',
  },
  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    width: 100,
    height: 12,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: '#D1D5DB',
  },
  balanceAmount: {
    width: 160,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1D5DB',
  },

  sectionTitleWrapper: {
    marginBottom: 16,
    marginTop: 12,
  },
  sectionTitle: {
    width: 140,
    height: 20,
    borderRadius: 4,
  },

  transactionsContainer: {
    marginTop: 8,
  },
  dateHeader: {
    width: 120,
    height: 14,
    borderRadius: 3,
    marginBottom: 16,
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

export default SkeletonHomeLoading;
