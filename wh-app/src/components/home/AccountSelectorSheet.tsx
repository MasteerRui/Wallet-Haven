import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Card, Wallet, Bank } from 'iconsax-react-nativejs';
import { X, Plus } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';
import walletService, { Wallet as WalletType } from '../../services/walletService';
import AddWalletSheet from '../wallet/AddWalletSheet';

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

interface AccountSelectorSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectAccount: (account: Account) => void;
  selectedAccountId?: string;
}

const AccountSelectorSheet: React.FC<AccountSelectorSheetProps> = ({
  isVisible,
  onClose,
  onSelectAccount,
  selectedAccountId,
}) => {
  const { t } = useTranslation();
  
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddWalletVisible, setIsAddWalletVisible] = useState(false);
  const hasLoadedRef = useRef(false);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {

    if (!isVisible) {
      
      hasLoadedRef.current = false;
      
      setWallets([]);
      return; 
    }

    if (isVisible && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadWallets();
    } else {
    }
  }, [isVisible]);

  useEffect(() => {
    if (loading) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
  }, [loading, shimmerAnim]);

  const loadWallets = async () => {
    setLoading(true);
    try {
      const res = await walletService.getWallets();
      if (res.success && res.data?.wallets) {
        
        let walletsWithCurrency = res.data.wallets.map((w: any) => {
          
          if (!w.currency_info && w.currency) {
            console.warn(`⚠️ [AccountSelector] Wallet ${w.id} missing currency_info, has currency: ${w.currency}`);
          }
          return w;
        });

        const walletsWithUpdatedBalances = await Promise.all(
          walletsWithCurrency.map(async (wallet: any) => {
            try {
              const balanceRes = await walletService.getWalletBalance(wallet.id);
              if (balanceRes.success && balanceRes.data) {
                return {
                  ...wallet,
                  balance: balanceRes.data.current_balance || wallet.balance,
                };
              }
              return wallet;
            } catch (error) {
              console.warn(`⚠️ [AccountSelector] Could not fetch balance for wallet ${wallet.id}:`, error);
              return wallet;
            }
          })
        );

        setWallets(walletsWithUpdatedBalances);
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertWalletToAccount = (wallet: WalletType): Account => {
    
    let type: 'checking' | 'savings' | 'card' = 'checking';
    const nameLower = wallet.name.toLowerCase();
    if (nameLower.includes('poupança') || nameLower.includes('savings')) {
      type = 'savings';
    } else if (nameLower.includes('cartão') || nameLower.includes('card') || nameLower.includes('crédito') || nameLower.includes('credit')) {
      type = 'card';
    }

    const account = {
      id: wallet.id.toString(),
      name: wallet.name,
      balance: wallet.balance,
      type,
      color: wallet.color || COLORS.primary,
      currency_info: wallet.currency_info,
    };

    if (!wallet.currency_info) {
      console.warn(`⚠️ [AccountSelector] Wallet ${wallet.id} (${wallet.name}) missing currency_info`);
    } else {
    }
    
    return account;
  };

  const accounts: Account[] = wallets.map(convertWalletToAccount);

  const getAccountIcon = (type: Account['type']) => {
    const iconProps = { size: 24, color: COLORS.textSecondary };

    switch (type) {
      case 'checking':
        return <Wallet {...iconProps} />;
      case 'savings':
        return <Bank {...iconProps} />;
      case 'card':
        return <Card {...iconProps} />;
      default:
        return <Wallet {...iconProps} />;
    }
  };

  const handleSelectAccount = (account: Account) => {
    onSelectAccount(account);
    onClose();
  };

  if (!isVisible) {
    return null;
  }

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
          <Text style={styles.title}>{t('wallet.selectAccount')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              {Array.from({ length: 3 }).map((_, index) => {
                const shimmerStyle = {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.6, 1, 0.6],
                  }),
                };
                return (
                  <Animated.View key={index} style={[styles.skeletonItem, shimmerStyle]}>
                    <View style={styles.skeletonIcon} />
                    <View style={styles.skeletonInfo}>
                      <View style={styles.skeletonName} />
                      <View style={styles.skeletonType} />
                    </View>
                    <View style={styles.skeletonBalance} />
                  </Animated.View>
                );
              })}
            </View>
          ) : accounts.length > 0 ? (
            accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountItem,
                  selectedAccountId === account.id && styles.selectedAccount,
                ]}
                onPress={() => handleSelectAccount(account)}
                activeOpacity={0.7}
              >
                <View style={styles.accountLeft}>
                  <View
                    style={[
                      styles.accountIcon,
                      { backgroundColor: `${account.color}20` },
                    ]}
                  >
                    {getAccountIcon(account.type)}
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountType}>
                      {account.type === 'checking' && t('wallet.checkingAccount')}
                      {account.type === 'savings' && t('wallet.savingsAccount')}
                      {account.type === 'card' && t('wallet.creditCard')}
                    </Text>
                  </View>
                </View>
                <View style={styles.accountRight}>
                  <Text
                    style={[
                      styles.accountBalance,
                      account.balance < 0 && styles.negativeBalance,
                    ]}
                  >
                    {walletService.formatCurrency(
                      account.balance,
                      account.currency_info,
                      account.currency_info?.code
                    )}
                  </Text>
                  {selectedAccountId === account.id && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedText}>{t('wallet.selected')}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('wallet.noWalletsFound')}</Text>
            </View>
          )}
        </ScrollView>

        {}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.addAccountButton}
            onPress={() => setIsAddWalletVisible(true)}
            activeOpacity={0.7}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addAccountText}>{t('wallet.addNewAccount')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {}
      <AddWalletSheet
        visible={isAddWalletVisible}
        onClose={() => setIsAddWalletVisible(false)}
        onWalletAdded={() => {
          loadWallets();
          setIsAddWalletVisible(false);
        }}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
  },
  title: {
    fontSize: SIZES.fontLarge,
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
    padding: SIZES.padding,
  },
  accountItem: {
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
  selectedAccount: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  accountType: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  accountRight: {
    alignItems: 'flex-end',
  },
  accountBalance: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  negativeBalance: {
    color: COLORS.error,
  },
  selectedIndicator: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  selectedText: {
    fontSize: SIZES.fontTiny,
    color: COLORS.background,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SIZES.padding,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    gap: 8,
  },
  addAccountText: {
    fontSize: SIZES.fontMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    marginRight: 12,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonName: {
    width: '60%',
    height: 16,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    marginBottom: 8,
  },
  skeletonType: {
    width: '40%',
    height: 12,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  skeletonBalance: {
    width: 80,
    height: 16,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
});

export default AccountSelectorSheet;
