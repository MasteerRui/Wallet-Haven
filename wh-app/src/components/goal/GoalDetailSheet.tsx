import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  MoreVertical,
  Plus,
  TrendingUp,
  Trash2,
} from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryIcon from '../common/CategoryIcon';
import EmptyState from '../common/EmptyState';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';
import { Goal } from '../../services/goalService';
import goalService from '../../services/goalService';
import CalculatorSheet from '../transaction/CalculatorSheet';
import walletService from '../../services/walletService';
import TransactionDetailSheet from '../transaction/TransactionDetailSheet';

interface GoalDetailSheetProps {
  isVisible: boolean;
  onClose: () => void;
  goal: Goal | null;
  onTopUp?: () => void;
  onGoalUpdated?: () => void;
}

const GoalDetailSheet: React.FC<GoalDetailSheetProps> = ({
  isVisible,
  onClose,
  goal,
  onTopUp,
  onGoalUpdated,
}) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(goal);
  const [walletCurrency, setWalletCurrency] = useState<string>('EUR');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(
    null,
  );
  const [isTransactionDetailVisible, setIsTransactionDetailVisible] =
    useState(false);

  useEffect(() => {

    if (isVisible && goal) {
      setCurrentGoal(goal);
    }
    
    if (!isVisible) {
      setIsMenuVisible(false);
    }
  }, [goal, isVisible]);

  useEffect(() => {
    if (isVisible && goal?.id) {
      const fetchGoalDetails = async () => {
        setLoading(true);
        try {
          const res = await goalService.getGoalById(goal.id!);
          if (res.success && res.data) {
            setCurrentGoal(res.data);
          }

          const savedWalletId = await walletService.getSavedWalletId();
          if (savedWalletId) {
            const walletsRes = await walletService.getWallets();
            if (walletsRes.success && walletsRes.data?.wallets) {
              const wallet = walletsRes.data.wallets.find(
                w => w.id.toString() === savedWalletId,
              );
              if (wallet?.currency) {
                setWalletCurrency(wallet.currency);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching goal details:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchGoalDetails();
    }
  }, [isVisible, goal?.id]);

  if (!currentGoal && !isVisible) return null;

  if (!currentGoal && isVisible) {
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('goals.title')}</Text>
            <View style={styles.backButton} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('goals.loadingGoalDetails')}</Text>
          </View>
        </View>
      </Modal>
    );
  }

  const formatCurrency = (amount: number, currencyCode?: string): string => {
    const formatted = amount.toFixed(2);
    const [integer, decimal] = formatted.split('.');
    const integerWithDots = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const symbol = currentGoal?.currency_info?.symbol || '€';
    return `${symbol}${integerWithDots},${decimal}`;
  };

  const getCurrencySymbol = (currencyCode?: string): string => {
    
    const currencySymbols: { [key: string]: string } = {
      EUR: '€',
      USD: '$',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      CHF: 'CHF',
      CAD: 'CA$',
      AUD: 'A$',
      NZD: 'NZ$',
      BRL: 'R$',
      INR: '₹',
      RUB: '₽',
      KRW: '₩',
      TRY: '₺',
      MXN: 'MX$',
      ZAR: 'R',
      SEK: 'kr',
      NOK: 'kr',
      DKK: 'kr',
      PLN: 'zł',
      THB: '฿',
      IDR: 'Rp',
      HUF: 'Ft',
      CZK: 'Kč',
      ILS: '₪',
      CLP: 'CLP$',
      PHP: '₱',
      AED: 'د.إ',
      COP: 'COL$',
      SAR: '﷼',
      MYR: 'RM',
      RON: 'lei',
    };

    return currencySymbols[currencyCode || ''] || currencyCode || '€';
  };

  const calculateDaysRemaining = (endDate?: string): string => {
    if (!endDate) return '-';

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);

      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return 'Concluído';
      } else if (diffDays === 0) {
        return 'Hoje';
      } else if (diffDays === 1) {
        return '1 dia restante';
      } else {
        return `${diffDays} dias restantes`;
      }
    } catch (error) {
      return '-';
    }
  };

  const calculateProgress = (): number => {
    if (!currentGoal) return 0;
    if (currentGoal.amount_goal === 0) return 0;
    return Math.round(
      ((currentGoal.amount_saved ?? 0) / currentGoal.amount_goal) * 100,
    );
  };

  const parseAmount = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleTopUp = async (amount: string) => {
    if (!currentGoal?.id) return;

    const topUpAmount = parseAmount(amount);
    if (topUpAmount <= 0) {
      showError(t('errors.invalidInput') || 'Please enter a valid value');
      return;
    }

    const savedWalletId = await walletService.getSavedWalletId();

    if (!savedWalletId) {
      console.error('No wallet selected in AsyncStorage!');
      showError(t('errors.noWalletSelected') || 'No wallet selected. Please select a wallet from the home screen.');
      return;
    }

    const walletId = parseInt(savedWalletId, 10);

    setLoading(true);
    try {
      
      const currentSaved = currentGoal.amount_saved ?? 0;
      const newAmountSaved = currentSaved + topUpAmount;

      const finalAmount = Math.min(newAmountSaved, currentGoal.amount_goal);

      const updatePayload = {
        amount_saved: finalAmount,
        wallet_id: walletId, 
      };

      const res = await goalService.updateGoal(currentGoal.id, updatePayload);

      if (res.success && res.data) {
        setCurrentGoal(res.data.goal);
        
        const updatedRes = await goalService.getGoalById(currentGoal.id!);
        if (updatedRes.success && updatedRes.data) {
          setCurrentGoal(updatedRes.data);
        }
        if (onGoalUpdated) {
          onGoalUpdated();
        }

        if (res.data.currencyConversion) {
          const conv = res.data.currencyConversion;
          showSuccess(
            `Top-up successful!\n\n` +
              `Added to goal: ${conv.topUpAmount.toFixed(2)} ${
                conv.goalCurrency
              }\n` +
              `Charged from wallet: ${conv.walletDeductionAmount.toFixed(2)} ${
                conv.walletCurrency
              }\n` +
              `Exchange rate: ${conv.exchangeRate.toFixed(4)}`
          );
        } else {
          showSuccess(`Added ${formatCurrency(topUpAmount)} to goal!`);
        }
      } else {
        showError(res.message || t('errors.failedToTopUp') || 'Failed to top up');
      }
    } catch (error: any) {
      showError(error.message || t('errors.topUpError') || 'Error topping up');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!currentGoal?.id) return;

    setLoading(true);
    setIsMenuVisible(false);
    try {
      const res = await goalService.deleteGoal(currentGoal.id!);
      if (res.success) {
        showSuccess(t('success.goalDeleted') || 'Goal deleted successfully!');
        if (onGoalUpdated) {
          onGoalUpdated();
        }
        onClose();
      } else {
        showError(res.message || t('errors.failedToDeleteGoal') || 'Failed to delete goal');
      }
    } catch (error: any) {
      showError(error.message || t('errors.deleteGoalError') || 'Error deleting goal');
    } finally {
      setLoading(false);
    }
  };

  const categoryIcon = currentGoal?.category?.icon || 'Target';
  const categoryColor = currentGoal?.category?.color || COLORS.primary;
  const progress = calculateProgress();
  const daysRemaining = calculateDaysRemaining(currentGoal?.end_date);

  const processMonthlyData = () => {
    
    const monthNames = [
      t('goals.jan'), t('goals.feb'), t('goals.mar'), t('goals.apr'), 
      t('goals.may'), t('goals.jun'), t('goals.jul'), t('goals.aug'), 
      t('goals.sep'), t('goals.oct'), t('goals.nov'), t('goals.dec')
    ];
    
    const now = new Date();
    const last6Months: { month: string; amount: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthNames[date.getMonth()];
      last6Months.push({
        month: monthName,
        amount: 0,
      });
    }

    if (currentGoal?.transactions && currentGoal.transactions.length > 0) {
      currentGoal.transactions.forEach(transaction => {
        const dateStr = transaction.date || transaction.created_at;
        if (!dateStr) return;
        
        try {
          const date = new Date(dateStr);
          const monthIndex = date.getMonth();
          const year = date.getFullYear();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();

          const monthsDiff = (currentYear - year) * 12 + (currentMonth - monthIndex);
          
          if (monthsDiff >= 0 && monthsDiff < 6) {
            
            const arrayIndex = 5 - monthsDiff; 
            if (arrayIndex >= 0 && arrayIndex < last6Months.length) {
              
              const amount = transaction.converted_amount ?? transaction.amount ?? 0;
              last6Months[arrayIndex].amount += Math.abs(amount);
            }
          }
        } catch (e) {
          console.error('Error parsing transaction date:', e);
        }
      });
    }

    return last6Months;
  };

  const monthlyData = processMonthlyData();
  const maxAmount = Math.max(...monthlyData.map(d => d.amount), 1); 
  const averagePerMonth =
    monthlyData.length > 0
      ? monthlyData.reduce((sum, d) => sum + d.amount, 0) / monthlyData.length
      : 0;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {}
        <View style={styles.handle} />

        {}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Goals Detail</Text>
          <View style={styles.moreButtonContainer}>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setIsMenuVisible(!isMenuVisible)}
              activeOpacity={0.7}
            >
              <MoreVertical size={24} color={COLORS.text} />
            </TouchableOpacity>
            {isMenuVisible && (
              <>
                <TouchableOpacity
                  style={styles.menuOverlay}
                  activeOpacity={1}
                  onPress={() => setIsMenuVisible(false)}
                />
                <View style={styles.menu}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleDeleteGoal}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={18} color="#EF4444" />
                    <Text style={styles.menuItemTextDelete}>
                      {t('goals.deleteGoal')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {}
          <View style={styles.goalHeader}>
            <View
              style={[
                styles.goalIconContainer,
                { backgroundColor: categoryColor + '15' },
              ]}
            >
              <CategoryIcon
                iconName={categoryIcon}
                size={22}
                color={categoryColor}
              />
            </View>
            <View style={styles.goalStats}>
              <View
                style={[
                  styles.statsPill,
                  { backgroundColor: categoryColor + '15' },
                ]}
              >
                <TrendingUp size={16} color={categoryColor} />
                <Text style={[styles.statsText, { color: categoryColor }]}>
                  +{progress}%
                </Text>
              </View>
              <Text style={styles.statsSubtext}>{t('goals.increasedSinceStart')}</Text>
            </View>
          </View>

          {}
          <View style={styles.goalInfo}>
            <View style={styles.goalTitleRow}>
              <Text style={styles.goalTitle}>{currentGoal.name}</Text>
              {currentGoal.currency &&
                currentGoal.wallet?.currency &&
                currentGoal.currency !== currentGoal.wallet.currency && (
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>
                      💱 {t('goals.multiCurrency')}
                    </Text>
                  </View>
                )}
            </View>
            {currentGoal.description && (
              <Text style={styles.goalDescription}>
                {currentGoal.description}
              </Text>
            )}
            {currentGoal.currency && (
              <Text style={styles.currencyInfo}>
                {t('goals.goalCurrency')}: {currentGoal.currency}
                {currentGoal.wallet?.currency &&
                  currentGoal.currency !== currentGoal.wallet.currency &&
                  ` • ${t('goals.walletCurrency')}: ${currentGoal.wallet.currency}`}
              </Text>
            )}
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <View style={styles.progressLeft}>
                  <Text style={styles.progressAmount}>
                    {formatCurrency(currentGoal.amount_saved ?? 0)}
                  </Text>
                </View>
                <View style={styles.progressRight}>
                  <Text style={styles.progressTarget}>
                    {formatCurrency(currentGoal.amount_goal)}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${progress}%`,
                      backgroundColor: categoryColor,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressInfo}>
                <Text style={styles.progressLabel}>{daysRemaining}</Text>
                <Text style={styles.progressPercentage}>{progress}%</Text>
              </View>
            </View>

            {}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('goals.savingAnalytics')}</Text>
              <Text style={styles.averageText}>
                {t('goals.averagePerMonth')} {formatCurrency(averagePerMonth)}
              </Text>
              <View style={styles.chartContainer}>
                {monthlyData.map((data, index) => {
                  const barHeight = (data.amount / maxAmount) * 100;
                  return (
                    <View key={index} style={styles.chartBarWrapper}>
                      <View style={styles.chartBarContainer}>
                        <View
                          style={[
                            styles.chartBar,
                            {
                              height: `${barHeight}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartMonth}>{data.month}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {}
          <View style={styles.transactioSection}>
            <Text style={styles.sectionTitle}>{t('goals.transactions')}</Text>
            {currentGoal.transactions && currentGoal.transactions.length > 0 ? (
              [...currentGoal.transactions]
                .sort((a, b) => {
                  const dateA = new Date(a.date || a.created_at || 0).getTime();
                  const dateB = new Date(b.date || b.created_at || 0).getTime();
                  return dateB - dateA; 
                })
                .map(transaction => {
                  const transactionColor =
                    transaction.category?.color || categoryColor;
                  const transactionIcon =
                    transaction.category?.icon || 'TrendingUp';
                  const transactionDate =
                    transaction.date || transaction.created_at;
                  let formattedDate = '-';
                  if (transactionDate) {
                    try {
                      const date = new Date(transactionDate);
                      formattedDate = date.toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    } catch (e) {
                      formattedDate = '-';
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={transaction.id}
                      style={styles.transactionItem}
                      onPress={() => {
                        setSelectedTransaction(transaction);
                        setIsTransactionDetailVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.transactionIcon,
                          { backgroundColor: transactionColor + '15' },
                        ]}
                      >
                        <CategoryIcon
                          iconName={transactionIcon}
                          size={20}
                          color={transactionColor}
                        />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle}>
                          {transaction.name || 'Goal top up'}
                        </Text>
                        <Text style={styles.transactionSubtitle}>
                          {transaction.notes || currentGoal.name}
                        </Text>
                        {}
                        {transaction.exchange_rate &&
                          transaction.original_amount && (
                            <View style={styles.conversionInfo}>
                              <Text style={styles.conversionText}>
                                💱 {transaction.original_amount.toFixed(2)}{' '}
                                {transaction.original_currency} →{' '}
                                {transaction.converted_amount?.toFixed(2)}{' '}
                                {transaction.destination_currency} (Rate:{' '}
                                {transaction.exchange_rate.toFixed(4)})
                              </Text>
                            </View>
                          )}
                      </View>
                      <View style={styles.transactionAmount}>
                        <Text
                          style={[
                            styles.transactionAmountText,
                            { color: transactionColor },
                          ]}
                        >
                          +{formatCurrency(transaction.amount)}
                        </Text>
                        <Text style={styles.transactionTime}>
                          {formattedDate}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
            ) : (
              <EmptyState
                icon="TrendingUp"
                title="No Contributions Yet"
                subtitle="Add your first contribution to start saving."
                iconSize={48}
              />
            )}
          </View>

          {}
          <View style={{ height: 10 }} />
        </ScrollView>

        {}
        <View style={[styles.bottomButton, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={[styles.topUpButton, loading && { opacity: 0.6 }]}
            onPress={() => setIsCalculatorVisible(true)}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.topUpButtonText}>{t('goals.topUp')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {}
        <CalculatorSheet
          isVisible={isCalculatorVisible}
          onClose={() => {
            setIsCalculatorVisible(false);
          }}
          onAmountChange={amount => {

            if (amount && parseAmount(amount) > 0) {
              handleTopUp(amount);
            }
          }}
          initialAmount="0"
          currencySymbol={(() => {
            const symbol = getCurrencySymbol(walletCurrency);
            return symbol;
          })()}
        />

        {}
        <TransactionDetailSheet
          isVisible={isTransactionDetailVisible}
          onClose={() => {
            setIsTransactionDetailVisible(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onEdit={() => {
            
          }}
          onDelete={() => {
            
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  moreButtonContainer: {
    position: 'relative',
  },
  moreButton: {
    padding: 4,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  menu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemTextDelete: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.padding,
  },
  goalHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  goalIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalStats: {
    justifyContent: 'flex-end',
    gap: 4,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '400',
  },
  statsSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  goalInfo: {
    marginBottom: 24,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  goalTitle: {
    fontSize: 28,
    fontWeight: '500',
    color: COLORS.text,
  },
  currencyBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
  },
  currencyInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  statsContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    padding: 14,
    marginBottom: 32,
    borderRadius: 15,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progressLeft: {
    flex: 1,
  },
  progressAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressRight: {
    alignItems: 'flex-end',
  },
  progressTarget: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  progressPercentage: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressBarContainer: {
    marginVertical: 8,
    height: 5,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    backgroundColor: COLORS.background,
    marginBottom: 32,
    padding: 14,
    borderRadius: 16,
  },
  transactioSection: {
    backgroundColor: COLORS.background,
    marginBottom: 32,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  averageText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 170,
    paddingHorizontal: 4,
    marginTop: 20,
    marginBottom: 7,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartBarContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 9,
  },
  chartBar: {
    width: '100%',
    backgroundColor: '#1A1C1E',
    borderRadius: 100,
    minHeight: 4,
  },
  chartMonth: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  conversionInfo: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '40',
  },
  conversionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noTransactionsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 20,
    textAlign: 'center',
  },
  bottomButton: {
    paddingHorizontal: SIZES.padding,
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 100,
    gap: 8,
    backgroundColor: COLORS.primary,
  },
  topUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default GoalDetailSheet;
