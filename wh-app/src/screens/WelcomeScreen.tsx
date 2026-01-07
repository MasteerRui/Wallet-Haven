import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, G, Defs, ClipPath, Rect } from 'react-native-svg';
import { ShoppingCart, MoneyRecive, Home2 } from 'iconsax-react-nativejs';
import {
  AnimatedTransactionCard,
  GradientBackground,
} from '../components/welcome';
import { welcomeStyles as styles } from '../styles/welcomeStyles';
import { COLORS } from '../constants/theme';
import SignUpScreen from './auth/SignUpScreen';
import SignInScreen from './auth/SignInScreen';
import GoogleSignInWebView from '../components/auth/GoogleSignInWebView';
import LinearGradient from 'react-native-linear-gradient';
import { Easing } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';

const { width } = Dimensions.get('window');

const initialTransactionList = [
  {
    icon: <ShoppingCart size={24} color={COLORS.primaryLight} variant="Bold" />,
    title: 'Grocery Store',
    subtitle: 'Shopping',
    time: '10:30',
    amount: '-€45.80',
    isIncome: false,
  },
  {
    icon: <MoneyRecive size={24} color={COLORS.primaryLight} variant="Bold" />,
    title: 'Monthly Salary',
    subtitle: 'Income',
    time: '09:00',
    amount: '+€5,432.00',
    isIncome: true,
  },
  {
    icon: <Home2 size={24} color={COLORS.primaryLight} variant="Bold" />,
    title: 'Water Bill',
    subtitle: 'Utilities',
    time: '14:20',
    amount: '-€68.50',
    isIncome: false,
  },
  {
    icon: <ShoppingCart size={24} color={COLORS.primaryLight} variant="Bold" />,
    title: 'Electronics Store',
    subtitle: 'Shopping',
    time: '16:45',
    amount: '-€299.99',
    isIncome: false,
  },
  {
    icon: <Home2 size={24} color={COLORS.primaryLight} variant="Bold" />,
    title: 'Electricity Bill',
    subtitle: 'Utilities',
    time: '11:10',
    amount: '-€42.30',
    isIncome: false,
  },
  {
    icon: <ShoppingCart size={24} color={COLORS.primaryLight} variant="Bold" />,
    title: "Fast Food",
    subtitle: 'Dining',
    time: '13:05',
    amount: '-€8.90',
    isIncome: false,
  },
  {
    icon: <MoneyRecive size={24} color={COLORS.primaryLight} variant="Bold" />,
    title: 'Bank Transfer',
    subtitle: 'Income',
    time: '18:20',
    amount: '+€120.00',
    isIncome: true,
  },
];
const CARD_HEIGHT = 80;
const CARD_MARGIN = 12; 
const TOTAL_CARD_HEIGHT = CARD_HEIGHT + CARD_MARGIN;

const baseList = [
  ...initialTransactionList,
  ...initialTransactionList,
  ...initialTransactionList,
  ...initialTransactionList,
];

const infiniteList = [...baseList, ...baseList, ...baseList];
const singleLoopHeight = TOTAL_CARD_HEIGHT * baseList.length;

