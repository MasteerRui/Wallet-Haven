import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Text,
} from 'react-native';
import { Scan } from 'iconsax-react-nativejs';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react-native';
import Svg, { Path, G } from 'react-native-svg';
import { COLORS, SHADOWS } from '../../constants/theme';
import ScanInvoiceModal from '../invoice/ScanInvoiceModal';
import { useTranslation } from '../../hooks/useTranslation';

const TransferIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.00999 20.5002L3.98999 15.4902"
      stroke={color}
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9.01001 3.5V20.5"
      stroke={color}
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <G opacity="0.4">
      <Path
        d="M14.9902 3.5L20.0102 8.51"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.9902 20.5V3.5"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

interface CustomTabBarButtonProps {
  onPress: () => void;
  isMenuOpen?: boolean;
}

export const CustomTabBarButton: React.FC<CustomTabBarButtonProps> = ({
  onPress,
  isMenuOpen = false,
}) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: isMenuOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <TouchableOpacity
      style={tabButtonStyles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={tabButtonStyles.button}>
        <Animated.View
          style={{
            transform: [{ rotate: rotateInterpolate }],
          }}
        >
          <Plus size={22} color="#FFFFFF" strokeWidth={2} />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

interface FloatingActionMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenTransaction: (type: 'income' | 'expense' | 'transfer') => void;
}

