import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  Platform,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../../constants/theme';
import UserHeader from '../../components/home/UserHeader';
import AccountSelectorSheet from '../../components/home/AccountSelectorSheet';
import PullToRefresh from '../../components/common/PullToRefresh';
import dashboardService, {
  DashboardData,
} from '../../services/dashboardService';
import walletService, { Wallet } from '../../services/walletService';
import transactionService from '../../services/transactionService';
import InvoiceEditSheet from '../../components/invoice/InvoiceEditSheet';
import CategoryIcon from '../../components/common/CategoryIcon';
import SkeletonHomeLoading from '../../components/common/SkeletonLoader';
import SkeletonTransactionsLoading from '../../components/common/SkeletonTransactionsLoader';
import EmptyState from '../../components/common/EmptyState';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';
import Svg, { Path, G } from 'react-native-svg';
import TransactionDetailSheet from '../../components/transaction/TransactionDetailSheet';
import AddTransactionSheet from '../../components/transaction/AddTransactionSheet';

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

const backgroundImage = require('../../assets/images/backgrounds/main.png');

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
  type: 'checking' | 'savings' | 'card';
  color: string;
  currency_info?: Currency;
}

interface HomeTabProps {
  onRegisterRefresh?: (refreshFunction: () => void) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ onRegisterRefresh }) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();
  const [isAccountSelectorVisible, setIsAccountSelectorVisible] =
    useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account>({
    id: '1',
    name: 'Conta Principal',
    balance: 0,
    type: 'checking',
    color: COLORS.primary,
    currency_info: { code: 'EUR', name: 'Euro', symbol: '€' },
  });
  const [userName, setUserName] = useState<string>('Usuário');

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPullingToRefresh, setIsPullingToRefresh] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollYValue = useRef(0); 
  const HEADER_MAX_HEIGHT = 310;
  const HEADER_MIN_HEIGHT = 230;
  const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
  const [statusBarStyle, setStatusBarStyle] = useState<
    'light-content' | 'dark-content'
  >('dark-content');

  const [selectedCurrencyInfo, setSelectedCurrencyInfo] = useState<{
    code: string;
    name: string;
    symbol: string;
  } | null>(null);

  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);

  const [showAddTransactionSheet, setShowAddTransactionSheet] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null);

  const formatCurrency = (
    amount: number,
    currencyInfo?: { code: string; name: string; symbol: string },
  ): string => {
    return walletService.formatCurrency(
      amount,
      currencyInfo || selectedCurrencyInfo || undefined,
    );
  };

  const hasLoadedInitially = useRef(false);
  
  const selectedWalletIdRef = useRef<string>('');
  
  const isSelectingWallet = useRef(false);

  const loadSavedWalletId = async (): Promise<number | undefined> => {
    try {
      const savedInfo = await walletService.getSavedWalletInfo();
      if (savedInfo?.id) {
        return parseInt(savedInfo.id);
      }
      return undefined;
    } catch (error) {
      console.error('Error loading saved wallet ID:', error);
      return undefined;
    }
  };

  const saveWalletSelection = async (wallet: Wallet) => {
    try {
      await walletService.saveWalletInfo(wallet);
      if (wallet.currency_info) {
        setSelectedCurrencyInfo(wallet.currency_info);
      }
    } catch (error) {
      console.error('Error saving wallet selection:', error);
    }
  };

  useEffect(() => {
    
    const timer = setTimeout(() => {
      loadDashboard();
      hasLoadedInitially.current = true;
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useFocusEffect(
    React.useCallback(() => {

      const currentScrollY = scrollYValue.current;

      const updateStatusBar = (value: number) => {
        if (isPullingToRefresh) {
          setStatusBarStyle('light-content');
        } else if (value > HEADER_SCROLL_DISTANCE + 80) {
          setStatusBarStyle('light-content');
        } else if (value > HEADER_SCROLL_DISTANCE * 0.2) {
          setStatusBarStyle('light-content');
        } else {
          setStatusBarStyle('dark-content');
        }
      };

      updateStatusBar(currentScrollY);

      const listenerId = scrollY.addListener(({ value }) => {
        scrollYValue.current = value;
        updateStatusBar(value);
      });

      if (hasLoadedInitially.current && !isSelectingWallet.current) {
        
        const timer = setTimeout(() => {
          
          if (!isSelectingWallet.current) {
            
            silentRefresh();
          }
        }, 500); 

        return () => {
          clearTimeout(timer);
          scrollY.removeListener(listenerId);
        };
      }

      return () => {
        scrollY.removeListener(listenerId);
      };
    }, [HEADER_SCROLL_DISTANCE, isPullingToRefresh]),
  );

  const loadDashboard = async (
    preserveSelection: boolean = false,
    preserveAccountName: boolean = false,
    silent: boolean = false,
  ) => {

    const isInitialLoad = !dashboardData && !silent;

    try {

      if (isInitialLoad) {
        setLoading(true);
      }

      let walletIdToLoad: number | undefined;
      if (!preserveSelection) {
        walletIdToLoad = await loadSavedWalletId();
      } else {
        
        const currentWalletId =
          selectedWalletIdRef.current || selectedAccount.id;
        walletIdToLoad = parseInt(currentWalletId) || undefined;
      }

      const result = await dashboardService.loadDashboard(walletIdToLoad);

      if (result.success && result.data) {
        const dashboardData = result.data;

        let selectedWallet = null;
        
        if (walletIdToLoad) {
          
          selectedWallet = dashboardData.wallets.find(w => w.id === walletIdToLoad);
        }

        if (!selectedWallet) {
          selectedWallet = dashboardData.wallets.find(w => w.is_default) || dashboardData.wallets[0];
        }

        if (!selectedWallet) {
          console.error('❌ [HomeTab] No wallets found in dashboard response');
          return;
        }

        setDashboardData(dashboardData);

        setSelectedAccount(prev => {

          const hasValidName = prev.name && prev.name !== 'Conta Principal';
          const walletId = selectedWallet.id.toString();
          const isSameWallet = prev.id === walletId;
          const shouldPreserveName =
            preserveAccountName || (hasValidName && isSameWallet);

          return {
            id: walletId,
            name: shouldPreserveName ? prev.name : selectedWallet.name,
            balance: selectedWallet.balance,
            type: prev.type || 'checking',
            color: selectedWallet.color || prev.color || COLORS.primary,
            currency_info: selectedWallet.currency_info,
          };
        });

        setSelectedCurrencyInfo(selectedWallet.currency_info);

        selectedWalletIdRef.current = selectedWallet.id.toString();

        const walletToSave: Wallet = {
          id: selectedWallet.id,
          name: selectedWallet.name,
          balance: selectedWallet.balance,
          initial_balance: selectedWallet.initial_balance,
          currency: selectedWallet.currency,
          currency_info: selectedWallet.currency_info,
          is_active: selectedWallet.is_active,
          is_default: selectedWallet.is_default,
          color: selectedWallet.color,
        };
        await saveWalletSelection(walletToSave);

      } else if (result.needsLogin) {
      } else {
      }
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
    } finally {

      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    try {

      await loadDashboard(true);

    } catch (error) {
      console.error('❌ [HomeTab] Error refreshing:', error);
    }
  };

  const silentRefresh = async () => {
    try {
      
      await loadDashboard(true, false, true);
    } catch (error) {
      console.error('❌ Error in silent refresh:', error);
    }
  };

  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(silentRefresh);
    }
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { getUserData } = await import('../../utils/userUtils');
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
          }
        }
      } catch (error) {
        console.error('❌ [HomeTab] Error getting user data:', error);
      }
    };

    loadUserData();

    const timer = setTimeout(() => {
      loadUserData();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (
      !isPullingToRefresh &&
      scrollYValue.current <= HEADER_SCROLL_DISTANCE * 0.2
    ) {
      setStatusBarStyle('dark-content');
    }
  }, [isPullingToRefresh]);

  const handleAccountSelectorPress = () => {
    setIsAccountSelectorVisible(true);
  };

  const handleSelectAccount = async (account: Account) => {
    
    isSelectingWallet.current = true;

    selectedWalletIdRef.current = account.id;

    if (account.currency_info) {
      setSelectedCurrencyInfo(account.currency_info);
    }

    const currencyInfo = account.currency_info || {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
    };
    setSelectedCurrencyInfo(currencyInfo);

    const walletId = parseInt(account.id);
    if (isNaN(walletId)) {
      console.error('⚠️ [HomeTab] Invalid account.id, cannot save wallet selection:', account.id);
      return;
    }
    
    const walletToSave: Wallet = {
      id: walletId,
      name: account.name,
      balance: account.balance,
      initial_balance: 0,
      currency: currencyInfo.code,
      currency_info: currencyInfo,
      is_active: true,
      is_default: false,
      color: account.color,
    };
    await saveWalletSelection(walletToSave);

    setSelectedAccount(account);

    await loadDashboard(false, true);

    setTimeout(() => {
      isSelectingWallet.current = false;
    }, 1000);
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const detailsOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerOpacity = 1;

  const handleTransactionPress = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetail(true);
  };

  const handleCloseTransactionDetail = () => {
    setShowTransactionDetail(false);
    setSelectedTransaction(null);
  };

  const handleEditTransaction = (transaction: any) => {
    handleCloseTransactionDetail();

    setTransactionToEdit(transaction);
    setShowAddTransactionSheet(true);
  };

  const handleCloseAddTransactionSheet = () => {
    setShowAddTransactionSheet(false);
    setTransactionToEdit(null);
  };

  const handleTransactionUpdated = async () => {
    
    await loadDashboard(true);
  };

  const handleDeleteTransaction = async (transactionId: number) => {

    try {
      const result = await transactionService.deleteTransaction(
        transactionId,
      );

      if (result.success) {
        handleCloseTransactionDetail();
        await loadDashboard(true);
        showSuccess(t('success.transactionDeleted') || 'Transaction deleted successfully');
      } else {
        showError(result.message || t('errors.failedToDeleteTransaction') || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showError(t('errors.unexpectedError') || 'An unexpected error occurred');
    }
  };

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [
      HEADER_SCROLL_DISTANCE * 0,
      HEADER_SCROLL_DISTANCE * 0.2,
      HEADER_SCROLL_DISTANCE * 0.5,
    ],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE + 79, HEADER_SCROLL_DISTANCE + 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading && !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <SkeletonHomeLoading />
      </SafeAreaView>
    );
  }

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
    },
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={statusBarStyle} animated={true} />

      {}
      <Animated.View
        style={[
          styles.compactHeader,
          {
            opacity: compactHeaderOpacity,
          },
        ]}
      >
        <ImageBackground
          source={backgroundImage}
          style={styles.compactBalanceCard}
          imageStyle={styles.compactBalanceCardImage}
          resizeMode="cover"
        >
          <TouchableOpacity
            style={styles.compactCardContent}
            onPress={handleAccountSelectorPress}
            activeOpacity={0.7}
          >
            <View style={styles.compactTextContainer}>
              <Text style={styles.compactAccountName}>
                {selectedAccount.name}
              </Text>
              <Text style={styles.compactBalance}>
                {formatCurrency(
                  selectedAccount.balance,
                  selectedAccount.currency_info ||
                    selectedCurrencyInfo ||
                    undefined,
                )}
              </Text>
            </View>
            <View style={styles.compactAvatar}>
              <Text style={styles.compactAvatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </ImageBackground>
      </Animated.View>

      {}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            opacity: stickyHeaderOpacity,
            position: 'absolute',
            top: 120,
            left: 0,
            right: 0,
            zIndex: 9,
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Últimas Transações</Text>
        <Text style={styles.seeAllText}>Ver todas</Text>
      </Animated.View>

      {}
      <PullToRefresh
        onRefresh={onRefresh}
        pullThreshold={40}
        primaryColor={COLORS.primary}
        style={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onPullStateChange={setIsPullingToRefresh}
      >
        {}
        <Animated.View
          style={[
            styles.headerInScroll,
            {
              height: headerHeight,
              opacity: headerOpacity,
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, HEADER_SCROLL_DISTANCE],
                    outputRange: [0, -HEADER_SCROLL_DISTANCE],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        >
          <UserHeader
            userName={userName}
            accountName={selectedAccount.name}
            accountBalance={selectedAccount.balance}
            currency_info={
              selectedAccount.currency_info || selectedCurrencyInfo || undefined
            }
            totalReceived={dashboardData?.monthlyStats?.totalIncome || 0}
            totalSpent={dashboardData?.monthlyStats?.totalExpenses || 0}
            onAccountSelectorPress={handleAccountSelectorPress}
            detailsOpacity={detailsOpacity}
          />
        </Animated.View>

        {}
        <View style={styles.scrollableHeader}>
          <Text style={styles.sectionTitle}>
            {t('home.recentTransactions')}
          </Text>
          <Text style={styles.seeAllText}>{t('home.viewAll')}</Text>
        </View>

        {}
        <View style={styles.transactionsSection}>
          {loading ? (
            <SkeletonTransactionsLoading showHeader={false} compact={true} />
          ) : dashboardData?.recentTransactions &&
            dashboardData.recentTransactions.length > 0 ? (
            (() => {
              
              const groupedTransactions: {
                [key: string]: typeof dashboardData.recentTransactions;
              } = {};

              dashboardData.recentTransactions
                .sort((a, b) => {
                  const dateA = new Date(a.date || a.created_at || 0).getTime();
                  const dateB = new Date(b.date || b.created_at || 0).getTime();
                  return dateB - dateA;
                })
                .slice(0, 6) 
                .forEach(transaction => {
                  const date = new Date(
                    transaction.date || transaction.created_at || 0,
                  );
                  const dateKey = date.toDateString();
                  if (!groupedTransactions[dateKey]) {
                    groupedTransactions[dateKey] = [];
                  }
                  groupedTransactions[dateKey].push(transaction);
                });

              const formatDateHeader = (dateString: string) => {
                const date = new Date(dateString);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                const isToday = date.toDateString() === today.toDateString();
                const isYesterday =
                  date.toDateString() === yesterday.toDateString();

                const day = date.toLocaleDateString('pt-PT', {
                  day: '2-digit',
                });

                const monthNum = date.getMonth();
                const monthKeys = [
                  'jan',
                  'feb',
                  'mar',
                  'apr',
                  'may',
                  'jun',
                  'jul',
                  'aug',
                  'sep',
                  'oct',
                  'nov',
                  'dec',
                ];
                const month = t(`time.${monthKeys[monthNum]}`);

                if (isToday) {
                  return `${t('home.today')}, ${day} ${month}`;
                } else if (isYesterday) {
                  return `${t('home.yesterday')}, ${day} ${month}`;
                } else {
                  
                  const dayOfWeek = date.getDay();
                  const dayKeys = [
                    'sun',
                    'mon',
                    'tue',
                    'wed',
                    'thu',
                    'fri',
                    'sat',
                  ];
                  const dayName = t(`time.${dayKeys[dayOfWeek]}`);

                  return `${dayName}, ${day} ${month}`;
                }
              };

              return Object.keys(groupedTransactions).map(dateKey => (
                <View key={dateKey} style={styles.dateGroup}>
                  {}
                  <Text style={styles.dateHeader}>
                    {formatDateHeader(dateKey)}
                  </Text>

                  {}
                  {groupedTransactions[dateKey].map(transaction => {
                    
                    const transType = (transaction as any).type;
                    const isTransfer =
                      transaction.type === 'transfer' ||
                      transType === 'transfer_in' ||
                      transType === 'transfer_out';

                    const categoryIcon = transaction.category?.icon;
                    const categoryColor = isTransfer
                      ? COLORS.primary
                      : transaction.category?.color;
                    const categoryName = transaction.category?.name;

                    const originWallet = transaction.origin_wallet;
                    const destinationWallet = transaction.destination_wallet;

                    let transferInfo = '';
                    if (isTransfer) {
                      if (transType === 'transfer_out' && destinationWallet) {
                        transferInfo = ` → ${destinationWallet.name}`;
                      } else if (transType === 'transfer_in' && originWallet) {
                        transferInfo = ` ← ${originWallet.name}`;
                      } else if (originWallet && destinationWallet) {
                        transferInfo = ` ${originWallet.name} → ${destinationWallet.name}`;
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={transaction.id}
                        style={styles.transactionCard}
                        onPress={() => handleTransactionPress(transaction)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.transactionIcon,
                            {
                              backgroundColor: categoryColor
                                ? categoryColor + '15'
                                : '#F3F4F6',
                            },
                          ]}
                        >
                          {isTransfer ? (
                            <TransferIcon
                              size={20}
                              color={categoryColor || COLORS.primary}
                            />
                          ) : (
                            <CategoryIcon
                              iconName={categoryIcon || 'Receipt'}
                              size={20}
                              color={categoryColor || COLORS.textMuted}
                            />
                          )}
                        </View>
                        <View style={styles.transactionInfo}>
                          <View style={styles.transactionNameRow}>
                            <Text
                              style={styles.transactionName}
                              numberOfLines={1}
                            >
                              {(() => {
                                const name =
                                  transaction.name ||
                                  transaction.notes ||
                                  (isTransfer
                                    ? `Transferência${transferInfo}`
                                    : categoryName) ||
                                  'Transação';
                                
                                return name.replace(/\s*\((In|Out)\)\s*$/g, '');
                              })()}
                            </Text>
                            {((transaction as any).recurrence_info
                              ?.is_recurring ||
                              (transaction as any).recurrence) && (
                              <View style={styles.recurrenceIndicator}>
                                <CategoryIcon
                                  iconName="Refresh2"
                                  size={10}
                                  color={COLORS.primary}
                                />
                              </View>
                            )}
                          </View>
                          <Text style={styles.transactionCategory}>
                            {isTransfer
                              ? t('transactions.transfer')
                              : categoryName || t('transactions.noCategory')}
                          </Text>
                        </View>
                        <View style={styles.transactionAmountContainer}>
                          <Text
                            style={[
                              styles.transactionAmount,
                              {
                                color: (() => {
                                  
                                  if (transaction.type === 'income')
                                    return '#22C55E';
                                  if (transaction.type === 'expense')
                                    return COLORS.text;
                                  
                                  const transType = (transaction as any).type;
                                  if (transType === 'transfer_in')
                                    return '#22C55E';
                                  if (transType === 'transfer_out')
                                    return COLORS.text;
                                  return COLORS.primary; 
                                })(),
                              },
                            ]}
                          >
                            {(() => {
                              
                              const transType = (transaction as any).type;
                              let amount: number;
                              let sign: string;

                              const currencyInfo =
                                selectedCurrencyInfo ||
                                selectedAccount.currency_info;

                              if (
                                transaction.type === 'income' ||
                                transType === 'transfer_in'
                              ) {
                                amount = Math.abs(transaction.amount);
                                sign = '+';
                              } else if (
                                transaction.type === 'expense' ||
                                transType === 'transfer_out'
                              ) {
                                amount = Math.abs(transaction.amount);
                                sign = '-';
                              } else {
                                
                                amount = Math.abs(transaction.amount);
                                sign = transaction.amount < 0 ? '-' : '+';
                              }

                              const formatted = formatCurrency(
                                amount,
                                currencyInfo,
                              );
                              return `${sign}${formatted.replace(/^[+-]/, '')}`;
                            })()}
                          </Text>
                          <Text style={styles.transactionTime}>
                            {(() => {
                              const date = new Date(
                                transaction.date || transaction.created_at || 0,
                              );
                              const hours = String(date.getHours()).padStart(
                                2,
                                '0',
                              );
                              const minutes = String(
                                date.getMinutes(),
                              ).padStart(2, '0');
                              return `${hours}:${minutes}`;
                            })()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ));
            })()
          ) : (
            <EmptyState
              icon="Receipt"
              title={t('home.noTransactionsYet')}
              subtitle={t('home.noTransactionsSubtitle')}
            />
          )}
        </View>

        {}
        <View style={{ height: 70 }} />
      </PullToRefresh>
      {isAccountSelectorVisible && (
        <AccountSelectorSheet
          isVisible={isAccountSelectorVisible}
          onClose={() => setIsAccountSelectorVisible(false)}
          onSelectAccount={handleSelectAccount}
          selectedAccountId={selectedAccount.id}
        />
      )}

      {}
      <TransactionDetailSheet
        isVisible={showTransactionDetail}
        onClose={handleCloseTransactionDetail}
        transaction={selectedTransaction}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />

      {}
      {transactionToEdit && (
        <AddTransactionSheet
          isVisible={showAddTransactionSheet}
          onClose={handleCloseAddTransactionSheet}
          transactionType={
            transactionToEdit.type === 'income'
              ? 'income'
              : transactionToEdit.type === 'expense'
              ? 'expense'
              : 'transfer'
          }
          onTransactionCreated={handleTransactionUpdated}
          transactionToEdit={transactionToEdit}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 10,
  },
  compactBalanceCard: {
    backgroundColor: '#1C1C1E',
    paddingTop: 65,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.paddingSmall + 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  compactBalanceCardImage: {
    opacity: 0,
    bottom: -150,
    left: 19.8,
    width: '100%',
    height: 223,
  },
  compactCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactTextContainer: {
    flex: 1,
  },
  compactAccountName: {
    fontSize: SIZES.fontTiny,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  compactBalance: {
    fontSize: SIZES.fontLarge,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactAvatarText: {
    color: '#FFFFFF',
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.paddingSmall,
    paddingBottom: SIZES.paddingSmall,
    backgroundColor: COLORS.background,
    zIndex: 2,
  },
  scrollableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    backgroundColor: COLORS.background,
    marginBottom: SIZES.paddingSmall,
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
  },
  transactionsSection: {
    paddingTop: 0,
    paddingHorizontal: SIZES.padding,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'none',
  },
  sectionTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: '600',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '500',
    color: '#6B7280',
  },
  transactionCard: {
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  transactionName: {
    fontSize: SIZES.fontMedium,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  recurrenceIndicator: {
    marginLeft: 6,
    padding: 2,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
  },
  transactionCategory: {
    fontSize: SIZES.fontTiny,
    color: COLORS.textSecondary,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: SIZES.fontTiny,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: SIZES.padding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: SIZES.fontMedium,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: SIZES.fontTiny,
    color: '#6B7280',
    textAlign: 'center',
  },
  headerInScroll: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.padding,
  },
});

export default HomeTab;
