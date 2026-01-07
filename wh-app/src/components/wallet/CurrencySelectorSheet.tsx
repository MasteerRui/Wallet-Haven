import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import walletService, { Currency } from '../../services/walletService';

interface CurrencySelectorSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (currency: Currency) => void;
  selectedCurrencyCode?: string;
}

const CurrencySelectorSheet: React.FC<CurrencySelectorSheetProps> = ({
  isVisible,
  onClose,
  onSelect,
  selectedCurrencyCode,
}) => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      loadCurrencies();
    }
  }, [isVisible]);

  const loadCurrencies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await walletService.getCurrencies();
      if (res.success && res.data?.currencies) {
        setCurrencies(res.data.currencies);
      } else {
        setError(res.message || 'Falha ao carregar moedas');
      }
    } catch (err: any) {
      console.error('Error loading currencies:', err);
      setError(err.message || 'Erro ao carregar moedas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (currency: Currency) => {
    onSelect(currency);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handle} />
        
        <View style={styles.header}>
          <Text style={styles.title}>Selecionar Moeda</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>A carregar moedas...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadCurrencies}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {currencies.map((currency) => {
              const isSelected = currency.code === selectedCurrencyCode;
              return (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyItem,
                    isSelected && styles.currencyItemSelected,
                  ]}
                  onPress={() => handleSelect(currency)}
                  activeOpacity={0.7}
                >
                  <View style={styles.currencyInfo}>
                    <View style={styles.currencyCodeContainer}>
                      <Text style={styles.currencyCode}>{currency.code}</Text>
                    </View>
                    <View style={styles.currencyDetails}>
                      <Text style={styles.currencyName}>{currency.name}</Text>
                      <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Check size={20} color={COLORS.primary} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  currencyItemSelected: {
    
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  currencyCodeContainer: {
    width: 50,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyCode: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  currencyDetails: {
    flex: 1,
  },
  currencyName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  currencySymbol: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
  },
});

export default CurrencySelectorSheet;

