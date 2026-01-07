import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import goalService from '../../services/goalService';
import CategoryIcon from '../common/CategoryIcon';
import CategorySheet, { Category } from '../category/CategorySheet';
import DateSheet from '../common/DateSheet';
import walletService, { Wallet, Currency } from '../../services/walletService';
import CurrencySelectorSheet from '../wallet/CurrencySelectorSheet';
import CalculatorSheet from '../transaction/CalculatorSheet';
import { useTranslation } from '../../hooks/useTranslation';

interface AddGoalSheetProps {
  visible: boolean;
  onClose: () => void;
  onGoalAdded: () => void;
}

const AddGoalSheet: React.FC<AddGoalSheetProps> = ({
  visible,
  onClose,
  onGoalAdded,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amountGoal, setAmountGoal] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [categoryIcon, setCategoryIcon] = useState<string | null>(null);
  const [categoryColor, setCategoryColor] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<number | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('EUR');
  const [currencyName, setCurrencyName] = useState<string>('Euro');
  const [currencySymbol, setCurrencySymbol] = useState<string>('€');
  const [endDate, setEndDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCategorySheetVisible, setIsCategorySheetVisible] = useState(false);
  const [isDateSheetVisible, setIsDateSheetVisible] = useState(false);
  const [isWalletSheetVisible, setIsWalletSheetVisible] = useState(false);
  const [isCurrencySheetVisible, setIsCurrencySheetVisible] = useState(false);
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);

  useEffect(() => {
    if (visible) {
      loadWallets();
      
      setName('');
      setDescription('');
      setAmountGoal('');
      setCategoryId(null);
      setCategoryName(null);
      setCategoryIcon(null);
      setCategoryColor(null);
      setWalletId(null);
      setWalletName(null);
      setCurrency('EUR');
      setCurrencyName('Euro');
      setCurrencySymbol('€');
      setEndDate(null);
      setError('');
    }
  }, [visible]);

  const loadWallets = async () => {
    try {
      setLoadingWallets(true);
      const result = await walletService.getWallets();
      if (result.success && result.data?.wallets) {
        setWallets(result.data.wallets);

        const savedWalletId = await walletService.getSavedWalletId();

        if (savedWalletId && !walletId) {
          
          const savedWallet = result.data.wallets.find(
            w => w.id.toString() === savedWalletId,
          );
          if (savedWallet) {
            setWalletId(savedWallet.id);
            setWalletName(savedWallet.name);
            
            if (savedWallet.currency) {
              setCurrency(savedWallet.currency);
              if (savedWallet.currency_info) {
                setCurrencyName(savedWallet.currency_info.name);
                setCurrencySymbol(savedWallet.currency_info.symbol);
              }
            }
            return;
          }
        }

        if (result.data.wallets.length > 0 && !walletId) {
          const firstWallet = result.data.wallets[0];
          setWalletId(firstWallet.id);
          setWalletName(firstWallet.name);
          
          if (firstWallet.currency) {
            setCurrency(firstWallet.currency);
            if (firstWallet.currency_info) {
              setCurrencyName(firstWallet.currency_info.name);
              setCurrencySymbol(firstWallet.currency_info.symbol);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setLoadingWallets(false);
    }
  };

  const formatDate = (dateString: string): string => {
    
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const formatAmount = (value: string): string => {
    
    const cleaned = value.replace(/[^\d,.-]/g, '');
    return cleaned;
  };

  const handleAddGoal = async () => {
    setError('');

    if (!name.trim()) {
      setError(t('goals.nameRequired'));
      return;
    }

    if (!amountGoal || parseFloat(amountGoal.replace(',', '.')) <= 0) {
      setError(t('goals.validAmountRequired'));
      return;
    }

    if (!walletId) {
      setError(t('goals.walletRequired'));
      return;
    }

    if (!endDate) {
      setError(t('goals.endDateRequired'));
      return;
    }

    setLoading(true);

    try {
      
      const today = new Date();
      const startDate = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const amount = parseFloat(amountGoal.replace(',', '.'));

      const res = await goalService.createGoal({
        name: name.trim(),
        description: description.trim() || undefined,
        amount_goal: amount,
        wallet_id: walletId,
        currency: currency,
        category_id: categoryId || undefined,
        start_date: startDate,
        end_date: endDate,
      });

      setLoading(false);

      if (res.success) {
        
        setName('');
        setDescription('');
        setAmountGoal('');
        setCategoryId(null);
        setCategoryName(null);
        setCategoryIcon(null);
        setCategoryColor(null);
        setWalletId(null);
        setWalletName(null);
        setEndDate(null);
        onGoalAdded();
        onClose();
      } else {
        setError(res.message || t('goals.failedToCreate'));
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || t('goals.errorCreating'));
    }
  };

  const handleDateSelect = (selectedDate: Date) => {
    
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    setEndDate(`${year}-${month}-${day}`);
  };

  const handleWalletSelect = (wallet: Wallet) => {
    setWalletId(wallet.id);
    setWalletName(wallet.name);
    
    if (wallet.currency) {
      setCurrency(wallet.currency);
      if (wallet.currency_info) {
        setCurrencyName(wallet.currency_info.name);
        setCurrencySymbol(wallet.currency_info.symbol);
      }
    }
    setIsWalletSheetVisible(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {}
        <View style={styles.handle} />

        {}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTitleContainer}>
              <View>
                <Text style={styles.title}>{t('goals.newGoal')}</Text>
                <Text style={styles.subtitle}>
                  {t('goals.createNewSavingsGoal')}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>{t('goals.goalAmount')}</Text>
            <TouchableOpacity
              onPress={() => {
                setIsCalculatorVisible(true);
              }}
            >
              <Text style={styles.amountValue}>
                {currencySymbol}
                {amountGoal
                  ? amountGoal.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                  : '0'}
              </Text>
            </TouchableOpacity>
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.label}>{t('goals.goalNameLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('goals.goalNamePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.label}>{t('goals.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('goals.descriptionPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.label}>{t('goals.wallet')}</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setIsWalletSheetVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorIcon}>
                <CategoryIcon
                  iconName="Wallet"
                  size={16}
                  color={walletId ? COLORS.primary : COLORS.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.selectorText,
                  walletName && { color: COLORS.text },
                ]}
              >
                {walletName || t('goals.selectWallet')}
              </Text>
              <CategoryIcon
                iconName="ChevronRight"
                size={16}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.label}>{t('goals.currency')}</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setIsCurrencySheetVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorIcon}>
                <CategoryIcon
                  iconName="DollarSign"
                  size={16}
                  color={currency ? COLORS.primary : COLORS.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.selectorText,
                  currency && { color: COLORS.text },
                ]}
              >
                {currency
                  ? `${currency} - ${currencyName}`
                  : t('goals.selectCurrency')}
              </Text>
              <CategoryIcon
                iconName="ChevronRight"
                size={16}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
            {walletId &&
              wallets.find(w => w.id === walletId)?.currency !== currency && (
                <Text style={styles.warningText}>
                  ⚠️ {t('goals.currencyMismatchWarning', {
                    currency,
                    walletCurrency: wallets.find(w => w.id === walletId)?.currency || '',
                  })}
                </Text>
              )}
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.label}>{t('goals.category')}</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setIsCategorySheetVisible(true)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.selectorIcon,
                  categoryColor && { backgroundColor: categoryColor + '15' },
                ]}
              >
                <CategoryIcon
                  iconName={categoryIcon || 'Grid3X3'}
                  size={16}
                  color={categoryColor || COLORS.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.selectorText,
                  categoryName && { color: COLORS.text },
                ]}
              >
                {categoryName || t('goals.selectCategory')}
              </Text>
              <CategoryIcon
                iconName="ChevronRight"
                size={16}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.label}>{t('goals.endDate')}</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setIsDateSheetVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorIcon}>
                <CategoryIcon
                  iconName="Calendar"
                  size={16}
                  color={endDate ? COLORS.primary : COLORS.textMuted}
                />
              </View>
              <Text
                style={[styles.selectorText, endDate && { color: COLORS.text }]}
              >
                {endDate ? formatDate(endDate) : t('goals.selectDate')}
              </Text>
              <CategoryIcon
                iconName="ChevronRight"
                size={16}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.label}>{t('goals.startDate')}</Text>
            <View style={[styles.selector, styles.selectorDisabled]}>
              <View style={styles.selectorIcon}>
                <CategoryIcon
                  iconName="Calendar"
                  size={16}
                  color={COLORS.textMuted}
                />
              </View>
              <Text style={[styles.selectorText, { color: COLORS.textMuted }]}>
                {formatDate(new Date().toISOString().split('T')[0])} ({t('goals.today')})
              </Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          {}
          <View style={{ height: 100 }} />
        </ScrollView>

        {}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              loading && { opacity: 0.6 },
            ]}
            onPress={handleAddGoal}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('goals.createGoal')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {}
      <CategorySheet
        isVisible={isCategorySheetVisible}
        onClose={() => setIsCategorySheetVisible(false)}
        onSelect={(category: Category) => {
          setCategoryId(category.id);
          setCategoryName(category.name);
          setCategoryIcon(category.icon);
          setCategoryColor(category.color);
        }}
        selectedCategoryId={categoryId}
        type="expense"
      />

      {}
      <DateSheet
        isVisible={isDateSheetVisible}
        onClose={() => setIsDateSheetVisible(false)}
        onSelect={handleDateSelect}
        initialDate={endDate ? new Date(endDate) : new Date()}
        minDate={new Date()}
      />

      {}
      <CurrencySelectorSheet
        isVisible={isCurrencySheetVisible}
        onClose={() => setIsCurrencySheetVisible(false)}
        onSelect={selectedCurrency => {
          setCurrency(selectedCurrency.code);
          setCurrencyName(selectedCurrency.name);
          setCurrencySymbol(selectedCurrency.symbol);
          setIsCurrencySheetVisible(false);
        }}
        selectedCurrencyCode={currency}
      />

      {}
      <CalculatorSheet
        isVisible={isCalculatorVisible}
        onClose={() => setIsCalculatorVisible(false)}
        onAmountChange={setAmountGoal}
        initialAmount={amountGoal}
        currencySymbol={currencySymbol}
      />

      {}
      <Modal
        visible={isWalletSheetVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsWalletSheetVisible(false)}
      >
        <View style={styles.walletSheetContainer}>
          <View style={styles.walletSheetHandle} />
          <View style={styles.walletSheet}>
            <View style={styles.walletSheetHeader}>
              <Text style={styles.walletSheetTitle}>{t('goals.selectWalletTitle')}</Text>
              <TouchableOpacity
                onPress={() => setIsWalletSheetVisible(false)}
                style={styles.walletSheetCloseButton}
              >
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {loadingWallets ? (
              <View style={styles.walletSheetLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : (
              <ScrollView style={styles.walletSheetList}>
                {wallets.map(wallet => (
                  <TouchableOpacity
                    key={wallet.id}
                    style={[
                      styles.walletItem,
                      walletId === wallet.id && styles.walletItemSelected,
                    ]}
                    onPress={() => handleWalletSelect(wallet)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.walletItemIcon,
                        {
                          backgroundColor:
                            (wallet.color || COLORS.primary) + '20',
                        },
                      ]}
                    >
                      <CategoryIcon
                        iconName="Wallet"
                        size={20}
                        color={wallet.color || COLORS.primary}
                      />
                    </View>
                    <View style={styles.walletItemInfo}>
                      <Text style={styles.walletItemName}>{wallet.name}</Text>
                      <Text style={styles.walletItemBalance}>
                        {wallet.balance.toLocaleString('pt-PT', {
                          style: 'currency',
                          currency: wallet.currency || 'EUR',
                        })}
                      </Text>
                    </View>
                    {walletId === wallet.id && (
                      <View style={styles.walletItemCheck}>
                        <CategoryIcon
                          iconName="Check"
                          size={20}
                          color={COLORS.primary}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
                {wallets.length === 0 && (
                  <Text style={styles.walletSheetEmpty}>
                    {t('goals.noWalletsFound')}
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.padding,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: SIZES.fontSmall,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.primary,
  },
  amountContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  amountLabel: {
    fontSize: SIZES.fontSmall,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    color: COLORS.primary,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  selectorIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  warningText: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 8,
    lineHeight: 18,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: SIZES.paddingSmall + 4,
    paddingBottom: SIZES.paddingSmall + 20,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  error: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  
  walletSheetContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  walletSheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  walletSheet: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  walletSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  walletSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  walletSheetCloseButton: {
    padding: 4,
  },
  walletSheetLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletSheetList: {
    padding: SIZES.padding,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  walletItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  walletItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  walletItemInfo: {
    flex: 1,
  },
  walletItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  walletItemBalance: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  walletItemCheck: {
    marginLeft: 8,
  },
  walletSheetEmpty: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 14,
    padding: 40,
  },
});

export default AddGoalSheet;