const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
  isVisible,
  onClose,
  onOpenTransaction,
}) => {
  const { t } = useTranslation();
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);

  const button1Y = useRef(new Animated.Value(0)).current;
  const button2Y = useRef(new Animated.Value(0)).current;
  const button3Y = useRef(new Animated.Value(0)).current;
  const button4Y = useRef(new Animated.Value(0)).current;

  const button1Opacity = useRef(new Animated.Value(0)).current;
  const button2Opacity = useRef(new Animated.Value(0)).current;
  const button3Opacity = useRef(new Animated.Value(0)).current;
  const button4Opacity = useRef(new Animated.Value(0)).current;

  const button1Scale = useRef(new Animated.Value(0.8)).current;
  const button2Scale = useRef(new Animated.Value(0.8)).current;
  const button3Scale = useRef(new Animated.Value(0.8)).current;
  const button4Scale = useRef(new Animated.Value(0.8)).current;

  const button1Width = useRef(new Animated.Value(40)).current;
  const button2Width = useRef(new Animated.Value(40)).current;
  const button3Width = useRef(new Animated.Value(40)).current;
  const button4Width = useRef(new Animated.Value(40)).current;

  const text1Opacity = useRef(new Animated.Value(0)).current;
  const text2Opacity = useRef(new Animated.Value(0)).current;
  const text3Opacity = useRef(new Animated.Value(0)).current;
  const text4Opacity = useRef(new Animated.Value(0)).current;

  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (isVisible) {
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }

      button1Y.stopAnimation(() => button1Y.setValue(0));
      button2Y.stopAnimation(() => button2Y.setValue(0));
      button3Y.stopAnimation(() => button3Y.setValue(0));
      button4Y.stopAnimation(() => button4Y.setValue(0));
      button1Opacity.stopAnimation(() => button1Opacity.setValue(0));
      button2Opacity.stopAnimation(() => button2Opacity.setValue(0));
      button3Opacity.stopAnimation(() => button3Opacity.setValue(0));
      button4Opacity.stopAnimation(() => button4Opacity.setValue(0));
      button1Scale.stopAnimation(() => button1Scale.setValue(0.8));
      button2Scale.stopAnimation(() => button2Scale.setValue(0.8));
      button3Scale.stopAnimation(() => button3Scale.setValue(0.8));
      button4Scale.stopAnimation(() => button4Scale.setValue(0.8));
      button1Width.stopAnimation(() => button1Width.setValue(40));
      button2Width.stopAnimation(() => button2Width.setValue(40));
      button3Width.stopAnimation(() => button3Width.setValue(40));
      button4Width.stopAnimation(() => button4Width.setValue(40));
      text1Opacity.stopAnimation(() => text1Opacity.setValue(0));
      text2Opacity.stopAnimation(() => text2Opacity.setValue(0));
      text3Opacity.stopAnimation(() => text3Opacity.setValue(0));
      text4Opacity.stopAnimation(() => text4Opacity.setValue(0));

      animationTimeoutRef.current = setTimeout(() => {
        
        const spacing = 56;

        Animated.stagger(50, [
          
          Animated.sequence([
            Animated.parallel([
              Animated.timing(button1Y, {
                toValue: -spacing * 1,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(button1Opacity, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(button1Scale, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(button1Width, {
                toValue: 160,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
              }),
              Animated.timing(text1Opacity, {
                toValue: 1,
                duration: 150,
                delay: 30,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
          ]),
          
          Animated.sequence([
            Animated.parallel([
              Animated.timing(button2Y, {
                toValue: -spacing * 2,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(button2Opacity, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(button2Scale, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(button2Width, {
                toValue: 160,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
              }),
              Animated.timing(text2Opacity, {
                toValue: 1,
                duration: 150,
                delay: 30,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
          ]),
          
          Animated.sequence([
            Animated.parallel([
              Animated.timing(button3Y, {
                toValue: -spacing * 3,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(button3Opacity, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(button3Scale, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(button3Width, {
                toValue: 160,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
              }),
              Animated.timing(text3Opacity, {
                toValue: 1,
                duration: 150,
                delay: 30,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
          ]),
          
          Animated.sequence([
            Animated.parallel([
              Animated.timing(button4Y, {
                toValue: -spacing * 4,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(button4Opacity, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(button4Scale, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(button4Width, {
                toValue: 160,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
              }),
              Animated.timing(text4Opacity, {
                toValue: 1,
                duration: 150,
                delay: 30,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]).start();
        animationTimeoutRef.current = null;
      }, 40);
    } else {
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }

      Animated.parallel([
        Animated.timing(button1Y, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(button2Y, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(button3Y, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(button4Y, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(button1Opacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(button2Opacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(button3Opacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(button4Opacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(button1Scale, {
          toValue: 0.8,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(button2Scale, {
          toValue: 0.8,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(button3Scale, {
          toValue: 0.8,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(button4Scale, {
          toValue: 0.8,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(button1Width, {
          toValue: 40,
          duration: 120,
          useNativeDriver: false,
        }),
        Animated.timing(button2Width, {
          toValue: 40,
          duration: 120,
          useNativeDriver: false,
        }),
        Animated.timing(button3Width, {
          toValue: 40,
          duration: 120,
          useNativeDriver: false,
        }),
        Animated.timing(button4Width, {
          toValue: 40,
          duration: 120,
          useNativeDriver: false,
        }),
        Animated.timing(text1Opacity, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(text2Opacity, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(text3Opacity, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(text4Opacity, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      button1Y.stopAnimation();
      button2Y.stopAnimation();
      button3Y.stopAnimation();
      button4Y.stopAnimation();
      button1Opacity.stopAnimation();
      button2Opacity.stopAnimation();
      button3Opacity.stopAnimation();
      button4Opacity.stopAnimation();
      button1Scale.stopAnimation();
      button2Scale.stopAnimation();
      button3Scale.stopAnimation();
      button4Scale.stopAnimation();
      button1Width.stopAnimation();
      button2Width.stopAnimation();
      button3Width.stopAnimation();
      button4Width.stopAnimation();
      text1Opacity.stopAnimation();
      text2Opacity.stopAnimation();
      text3Opacity.stopAnimation();
      text4Opacity.stopAnimation();
    };
  }, [isVisible]);

  const handleAction = (action: string) => {

    if (action === 'scan-invoice') {
      setIsScanModalVisible(true);
    } else if (action === 'expense') {
      onOpenTransaction('expense');
    } else if (action === 'income') {
      onOpenTransaction('income');
    } else if (action === 'transfer') {
      onOpenTransaction('transfer');
    }

    onClose();
  };

  return (
    <>
      {isVisible && (
        <View style={styles.container} pointerEvents="box-none">
          <View style={styles.buttonsContainer} pointerEvents="box-none">
            {}
            <Animated.View
              style={[
                styles.floatingButton,
                {
                  opacity: button1Opacity,
                  transform: [
                    { translateY: button1Y },
                    { scale: button1Scale },
                  ],
                },
              ]}
            >
              <Animated.View style={{ width: button1Width }}>
                <TouchableOpacity
                  style={[styles.actionButton, { overflow: 'hidden' }]}
                  onPress={() => handleAction('scan-invoice')}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Animated.View style={{ opacity: text1Opacity }}>
                      <Scan size={20} color="#FFFFFF" variant="Bold" />
                    </Animated.View>
                    <Animated.Text
                      style={[styles.buttonText, { opacity: text1Opacity }]}
                      numberOfLines={1}
                    >
                      {t('invoice.scanInvoice')}
                    </Animated.Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {}
            <Animated.View
              style={[
                styles.floatingButton,
                {
                  opacity: button2Opacity,
                  transform: [
                    { translateY: button2Y },
                    { scale: button2Scale },
                  ],
                },
              ]}
            >
              <Animated.View style={{ width: button2Width }}>
                <TouchableOpacity
                  style={[styles.actionButton, { overflow: 'hidden' }]}
                  onPress={() => handleAction('expense')}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Animated.View style={{ opacity: text2Opacity }}>
                      <TrendingDown size={18} color="#FFFFFF" strokeWidth={2} />
                    </Animated.View>
                    <Animated.Text
                      style={[styles.buttonText, { opacity: text2Opacity }]}
                      numberOfLines={1}
                    >
                      {t('transactions.addExpense')}
                    </Animated.Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {}
            <Animated.View
              style={[
                styles.floatingButton,
                {
                  opacity: button3Opacity,
                  transform: [
                    { translateY: button3Y },
                    { scale: button3Scale },
                  ],
                },
              ]}
            >
              <Animated.View style={{ width: button3Width }}>
                <TouchableOpacity
                  style={[styles.actionButton, { overflow: 'hidden' }]}
                  onPress={() => handleAction('income')}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Animated.View style={{ opacity: text3Opacity }}>
                      <TrendingUp size={18} color="#FFFFFF" strokeWidth={2} />
                    </Animated.View>
                    <Animated.Text
                      style={[styles.buttonText, { opacity: text3Opacity }]}
                      numberOfLines={1}
                    >
                      {t('transactions.addIncome')}
                    </Animated.Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {}
            <Animated.View
              style={[
                styles.floatingButton,
                {
                  opacity: button4Opacity,
                  transform: [
                    { translateY: button4Y },
                    { scale: button4Scale },
                  ],
                },
              ]}
            >
              <Animated.View style={{ width: button4Width }}>
                <TouchableOpacity
                  style={[styles.actionButton, { overflow: 'hidden' }]}
                  onPress={() => handleAction('transfer')}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Animated.View
                      style={{
                        opacity: text4Opacity,
                        transform: [{ rotate: '90deg' }],
                      }}
                    >
                      <TransferIcon size={20} color="#FFFFFF" />
                    </Animated.View>
                    <Animated.Text
                      style={[styles.buttonText, { opacity: text4Opacity }]}
                      numberOfLines={1}
                    >
                      {t('transactions.transfer')}
                    </Animated.Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </View>
        </View>
      )}

      {}
      <ScanInvoiceModal
        isVisible={isScanModalVisible}
        onClose={() => setIsScanModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100, 
    overflow: 'hidden', 
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 42,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 100, 
    elevation: 100, 
    overflow: 'visible', 
  },
  floatingButton: {
    position: 'absolute',
    bottom: 0,
  },
  actionButton: {
    minWidth: 40,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.text,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    ...SHADOWS.medium,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

const tabButtonStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 68,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.text,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default FloatingActionMenu;
