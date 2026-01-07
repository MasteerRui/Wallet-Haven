import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import PullToRefreshSectionList from '../../components/common/PullToRefreshSectionList';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../../constants/theme';
import CategoryIcon from '../../components/common/CategoryIcon';
import transactionService from '../../services/transactionService';
import walletService from '../../services/walletService';
import TransactionDetailSheet from '../../components/transaction/TransactionDetailSheet';
import AddTransactionSheet from '../../components/transaction/AddTransactionSheet';
import SkeletonTransactionsLoading from '../../components/common/SkeletonTransactionsLoader';
import EmptyState from '../../components/common/EmptyState';
import { useTranslation } from '../../hooks/useTranslation';
import Svg, { Path, G } from 'react-native-svg';

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

interface Transaction {
  id?: number;
  wallet_id?: number;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date?: string;
  name?: string;
  notes?: string;
  tags?: string;
  items?: any;
  wallet?: {
    id: number;
    name: string;
    currency: string;
  };
  origin_wallet?: {
    id: number;
    name: string;
    currency: string;
  };
  destination_wallet?: {
    id: number;
    name: string;
    currency: string;
  };
  category?: {
    id: number;
    name: string;
    icon?: string;
    color?: string;
  };
  file?: {
    id: number;
    file_url: string;
    file_name: string;
    file_type: string;
  };
  recurrence?: {
    id: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    start_date: string;
    end_date?: string | null;
  } | null;
  recurrence_info?: {
    is_recurring: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    start_date?: string;
    end_date?: string | null;
    recent_transactions?: Array<{
      id: number;
      date: string;
      amount: number;
      created_at: string;
    }>;
    total_generated?: number;
  };
  created_at?: string;
}

interface Section {
  title: string;
  key: string;
  data: Transaction[];
}