interface WelcomeScreenProps {
  onAuthSuccess: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onAuthSuccess,
}) => {
  const { t } = useTranslation();

  const carouselData = [
    {
      title: t('welcome.carousel.aiTransaction.title'),
      highlight: t('welcome.carousel.aiTransaction.highlight'),
      description: t('welcome.carousel.aiTransaction.description'),
    },
    {
      title: t('welcome.carousel.management.title'),
      highlight: t('welcome.carousel.management.highlight'),
      description: t('welcome.carousel.management.description'),
    },
    {
      title: t('welcome.carousel.categories.title'),
      highlight: t('welcome.carousel.categories.highlight'),
      description: t('welcome.carousel.categories.description'),
    },
    {
      title: t('welcome.carousel.goals.title'),
      highlight: t('welcome.carousel.goals.highlight'),
      description: t('welcome.carousel.goals.description'),
    },
    {
      title: t('welcome.carousel.transactions.title'),
      highlight: t('welcome.carousel.transactions.highlight'),
      description: t('welcome.carousel.transactions.description'),
    },
    {
      title: t('welcome.carousel.security.title'),
      highlight: t('welcome.carousel.security.highlight'),
      description: t('welcome.carousel.security.description'),
    },
  ];
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSignUpSheet, setShowSignUpSheet] = useState(false);
  const [signUpMethod, setSignUpMethod] = useState<'none' | 'email' | 'google'>(
    'none',
  );
  const [showSignInScreen, setShowSignInScreen] = useState(false);
  const [showSignUpScreen, setShowSignUpScreen] = useState(false);
  const [showGoogleWebView, setShowGoogleWebView] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const dotPosition = Animated.divide(scrollX, width);

  useEffect(() => {
    const interval = setInterval(() => {
      const newIndex =
        activeIndex === carouselData.length - 1 ? 0 : activeIndex + 1;

      scrollViewRef.current?.scrollTo({
        x: newIndex * width,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [activeIndex]);

  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      scrollAnim.setValue(0);

      Animated.timing(scrollAnim, {
        toValue: singleLoopHeight,
        duration: singleLoopHeight * 25, 
        useNativeDriver: true,
        easing: Easing.linear,
      }).start(({ finished }) => {
        if (finished) {
          animate(); 
        }
      });
    };

    animate();

    return () => {
      scrollAnim.stopAnimation();
    };
  }, []);

  const { height: windowHeight } = Dimensions.get('window');
  const STATUSBAR_HEIGHT = 44;
  const TOP_PADDING = 24;
  const CAROUSEL_HEIGHT = 220;
  const transactionsContainerHeight =
    windowHeight - CAROUSEL_HEIGHT - STATUSBAR_HEIGHT - TOP_PADDING;

  const SHEET_HEIGHT_PERCENT = 0.35;
  const SHEET_HEIGHT = windowHeight * SHEET_HEIGHT_PERCENT;

  const signUpSheetFadeAnim = useRef(new Animated.Value(0)).current;
  const signUpSheetSlideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current; 

  const openSignUpSheet = () => {
    setShowSignUpSheet(true);
    signUpSheetFadeAnim.setValue(0);
    signUpSheetSlideAnim.setValue(SHEET_HEIGHT);
    Animated.parallel([
      Animated.timing(signUpSheetFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(signUpSheetSlideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCloseSignUpSheet = (onComplete?: () => void) => {
    Animated.parallel([
      Animated.timing(signUpSheetFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(signUpSheetSlideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSignUpSheet(false);
      setSignUpMethod('none');
      if (onComplete) {
        onComplete();
      }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#000000" />
      <GradientBackground />

      {}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 115,
          backgroundColor: 'transparent',
          zIndex: 2,
          pointerEvents: 'none',
          width: '100%',
        }}
      >
        <LinearGradient
          colors={[
            'rgba(249,250,251,1)',
            'rgba(249,250,251,0.8)',
            'rgba(249,250,251,0.6)',
            'rgba(249,250,251,0.3)',
            'rgba(249,250,251,0.1)',
          ]}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            transform: [{ rotate: '180deg' }],
          }}
          pointerEvents="none"
        />
      </View>

      <View style={styles.contentContainer}>
        {}
        <View style={styles.transactionsContainer}>
          <View
            style={{
              height: transactionsContainerHeight,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    translateY: scrollAnim.interpolate({
                      inputRange: [0, singleLoopHeight],
                      outputRange: [0, -singleLoopHeight],
                    }),
                  },
                ],
              }}
            >
              {}
              {infiniteList.map((item, idx) => {
                return (
                  <View
                    key={`transaction-${idx}`}
                    style={{
                      height: CARD_HEIGHT,
                      marginBottom: CARD_MARGIN,
                    }}
                  >
                    <AnimatedTransactionCard
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      time={item.time}
                      amount={item.amount}
                      isIncome={item.isIncome}
                    />
                  </View>
                );
              })}
            </Animated.View>

            {}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 35,
                backgroundColor: 'transparent',
                zIndex: 2,
                pointerEvents: 'none',
                width: '100%',
              }}
            >
              <LinearGradient
                colors={[
                  'rgba(249,250,251,0.1)',
                  'rgba(249,250,251,0.3)',
                  'rgba(249,250,251,0.6)',
                  'rgba(249,250,251,0.8)',
                  'rgba(249,250,251,1)',
                ]}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                }}
                pointerEvents="none"
              />
            </View>
          </View>
        </View>

        {}
        <View style={styles.bottomContainer}>
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false },
            )}
            onMomentumScrollEnd={event => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const newIndex = Math.round(offsetX / width);
              setActiveIndex(newIndex);
            }}
            scrollEventThrottle={16}
            style={styles.carousel}
          >
            {carouselData.map((item, index) => (
              <View key={`slide-${index}`} style={styles.slide}>
                <View style={styles.headerContainer}>
                  <Text style={styles.headerText}>{item.title}</Text>
                  <View style={styles.highlightBox}>
                    <Text style={styles.highlightText}>{item.highlight}</Text>
                  </View>
                </View>
                <Text style={styles.subHeaderText}>{item.description}</Text>
              </View>
            ))}
          </Animated.ScrollView>

          {}
          <View style={styles.paginationContainer}>
            {carouselData.map((_, index) => {
              const opacity = dotPosition.interpolate({
                inputRange: [index - 1, index, index + 1],
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });

              const dotWidth = dotPosition.interpolate({
                inputRange: [index - 1, index, index + 1],
                outputRange: [8, 24, 8],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={`dot-${index}`}
                  style={[
                    styles.paginationDot,
                    { opacity, width: dotWidth },
                    { marginLeft: index > 0 ? 8 : 0 },
                  ]}
                />
              );
            })}
          </View>

          {}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => setShowSignInScreen(true)}
            >
              <Text style={styles.signInButtonText}>{t('welcome.signIn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpButtonContainer}
              onPress={openSignUpSheet}
            >
              <View
                style={[
                  styles.signUpButton,
                  { backgroundColor: COLORS.primaryLight },
                ]}
              >
                <Text style={styles.signUpButtonText}>{t('welcome.start')}</Text>
                <View style={styles.arrowContainer}>
                  <Svg height="14" width="14" viewBox="0 0 24 24">
                    <Path
                      d="M5 12h14M12 5l7 7-7 7"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {}
      <SignInScreen
        isVisible={showSignInScreen}
        onClose={() => setShowSignInScreen(false)}
        onSuccess={onAuthSuccess}
      />

      {}
      <Modal
        visible={showSignUpSheet}
        animationType="none"
        transparent
        onRequestClose={() => setShowSignUpSheet(false)}
      >
        <Animated.View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.5)',
                opacity: signUpSheetFadeAnim,
              },
            ]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => handleCloseSignUpSheet()}
          />
          {}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: SHEET_HEIGHT, 
              backgroundColor: '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 8,
              transform: [{ translateY: signUpSheetSlideAnim }],
            }}
          >
            {signUpMethod === 'none' && (
              <>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    marginBottom: 24,
                    textAlign: 'center',
                  }}
                >
                  {t('welcome.howToCreateAccount')}
                </Text>
                {}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#1A1A1A',
                    borderRadius: 16,
                    height: 56,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                    marginBottom: 8,
                  }}
                  onPress={() => {
                    handleCloseSignUpSheet(() => {
                      setShowSignUpScreen(true);
                    });
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg
                      width={24}
                      height={24}
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ marginRight: 10 }}
                    >
                      <G clipPath="url(#clip0_4418_3415)">
                        <Path
                          d="M18.8699 18.0003C19.8199 17.2903 20.5999 15.7403 20.5999 14.5603V7.13033C20.5999 5.90033 19.6599 4.54031 18.5099 4.11031L13.5199 2.24031C12.6899 1.93031 11.3299 1.93031 10.4999 2.24031L5.50992 4.11031C4.35992 4.54031 3.41992 5.90033 3.41992 7.13033V14.5603C3.41992 15.7403 4.1999 17.2903 5.1499 18.0003L9.44992 21.2103C10.8599 22.2703 13.1799 22.2703 14.5899 21.2103L15.3299 20.6503"
                          stroke="#fff"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <Path
                          d="M12.0002 10.9204C11.9602 10.9204 11.9102 10.9204 11.8702 10.9204C10.9302 10.8904 10.1802 10.1104 10.1802 9.1604C10.1802 8.1904 10.9702 7.40039 11.9402 7.40039C12.9102 7.40039 13.7002 8.1904 13.7002 9.1604C13.6902 10.1204 12.9402 10.8904 12.0002 10.9204Z"
                          stroke="#fff"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <Path
                          d="M10.01 13.7213C9.05004 14.3613 9.05004 15.4113 10.01 16.0513C11.1 16.7813 12.89 16.7813 13.98 16.0513C14.94 15.4113 14.94 14.3613 13.98 13.7213C12.9 12.9913 11.11 12.9913 10.01 13.7213Z"
                          stroke="#fff"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </G>
                      <Defs>
                        <ClipPath id="clip0_4418_3415">
                          <Rect width={24} height={24} fill="#fff" />
                        </ClipPath>
                      </Defs>
                    </Svg>
                    <Text
                      style={{
                        fontWeight: 'bold',
                        fontSize: 16,
                        color: '#fff',
                      }}
                    >
                      {t('welcome.continueWithEmail')}
                    </Text>
                  </View>
                </TouchableOpacity>

                {}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginVertical: 8,
                  }}
                >
                  <View
                    style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }}
                  />
                  <Text
                    style={{
                      marginHorizontal: 12,
                      color: '#9CA3AF',
                      fontSize: 14,
                      fontWeight: '500',
                    }}
                  >
                    {t('welcome.or')}
                  </Text>
                  <View
                    style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }}
                  />
                </View>

                {}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#fff',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    borderRadius: 16,
                    height: 56,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 0,
                    marginTop: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                  onPress={() => {
                    handleCloseSignUpSheet(() => {
                      setShowGoogleWebView(true);
                    });
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg
                      width={24}
                      height={24}
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ marginRight: 10 }}
                    >
                      <G clipPath="url(#clip0_4418_4086)">
                        <Path
                          d="M3.26922 7.51025C2.58922 8.87025 2.19922 10.3902 2.19922 12.0002C2.19922 13.6102 2.58922 15.1302 3.26922 16.4902L3.27922 16.4803V16.4902C4.91922 19.7602 8.28922 22.0002 12.1992 22.0002C14.8992 22.0002 17.1692 21.1102 18.8192 19.5802C20.7092 17.8402 21.7992 15.2702 21.7992 12.2202C21.7992 11.4002 21.7292 10.8002 21.5892 10.1802H12.1992V13.8903H17.7092C17.5992 14.8103 16.9992 16.2002 15.6692 17.1302C14.8292 17.7202 13.6892 18.1302 12.1992 18.1302C9.55922 18.1302 7.30922 16.3902 6.50922 13.9702C6.29922 13.3502 6.17922 12.6802 6.17922 11.9902C6.17922 11.3002 6.29922 10.6303 6.49922 10.0103C6.55922 9.83025 6.62922 9.64025 6.70922 9.47025C7.65922 7.34025 9.75922 5.86023 12.1992 5.86023C14.0792 5.86023 15.3392 6.67025 16.0692 7.35025L18.8892 4.59024C17.1592 2.98024 14.8992 1.99023 12.1992 1.99023C10.0492 1.99023 8.05922 2.67025 6.42922 3.82025"
                          stroke="#1A1A1A"
                          strokeWidth={1.5}
                          strokeMiterlimit={10}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </G>
                      <Defs>
                        <ClipPath id="clip0_4418_4086">
                          <Rect width={24} height={24} fill="#fff" />
                        </ClipPath>
                      </Defs>
                    </Svg>
                    <Text
                      style={{
                        fontWeight: 'bold',
                        fontSize: 16,
                        color: '#1A1A1A',
                      }}
                    >
                      {t('welcome.continueWithGoogle')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
            {
              signUpMethod === 'email' &&
                false 
            }
          </Animated.View>
        </Animated.View>
      </Modal>

      <SignUpScreen
        isVisible={showSignUpScreen}
        onClose={() => {
          setShowSignUpScreen(false);
          setSignUpMethod('none');
        }}
        onSuccess={onAuthSuccess}
      />

      {}
      <GoogleSignInWebView
        isVisible={showGoogleWebView}
        onClose={() => setShowGoogleWebView(false)}
        onSuccess={onAuthSuccess}
      />
    </View>
  );
};
