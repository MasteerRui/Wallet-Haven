import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Animated,
} from 'react-native';
import {
  ArrowDown2,
  Add,
  ArrowUp,
  ArrowDown,
  Chart2,
  Flag,
  ArrowUp2,
} from 'iconsax-react-nativejs';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { getUserData } from '../../utils/userUtils';
import walletService from '../../services/walletService';
import { useTranslation } from '../../hooks/useTranslation';

const backgroundImage = require('../../assets/images/backgrounds/main.png');

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface UserHeaderProps {
  userName?: string;
  accountName?: string;
  accountBalance?: number;
  currency_info?: Currency;
  totalReceived?: number;
  totalSpent?: number;
  onAccountSelectorPress?: () => void;
  balanceCardScale?: Animated.AnimatedInterpolation<string | number>;
  balanceCardTranslateY?: Animated.AnimatedInterpolation<string | number>;
  detailsOpacity?: Animated.AnimatedInterpolation<string | number>;
}

const UserHeader: React.FC<UserHeaderProps> = ({
  userName: propUserName,
  accountName: propAccountName,
  accountBalance: propAccountBalance,
  currency_info,
  totalReceived = 0,
  totalSpent = 0,
  onAccountSelectorPress,
  balanceCardScale,
  balanceCardTranslateY,
  detailsOpacity,
}) => {
  const { t } = useTranslation();
  const [userName, setUserName] = useState<string>(propUserName || 'Usuário');
  const [accountBalance, setAccountBalance] = useState<number>(
    propAccountBalance || 0,
  );
  const [selectedAccount, setSelectedAccount] = useState<string>(
    propAccountName || 'Conta Principal',
  );

  useEffect(() => {
    if (propAccountName) {
      setSelectedAccount(propAccountName);
    }
    if (propAccountBalance !== undefined) {
      setAccountBalance(propAccountBalance);
    }
    
    if (currency_info) {
    } else {
      console.warn('UserHeader: currency_info is undefined');
    }
  }, [propAccountName, propAccountBalance, currency_info]);

  const loadUserData = async () => {
    try {
      const userData = await getUserData();

      if (
        userData?.userName &&
        userData.userName !== 'User' &&
        userData.userName !== 'Usuario'
      ) {
        setUserName(userData.userName);
      } else {
        const storedEmail = userData?.email;
        if (storedEmail) {
          const emailUsername = storedEmail.split('@')[0];
          setUserName(emailUsername);
        } else {
        }
      }
    } catch (error) {
      console.error('❌ [UserHeader] Error getting user data:', error);
    }
  };

  useEffect(() => {
    if (!propUserName) {
      loadUserData();
    } else {
      
      setUserName(propUserName);
    }
  }, [propUserName]);

  useEffect(() => {
    if (!propUserName) {
      
      loadUserData();

      const timer = setTimeout(() => {
        loadUserData();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return t('home.goodMorning');
    } else if (hour < 18) {
      return t('home.goodAfternoon');
    } else {
      return t('home.goodEvening');
    }
  };

  const formatCurrency = (amount: number) => {
    if (!currency_info) {
      console.warn(
        'UserHeader: currency_info not provided, using EUR fallback',
      );
      
      return walletService.formatCurrency(amount, {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
      });
    }
    return walletService.formatCurrency(amount, currency_info);
  };

  const cleanUsername = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const avatarUrl = `https://www.tapback.co/api/avatar.webp`;

  return (
    <View style={styles.container}>
      {}
      <Animated.View
        style={[styles.topSection, { opacity: detailsOpacity || 1 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {}
      <Animated.View
        style={{
          transform: [
            { scale: balanceCardScale || 1 },
            { translateY: balanceCardTranslateY || 0 },
          ],
        }}
      >
        <ImageBackground
          source={backgroundImage}
          style={styles.balanceCard}
          imageStyle={styles.balanceCardImage}
          resizeMode="cover"
        >
          <View style={styles.balanceCardContent}>
            {}
            <TouchableOpacity
              style={styles.accountSelector}
              onPress={onAccountSelectorPress}
              activeOpacity={0.7}
            >
              <Text style={styles.accountName}>{selectedAccount}</Text>
            </TouchableOpacity>

            <Text style={styles.balanceLabel}>{t('home.accountBalance')}</Text>

            {}
            <Text style={styles.balanceAmount}>
              {formatCurrency(accountBalance)}
            </Text>

            {}
            <Animated.View style={styles.actionButtons}>
              <TouchableOpacity style={styles.statCard}>
                <View style={styles.innerStatCard}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: '#2A2D30' },
                    ]}
                  >
                    <ArrowUp2 size={14} color={'#68D391'} />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>
                      {formatCurrency(totalReceived)}
                    </Text>
                    <Text style={styles.statLabel}>{t('home.received')}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statCard}>
                <View style={styles.innerStatCard}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: '#2A2D30' },
                    ]}
                  >
                    <ArrowDown2 size={14} color={'#F56565'} />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>
                      {formatCurrency(totalSpent)}
                    </Text>
                    <Text style={styles.statLabel}>{t('home.spent')}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingTop: 0,
    paddingHorizontal: 0, 
  },
  topSection: {
    marginBottom: SIZES.paddingSmall,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: SIZES.fontMedium,
    fontWeight: '400',
    color: 'rgba(0, 0, 0, 0.6)',
    fontFamily: 'Open Sans',
    marginBottom: 2,
  },
  userName: {
    fontSize: 23,
    fontWeight: '700',
    color: COLORS.text,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3D3F41',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Open Sans',
  },
  balanceCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: SIZES.radiusExtraLarge,
    padding: 5,
    overflow: 'hidden', 
    ...SHADOWS.large,
  },
  balanceCardImage: {
    borderRadius: SIZES.radiusExtraLarge,
    top: 14,
    opacity: 0.4,
  },
  balanceCardContent: {
    padding: SIZES.padding, 
  },
  accountSelector: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3D3F41',
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: SIZES.paddingSmall,
    marginBottom: 4,
    paddingVertical: 6,
    shadowColor: 'rgba(255, 255, 255, 0.5)',
    shadowOffset: {
      width: 220,
      height: 2500,
    },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 3,
    top: -5,
  },
  accountName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.background,
    textAlign: 'center',
    fontFamily: 'Open Sans',
  },
  balanceAmount: {
    fontSize: 35,
    fontWeight: '600',
    color: COLORS.background,
    textAlign: 'center',
    marginBottom: SIZES.paddingSmall, 
    fontFamily: 'Open Sans',
    letterSpacing: 1,
  },
  balanceLabel: {
    fontSize: SIZES.fontSmall,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  statCard: {
    flex: 1,
    height: 50,
    backgroundColor: '#3D3F41',
    borderRadius: 14,
    padding: SIZES.paddingSmall,
    justifyContent: 'center',
  },
  innerStatCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    padding: 8,
    width: 32,
    height: 32,
  },
  statTextContainer: {
    flex: 1,
    justifyContent: 'space-between',
    height: 32,
    paddingVertical: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.background,
    fontFamily: 'Open Sans',
    lineHeight: 14,
    marginBottom: 0,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Open Sans',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
    lineHeight: 10,
    marginTop: 0,
  },
});

export default UserHeader;
