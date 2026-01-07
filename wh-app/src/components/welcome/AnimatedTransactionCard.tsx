import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { welcomeStyles as styles } from '../../styles/welcomeStyles';

interface AnimatedTransactionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  time: string;
  amount: string;
  isIncome?: boolean;
}

export const AnimatedTransactionCard: React.FC<
  AnimatedTransactionCardProps
> = ({ icon, title, subtitle, time, amount, isIncome = false }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const amountColor = isIncome ? '#22C55E' : '#EF4444';

  useEffect(() => {
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [floatAnim, shimmerAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 400],
  });

  return (
    <Animated.View
      style={[
        styles.transactionCard,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      {}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          transform: [{ translateX: shimmerTranslateX }, { skewX: '-20deg' }],
        }}
      />

      <View style={styles.transactionRow}>
        <View style={styles.logoContainer}>{icon}</View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle}>{title}</Text>
          <Text style={styles.transactionSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[styles.transactionValue, { color: amountColor }]}>
            {amount}
          </Text>
          <Text style={styles.transactionTime}>{time}</Text>
        </View>
      </View>
    </Animated.View>
  );
};
