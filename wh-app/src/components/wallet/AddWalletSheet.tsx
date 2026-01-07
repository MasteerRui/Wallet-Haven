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
import { useTranslation } from '../../hooks/useTranslation';
import walletService from '../../services/walletService';
import CurrencySelectorSheet from './CurrencySelectorSheet';
import { useToast } from '../../hooks/useToast';
import CategoryIcon from '../common/CategoryIcon';

interface AddWalletSheetProps {
  visible: boolean;
  onClose: () => void;
  onWalletAdded?: () => void;
}

const AddWalletSheet: React.FC<AddWalletSheetProps> = ({
  visible,
  onClose,
  onWalletAdded,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [currencyName, setCurrencyName] = useState('Euro');
  const [currencySymbol, setCurrencySymbol] = useState('€');
  const [loading, setLoading] = useState(false);
  const [isCurrencySheetVisible, setIsCurrencySheetVisible] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (visible) {
      setName('');
      setInitialBalance('');
      setCurrency('EUR');
      setCurrencyName('Euro');
      setCurrencySymbol('€');
    }
  }, [visible]);

  const formatAmount = (value: string): string => {
    
    const cleaned = value.replace(/[^\d,.-]/g, '');
    return cleaned;
  };

  const parseAmount = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleCreateWallet = async () => {
    
    if (!name.trim()) {
      showError(t('wallet.walletNameRequired'));
      return;
    }

    setLoading(true);

    try {
      const balance = parseAmount(initialBalance);
      
      const res = await walletService.createWallet({
        name: name.trim(),
        initial_balance: balance,
        currency: currency.toUpperCase(),
      });

      setLoading(false);

      if (res.success && res.data) {
        
        setName('');
        setInitialBalance('');
        setCurrency('EUR');
        setCurrencyName('Euro');
        setCurrencySymbol('€');
        
        showSuccess(t('wallet.walletCreated'));
        
        if (onWalletAdded) {
          onWalletAdded();
        }
        onClose();
      } else {
        showError(res.message || t('wallet.failedToCreateWallet'));
      }
    } catch (err: any) {
      setLoading(false);
      showError(err.message || t('wallet.errorCreatingWallet'));
    }
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
                <Text style={styles.title}>{t('wallet.newWallet')}</Text>
                <Text style={styles.subtitle}>{t('wallet.createNewWallet')}</Text>
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
          <View style={styles.section}>
            <Text style={styles.label}>{t('wallet.walletName')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('wallet.walletName')}
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.label}>{t('wallet.initialBalance')}</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textMuted}
              value={initialBalance}
              onChangeText={(value) => setInitialBalance(formatAmount(value))}
              keyboardType="numeric"
            />
            <Text style={styles.hint}>
              {t('wallet.initialBalanceHint')}
            </Text>
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.label}>{t('wallet.currency')}</Text>
            <TouchableOpacity
              style={styles.currencySelector}
              onPress={() => setIsCurrencySheetVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.currencySelectorIcon}>
                <CategoryIcon
                  iconName="DollarSign"
                  size={16}
                  color={currency ? COLORS.primary : COLORS.textMuted}
                />
              </View>
              <Text style={[
                styles.currencySelectorText,
                currency && { color: COLORS.text }
              ]}>
                {currency ? `${currency} - ${currencyName}` : t('wallet.selectCurrency')}
              </Text>
              <CategoryIcon
                iconName="ChevronRight"
                size={16}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {}
          <TouchableOpacity
            style={[
              styles.createButton,
              loading && styles.createButtonDisabled,
            ]}
            onPress={handleCreateWallet}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>{t('wallet.createWallet')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {}
        <CurrencySelectorSheet
          isVisible={isCurrencySheetVisible}
          onClose={() => setIsCurrencySheetVisible(false)}
          onSelect={(selectedCurrency) => {
            setCurrency(selectedCurrency.code);
            setCurrencyName(selectedCurrency.name);
            setCurrencySymbol(selectedCurrency.symbol);
            setIsCurrencySheetVisible(false);
          }}
          selectedCurrencyCode={currency}
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
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: SIZES.fontLarge,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.fontSmall,
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
    paddingHorizontal: SIZES.paddingSmall + 4,
    paddingBottom: 40,
  },
  errorContainer: {
    backgroundColor: COLORS.error + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    marginHorizontal: SIZES.paddingSmall + 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.fontSmall,
  },
  section: {
    marginBottom: SIZES.paddingSmall + 2,
  },
  label: {
    fontSize: SIZES.fontSmall,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hint: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  currencySelectorIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySelectorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
  },
});

export default AddWalletSheet;

