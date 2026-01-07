import apiService, { ApiResponse } from './apiService';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
  created_at: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface Wallet {
  id: number;
  name: string;
  currency: string;
  currency_info?: Currency;
  balance: number;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  is_global: boolean;
}

export interface DashboardTransaction {
  id: number;
  wallet_id: number;
  user_id?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date?: string;
  name?: string;
  notes?: string;
  created_at: string;
  category?: {
    id: number;
    name: string;
    icon: string;
    color: string;
  };
  wallet?: {
    id: number;
    name: string;
    currency: string;
  };
  origin_wallet?: {
    id: number;
    name: string;
    currency: string;
  } | null;
  destination_wallet?: {
    id: number;
    name: string;
    currency: string;
  } | null;
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
}

export interface DashboardWallet {
  id: number;
  user_id?: string;
  name: string;
  initial_balance: number;
  balance: number;
  currency: string;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  currency_info: Currency;
  color?: string;
  icon?: string;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number;
  transactionCount: number;
  netAmount: number;
}

export interface DashboardSummary {
  walletsCount: number;
  categoriesCount: number;
  recentTransactionsCount: number;
  lastTransactionDate: string | null;
}

export interface DashboardData {
  user: {
    name: string;
    email: string;
    is_email_verified: boolean;
    biometric_enabled: boolean;
    preferences_json: any;
  };
  wallets: DashboardWallet[];
  totalBalance: number;
  recentTransactions: DashboardTransaction[];
  categories: Category[];
  monthlyStats: MonthlyStats;
  summary: DashboardSummary;
}

class DashboardService {
  
  async loadDashboard(walletId?: number): Promise<ApiResponse<DashboardData>> {
    const endpoint = walletId
      ? `/dashboard?wallet_id=${walletId}`
      : '/dashboard';
    return apiService.get<DashboardData>(endpoint);
  }

  async loadSummary(): Promise<ApiResponse<DashboardSummary>> {
    return apiService.get<DashboardSummary>('/dashboard/summary');
  }
}

export default new DashboardService();
