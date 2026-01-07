import React, { useState, useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  TouchableOpacity,
  PanResponder,
  Dimensions,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  Home,
  MessageText,
  Setting2,
} from 'iconsax-react-nativejs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeTab from '../screens/tabs/HomeTab';
import GoalsTab from '../screens/tabs/GoalsTab';
import AddTransactionTab from '../screens/tabs/AddTransactionTab';
import TransactionsTab from '../screens/tabs/TransactionsTab';
import MoreTab from '../screens/tabs/MoreTab';
import SettingsTab from '../screens/tabs/SettingsTab';

import FloatingActionMenu, {
  CustomTabBarButton,
} from '../components/navigation/FloatingActionMenu';
import AddTransactionSheet from '../components/transaction/AddTransactionSheet';
import InvoiceEditSheet from '../components/invoice/InvoiceEditSheet';
import CategoryIcon from '../components/common/CategoryIcon';

import { COLORS, SIZES } from '../constants/theme';

import { useTranslation } from '../hooks/useTranslation';

import ocraiService, { OcraiResult } from '../services/ocraiService';

const Tab = createBottomTabNavigator();

interface BottomTabNavigatorProps {
  onSignOut?: () => void;
}

const BottomTabNavigator: React.FC<BottomTabNavigatorProps> = ({
  onSignOut,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransactionSheetVisible, setIsTransactionSheetVisible] =
    useState(false);
  const [transactionType, setTransactionType] = useState<
    'income' | 'expense' | 'transfer'
  >('expense');
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const [pendingResults, setPendingResults] = useState<OcraiResult[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingSheetVisible, setPendingSheetVisible] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const alertTranslateX = useRef(new Animated.Value(0)).current;
  const alertOpacity = useRef(new Animated.Value(1)).current;
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  const refreshHomeDataRef = useRef<(() => void) | null>(null);

  const loadPending = async () => {
    try {
      setPendingLoading(true);
      const result = await ocraiService.getPending();

      if (result.success && result.data) {
        const newCount = result.data.count || 0;
        const results = result.data.results || [];

        setPendingCount(newCount);
        setPendingResults(results);

        results.forEach((result, index) => {
        });
      } else {
        setPendingCount(0);
        setPendingResults([]);
      }
    } catch (error) {
      console.error('❌ Error loading pending receipts:', error);
      setPendingCount(0);
      setPendingResults([]);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadPending();
    }, []),
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10
        );
      },
      onPanResponderMove: (_evt, gestureState) => {
        
        if (gestureState.dx > 0) {
          alertTranslateX.setValue(gestureState.dx);
          
          const opacity = Math.max(0, 1 - gestureState.dx / SCREEN_WIDTH);
          alertOpacity.setValue(opacity);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const swipeThreshold = SCREEN_WIDTH * 0.3; 
        const shouldDismiss =
          gestureState.dx > swipeThreshold || gestureState.vx > 0.5;

        if (shouldDismiss) {
          
          Animated.parallel([
            Animated.timing(alertTranslateX, {
              toValue: SCREEN_WIDTH,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(alertOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setIsAlertDismissed(true);
          });
        } else {
          
          Animated.parallel([
            Animated.spring(alertTranslateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 50,
              friction: 7,
            }),
            Animated.spring(alertOpacity, {
              toValue: 1,
              useNativeDriver: true,
              tension: 50,
              friction: 7,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (pendingCount > 0 && isAlertDismissed) {
      setIsAlertDismissed(false);
      alertTranslateX.setValue(0);
      alertOpacity.setValue(1);
    }
  }, [pendingCount, isAlertDismissed, alertTranslateX, alertOpacity]);

  useEffect(() => {
    Animated.timing(backdropOpacity, {
      toValue: isMenuOpen ? 1 : 0,
      duration: isMenuOpen ? 260 : 200,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen]);

  const handleToggleMenu = () => {
    const next = !isMenuOpen;
    setIsMenuOpen(next);

    if (!isMenuOpen) {

      ReactNativeHapticFeedback.trigger('impactMedium', {
        enableVibrateFallback: false, 
        ignoreAndroidSystemSettings: false,
      });
    }
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {}
      {isMenuOpen && (
        <TouchableWithoutFeedback onPress={handleCloseMenu}>
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)', 
              opacity: backdropOpacity,
              zIndex: 11,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: COLORS.tabBarActive,
          tabBarInactiveTintColor: COLORS.tabBarInactive,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: COLORS.tabBarBackground,
            borderTopWidth: 1,
            borderTopColor: COLORS.tabBarBorder,
            height: Platform.OS === 'ios' ? 88 : 68,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 4,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          options={{
            tabBarLabel: t('navigation.home'),
            tabBarIcon: ({ focused, color, size }) => (
              <Home
                size={size}
                color={color}
                variant={focused ? 'Bold' : 'Linear'}
              />
            ),
          }}
        >
          {() => (
            <HomeTab
              onRegisterRefresh={refreshFn => {
                refreshHomeDataRef.current = refreshFn;
              }}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="Transações"
          component={TransactionsTab}
          options={{
            tabBarLabel: t('navigation.transactions'),
            tabBarIcon: ({ focused, color, size }) => (
              <MessageText
                size={size}
                color={color}
                variant={focused ? 'Bold' : 'Linear'}
              />
            ),
          }}
        />
        <Tab.Screen
          name="AddTransaction"
          component={AddTransactionTab}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => null,
            tabBarButton: () => (
              <View
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  backgroundColor: 'transparent',
                }}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Goals"
          component={GoalsTab}
          options={{
            tabBarLabel: t('navigation.goals'),
            tabBarIcon: ({ focused, color, size }) => (
              <CategoryIcon
                iconName="Target"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          options={{
            tabBarLabel: t('navigation.settings'),
            tabBarIcon: ({ focused, color, size }) => (
              <Setting2
                size={size}
                color={color}
                variant={focused ? 'Bold' : 'Linear'}
              />
            ),
          }}
        >
          {() => <SettingsTab onSignOut={onSignOut} />}
        </Tab.Screen>
      </Tab.Navigator>

      {}
      <View
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 34 : 34,
          left: '50%',
          marginLeft: -34,
          zIndex: 20,
          elevation: 20,
        }}
        pointerEvents="box-none"
      >
        <CustomTabBarButton
          onPress={handleToggleMenu}
          isMenuOpen={isMenuOpen}
        />
      </View>

      <FloatingActionMenu
        isVisible={isMenuOpen}
        onClose={handleCloseMenu}
        onOpenTransaction={type => {
          setTransactionType(type);
          setIsTransactionSheetVisible(true);
        }}
      />

      <AddTransactionSheet
        isVisible={isTransactionSheetVisible}
        onClose={() => setIsTransactionSheetVisible(false)}
        transactionType={transactionType}
        onTransactionCreated={() => {

          if (
            refreshHomeDataRef.current &&
            typeof refreshHomeDataRef.current === 'function'
          ) {
            refreshHomeDataRef.current();
          } else {
          }
        }}
      />

      {}
      {pendingCount > 0 && !isAlertDismissed && (
        <Animated.View
          style={{
            position: 'absolute',
            left: SIZES.padding,
            right: SIZES.padding,
            bottom: (Platform.OS === 'ios' ? 58 : 68) + insets.bottom + 8, 
            zIndex: isMenuOpen ? 10 : 30, 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: isMenuOpen ? 5 : 8,
            transform: [{ translateX: alertTranslateX }],
            opacity: alertOpacity,
          }}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            activeOpacity={0.85}
            onPress={async () => {

              await loadPending();
              setPendingSheetVisible(true);
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <CategoryIcon iconName="FileCheck" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: SIZES.fontSmall,
                  fontWeight: '600',
                  color: '#FFFFFF',
                }}
                numberOfLines={1}
              >
                {pendingCount}{' '}
                {pendingCount === 1
                  ? t('invoice.pendingReceipt')
                  : t('invoice.pendingReceipts')}
              </Text>
              <Text
                style={{
                  fontSize: SIZES.fontTiny,
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {pendingLoading ? t('invoice.loading') : t('invoice.tapToReview')}
              </Text>
            </View>
            <View style={{ marginLeft: 6, opacity: 0.7 }}>
              <CategoryIcon
                iconName="ChevronRight"
                size={18}
                color="rgba(255, 255, 255, 0.7)"
              />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {}
      <InvoiceEditSheet
        isVisible={pendingSheetVisible}
        onClose={() => setPendingSheetVisible(false)}
        ocraiResults={pendingResults as any}
        onTransactionCreated={() => {
          
          loadPending();
          if (
            refreshHomeDataRef.current &&
            typeof refreshHomeDataRef.current === 'function'
          ) {
            refreshHomeDataRef.current();
          }
        }}
      />
    </>
  );
};

export default BottomTabNavigator;
