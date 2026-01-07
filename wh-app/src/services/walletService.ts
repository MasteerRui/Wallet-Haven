import apiService, { ApiResponse } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface Wallet {
  id: number;
  user_id?: string;
  name: string;
  initial_balance: number;
  balance: number;
  currency: string;
  currency_info?: Currency; 
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  
  color?: string;
  icon?: string;
}

export interface WalletListResponse {
  wallets: Wallet[];
}

export interface WalletBalanceResponse {
  wallet_id: number;
  initial_balance: number;
  current_balance: number;
  currency?: string;
  currency_info?: Currency;
  transaction_count: number;
}

export interface CreateWalletData {
  name: string;
  initial_balance?: number;
  currency?: string;
}

export interface UpdateWalletData {
  name?: string;
  currency?: string;
}

export interface CurrenciesResponse {
  currencies: Currency[];
}

export interface SavedWalletInfo {
  id: string;
  currency_info: Currency;
}

const walletService = {
  
  async getWallets(): Promise<ApiResponse<WalletListResponse>> {
    const res = await apiService.get<any>('/wallets');

    return res;
  },

  async getWalletById(id: number): Promise<ApiResponse<Wallet>> {
    const res = await apiService.get<any>(`/wallets/${id}`);

    if (res.success && res.data?.wallet) {
      return {
        ...res,
        data: res.data.wallet,
      };
    }
    return res;
  },

  async createWallet(walletData: CreateWalletData): Promise<ApiResponse<Wallet>> {
    const res = await apiService.post<any>('/wallets', walletData);

    if (res.success && res.data?.wallet) {
      return {
        ...res,
        data: res.data.wallet,
      };
    }
    return res;
  },

  async updateWallet(id: number, updateData: UpdateWalletData): Promise<ApiResponse<Wallet>> {
    const res = await apiService.put<any>(`/wallets/${id}`, updateData);

    if (res.success && res.data?.wallet) {
      return {
        ...res,
        data: res.data.wallet,
      };
    }
    return res;
  },

  async deleteWallet(id: number): Promise<ApiResponse<void>> {
    return apiService.delete(`/wallets/${id}`);
  },

  async restoreWallet(id: number): Promise<ApiResponse<Wallet>> {
    const res = await apiService.post<any>(`/wallets/${id}/restore`, {});

    if (res.success && res.data?.wallet) {
      return {
        ...res,
        data: res.data.wallet,
      };
    }
    return res;
  },

  async getWalletBalance(id: number): Promise<ApiResponse<WalletBalanceResponse>> {
    const res = await apiService.get<any>(`/wallets/${id}/balance`);

    return res;
  },

  async getCurrencies(): Promise<ApiResponse<CurrenciesResponse>> {

    const { getApiUrl } = require('../constants/config');
    const { API_ENDPOINTS } = require('../constants/config');
    
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.wallets.currencies), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.data?.currencies) {
        return {
          success: true,
          data: {
            currencies: data.data.currencies,
          },
        };
      }

      return {
        success: false,
        message: data.message || 'Failed to fetch currencies',
        data: { currencies: [] },
      };
    } catch (error: any) {
      console.error('Error fetching currencies:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch currencies',
        data: { currencies: [] },
      };
    }
  },

  async getSavedWalletId(): Promise<string | null> {
    try {
      const savedWalletId = await AsyncStorage.getItem('selectedWalletId');
      return savedWalletId;
    } catch (error) {
      console.error('Error loading saved wallet ID:', error);
      return null;
    }
  },

  async saveWalletId(walletId: string): Promise<void> {
    try {
      await AsyncStorage.setItem('selectedWalletId', walletId);
    } catch (error) {
      console.error('Error saving wallet ID:', error);
    }
  },

  async getSavedWalletInfo(): Promise<SavedWalletInfo | null> {
    try {
      const savedData = await AsyncStorage.getItem('selectedWalletInfo');
      if (savedData) {
        return JSON.parse(savedData);
      }
      
      const savedWalletId = await AsyncStorage.getItem('selectedWalletId');
      if (savedWalletId) {
        return { id: savedWalletId, currency_info: { code: 'EUR', name: 'Euro', symbol: '€' } };
      }
      return null;
    } catch (error) {
      console.error('Error loading saved wallet info:', error);
      return null;
    }
  },

  async saveWalletInfo(wallet: Wallet): Promise<void> {
    try {

      let currencyInfo = wallet.currency_info;
      if (!currencyInfo && wallet.currency) {
        console.warn('⚠️ [walletService] saveWalletInfo called without currency_info, fetching currencies...');
        
        try {
          const currenciesRes = await this.getCurrencies();
          if (currenciesRes.success && currenciesRes.data?.currencies) {
            const foundCurrency = currenciesRes.data.currencies.find(
              c => c.code === wallet.currency.toUpperCase()
            );
            if (foundCurrency) {
              currencyInfo = foundCurrency;
            }
          }
        } catch (error) {
          console.warn('Could not fetch currencies for wallet info:', error);
        }

        if (!currencyInfo) {
          const currencyCode = wallet.currency.toUpperCase();
          const commonSymbols: { [key: string]: string } = {
            'EUR': '€',
            'USD': '$',
            'GBP': '£',
            'JPY': '¥',
            'CNY': '¥',
            'BRL': 'R$',
            'CAD': 'C$',
            'AUD': 'A$',
            'CHF': 'CHF',
            'INR': '₹',
            'MXN': '$',
            'SGD': 'S$',
            'HKD': 'HK$',
            'NZD': 'NZ$',
            'KRW': '₩',
            'TRY': '₺',
            'RUB': '₽',
            'ZAR': 'R',
            'SEK': 'kr',
            'NOK': 'kr',
            'DKK': 'kr',
            'PLN': 'zł',
            'CZK': 'Kč',
            'HUF': 'Ft',
          };
          currencyInfo = {
            code: currencyCode,
            name: currencyCode,
            symbol: commonSymbols[currencyCode] || currencyCode,
          };
        }
      }

      if (wallet.id == null) {
        console.error('⚠️ [walletService] saveWalletInfo called with invalid wallet.id:', wallet);
        return;
      }

      const walletInfo: SavedWalletInfo = {
        id: wallet.id.toString(),
        currency_info: currencyInfo || {
          code: 'EUR',
          name: 'Euro',
          symbol: '€',
        },
      };
      await AsyncStorage.setItem('selectedWalletInfo', JSON.stringify(walletInfo));
      
      await AsyncStorage.setItem('selectedWalletId', wallet.id.toString());
    } catch (error) {
      console.error('Error saving wallet info:', error);
    }
  },

  formatCurrency(amount: number, currencyInfo?: Currency, currencyCode?: string): string {
    if (currencyInfo) {
      
      const formatted = Math.abs(amount).toFixed(2);
      const [integer, decimal] = formatted.split('.');
      const integerWithDots = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const sign = amount < 0 ? '-' : '';
      return `${sign}${currencyInfo.symbol}${integerWithDots},${decimal}`;
    }

    const symbol = currencyCode || '€';
    const formatted = Math.abs(amount).toFixed(2);
    const [integer, decimal] = formatted.split('.');
    const integerWithDots = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const sign = amount < 0 ? '-' : '';
    return `${sign}${symbol}${integerWithDots},${decimal}`;
  },
};

export default walletService;