const TransactionsTab: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);

  const [showAddTransactionSheet, setShowAddTransactionSheet] = useState(false);
  const [transactionToEdit, setTransactionToEdit] =
    useState<Transaction | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollYCurrent = useRef(0);
  const [statusBarStyle, setStatusBarStyle] = useState<
    'light-content' | 'dark-content'
  >('dark-content');
  const sectionListRef = useRef<any>(null);

  const loadTransactions = async (
    page: number = 1,
    append: boolean = false,
  ) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const savedWalletInfo = await walletService.getSavedWalletInfo();
      const walletIdFilter = savedWalletInfo?.id
        ? parseInt(savedWalletInfo.id)
        : undefined;

      const result = await transactionService.getTransactions({
        page,
        limit: 50,
        wallet_id: walletIdFilter,
      });

      if (result.success && result.data) {
        const newTransactions = result.data.transactions || [];

        if (append) {
          setTransactions(prev => [
            ...prev,
            ...(newTransactions as Transaction[]),
          ]);
        } else {
          setTransactions(newTransactions as Transaction[]);
        }

        const pagination = result.data.pagination;
        setHasMore(pagination?.hasMore || false);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreTransactions = async () => {
    if (!hasMore || loadingMore || loading) {
      return;
    }
    const nextPage = currentPage + 1;
    await loadTransactions(nextPage, true);
  };

  useEffect(() => {
    loadTransactions(1, false);
  }, []);

  const onRefresh = useCallback(async () => {
    setCurrentPage(1);
    setHasMore(true);
    await loadTransactions(1, false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      
      setStatusBarStyle('dark-content');

      setCurrentPage(1);
      setHasMore(true);
      loadTransactions(1, false);
      
      const loadCurrencyInfo = async () => {
        const savedWalletInfo = await walletService.getSavedWalletInfo();
        if (savedWalletInfo?.currency_info) {
          setSelectedCurrencyInfo(savedWalletInfo.currency_info);
        }
      };
      loadCurrencyInfo();
    }, []),
  );

  const [selectedCurrencyInfo, setSelectedCurrencyInfo] = useState<{
    code: string;
    name: string;
    symbol: string;
  } | null>(null);

  useEffect(() => {
    const loadCurrencyInfo = async () => {
      const savedWalletInfo = await walletService.getSavedWalletInfo();
      if (savedWalletInfo?.currency_info) {
        setSelectedCurrencyInfo(savedWalletInfo.currency_info);
      }
    };
    loadCurrencyInfo();
  }, []);

  const formatCurrency = (amount: number): string => {
    return walletService.formatCurrency(
      amount,
      selectedCurrencyInfo || undefined,
    );
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const isCurrentYear = date.getFullYear() === today.getFullYear();

    const day = date.toLocaleDateString('pt-PT', { day: '2-digit' });
    const month = date
      .toLocaleDateString('pt-PT', { month: 'short' })
      .replace('.', '');
    const year = date.getFullYear();

    if (isToday) {
      return `Hoje, ${day} ${month}`;
    } else if (isYesterday) {
      return `Ontem, ${day} ${month}`;
    } else {
      const dayOfWeek = date
        .toLocaleDateString('pt-PT', { weekday: 'short' })
        .replace('.', '');
      const capitalizedDay =
        dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

      if (isCurrentYear) {
        return `${capitalizedDay}, ${day} ${month}`;
      } else {
        return `${capitalizedDay}, ${day} ${month} ${year}`;
      }
    }
  };

  const groupedTransactions: { [key: string]: Transaction[] } = {};

  transactions
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || 0).getTime();
      const dateB = new Date(b.date || b.created_at || 0).getTime();
      return dateB - dateA;
    })
    .forEach(transaction => {
      const date = new Date(transaction.date || transaction.created_at || 0);
      const dateKey = date.toDateString();
      if (!groupedTransactions[dateKey]) {
        groupedTransactions[dateKey] = [];
      }
      groupedTransactions[dateKey].push(transaction);
    });

  const sections: Section[] = Object.keys(groupedTransactions).map(dateKey => ({
    title: formatDateHeader(dateKey),
    key: dateKey,
    data: groupedTransactions[dateKey],
  }));

  const titleFontSize = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [24, 18],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, -4],
    extrapolate: 'clamp',
  });

  const headerPaddingBottom = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [24, 12],
    extrapolate: 'clamp',
  });

  const miniHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const miniHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [-50, -50, 0],
    extrapolate: 'clamp',
  });

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    scrollYCurrent.current = y;
    scrollY.setValue(y);
  };

  const handlePullStateChange = (isPulling: boolean) => {
    if (isPulling) {
      setStatusBarStyle('light-content');
    } else {
      setStatusBarStyle('dark-content');
    }
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailSheetVisible(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setIsDetailSheetVisible(false);

    setTransactionToEdit(transaction);
    setShowAddTransactionSheet(true);
  };

  const handleCloseAddTransactionSheet = () => {
    setShowAddTransactionSheet(false);
    setTransactionToEdit(null);
  };

  const handleTransactionUpdated = async () => {
    
    setCurrentPage(1);
    setHasMore(true);
    await loadTransactions(1, false);
  };

  const handleDelete = async (transactionId: number) => {
    try {
      setCurrentPage(1);
      setHasMore(true);
      await loadTransactions(1, false);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const renderTransaction = ({ item: transaction }: { item: Transaction }) => {
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
        style={styles.transactionCard}
        activeOpacity={0.7}
        onPress={() => handleTransactionPress(transaction)}
      >
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor: categoryColor ? categoryColor + '15' : '#F3F4F6',
            },
          ]}
        >
          {isTransfer ? (
            <TransferIcon size={20} color={categoryColor || COLORS.primary} />
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
            <Text style={styles.transactionName} numberOfLines={1}>
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
            {(transaction.recurrence_info?.is_recurring ||
              transaction.recurrence) && (
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
            {isTransfer ? t('transactions.transfer') : categoryName || t('transactions.noCategory')}
          </Text>
        </View>
        <View style={styles.transactionAmountContainer}>
          <Text
            style={[
              styles.transactionAmount,
              {
                color: (() => {
                  
                  if (transaction.type === 'income') return '#22C55E';
                  if (transaction.type === 'expense') return COLORS.text;
                  
                  const transType = (transaction as any).type;
                  if (transType === 'transfer_in') return '#22C55E';
                  if (transType === 'transfer_out') return COLORS.text;
                  return COLORS.primary; 
                })(),
              },
            ]}
          >
            {(() => {
              
              const transType = (transaction as any).type;
              let amount: number;
              let sign: string;

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

              const formatted = formatCurrency(amount);
              return `${sign}${formatted.replace(/^[+-]/, '')}`;
            })()}
          </Text>
          <Text style={styles.transactionTime}>
            {(() => {
              const date = new Date(
                transaction.date || transaction.created_at || 0,
              );
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              return `${hours}:${minutes}`;
            })()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => {
    return (
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: 12,
            paddingBottom: headerPaddingBottom,
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.headerTitle,
            {
              fontSize: titleFontSize,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          Transações
        </Animated.Text>
        <Text style={styles.headerSubtitle}>
          {transactions.length}{' '}
          {transactions.length === 1 ? 'transação' : 'transações'}
        </Text>
      </Animated.View>
    );
  };

  const renderEmptyComponent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    return (
      <EmptyState
        icon="Receipt"
        title={t('transactions.noTransactionsYet')}
        subtitle={t('transactions.noTransactionsSubtitle')}
      />
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  const handleEndReached = () => {
    if (hasMore && !loadingMore && !loading) {
      loadMoreTransactions();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle={statusBarStyle} animated />

      {loading && transactions.length === 0 ? (
        <SkeletonTransactionsLoading />
      ) : (
        <View style={{ flex: 1 }}>
          <PullToRefreshSectionList
            innerRef={sectionListRef}
            sections={sections}
            keyExtractor={(item, index) =>
              item.id?.toString() || index.toString()
            }
            renderItem={renderTransaction}
            renderSectionHeader={renderSectionHeader}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={renderEmptyComponent}
            ListFooterComponent={renderFooter}
            stickySectionHeadersEnabled={true}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            nestedScrollEnabled={true}
            onRefresh={onRefresh}
            pullThreshold={40}
            primaryColor={COLORS.primary}
            onPullStateChange={handlePullStateChange}
          />
        </View>
      )}

      <TransactionDetailSheet
        isVisible={isDetailSheetVisible}
        onClose={() => setIsDetailSheetVisible(false)}
        transaction={selectedTransaction}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 0,
    minHeight: '100%',
  },
  header: {
    paddingHorizontal: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 16,
    zIndex: 1,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sectionHeaderContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 100,
    elevation: 2,
  },
  sectionHeaderText: {
    fontSize: SIZES.fontSmall,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default TransactionsTab;
