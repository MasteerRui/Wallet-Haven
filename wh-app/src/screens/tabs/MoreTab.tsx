import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../constants/theme';
import { useToast } from '../../hooks/useToast';
import { RotateCcw, Wallet } from 'lucide-react-native';
import walletService from '../../services/walletService';

interface MoreTabProps {
  onSignOut?: () => void;
}

const MoreTab: React.FC<MoreTabProps> = ({ onSignOut }) => {
  const { showSuccess, showError } = useToast();
  const [restoreWalletId, setRestoreWalletId] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeWallets, setActiveWallets] = useState<any[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadWallets();
    }, []),
  );

  const loadWallets = async () => {
    setLoadingWallets(true);
    try {
      const res = await walletService.getWallets();
      if (res.success && res.data?.wallets) {
        setActiveWallets(res.data.wallets);
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setLoadingWallets(false);
    }
  };

  const handleRestoreWallet = async () => {
    const walletId = parseInt(restoreWalletId.trim());
    
    if (!restoreWalletId.trim() || isNaN(walletId)) {
      showError('Please enter a valid wallet ID');
      return;
    }

    setIsRestoring(true);
    try {
      const res = await walletService.restoreWallet(walletId);
      
      if (res.success && res.data) {
        showSuccess(`Wallet "${res.data.name || 'ID: ' + walletId}" restored successfully!`);
        setRestoreWalletId('');
        loadWallets();
      } else {
        showError(res.message || 'Failed to restore wallet');
      }
    } catch (error: any) {
      showError(error.message || 'Error restoring wallet');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Settings and options</Text>

        {}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <RotateCcw size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Restore Deleted Wallet</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Enter a wallet ID to restore a previously deleted wallet.
          </Text>
          
          <View style={styles.restoreContainer}>
            <TextInput
              style={styles.input}
              placeholder="Wallet ID"
              placeholderTextColor={COLORS.textSecondary}
              value={restoreWalletId}
              onChangeText={setRestoreWalletId}
              keyboardType="numeric"
              editable={!isRestoring}
            />
            <TouchableOpacity
              style={[styles.restoreButton, isRestoring && styles.restoreButtonDisabled]}
              onPress={handleRestoreWallet}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <RotateCcw size={18} color="#FFFFFF" />
                  <Text style={styles.restoreButtonText}>Restore</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wallet size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Active Wallets</Text>
          </View>
          {loadingWallets ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
          ) : activeWallets.length > 0 ? (
            <View style={styles.walletsList}>
              {activeWallets.map((wallet) => (
                <View key={wallet.id} style={styles.walletItem}>
                  <View style={styles.walletInfo}>
                    <Text style={styles.walletName}>{wallet.name}</Text>
                    <Text style={styles.walletDetails}>
                      ID: {wallet.id} • {wallet.currency} • {wallet.balance.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noWalletsText}>No active wallets</Text>
          )}
        </View>

        {onSignOut && (
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={onSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.padding,
  },
  title: {
    fontSize: SIZES.fontXXL,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    marginBottom: 30,
  },
  section: {
    marginBottom: 32,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: SIZES.fontLarge,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionDescription: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  restoreContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.fontMedium,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  restoreButtonDisabled: {
    opacity: 0.6,
  },
  restoreButtonText: {
    color: '#FFFFFF',
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
  },
  walletsList: {
    gap: 8,
  },
  walletItem: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  walletInfo: {
    gap: 4,
  },
  walletName: {
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
    color: COLORS.text,
  },
  walletDetails: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
  },
  noWalletsText: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  signOutButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    alignSelf: 'center',
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: SIZES.fontMedium,
    fontWeight: '600',
  },
});

export default MoreTab;

