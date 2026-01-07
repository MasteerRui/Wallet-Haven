import { API_ENDPOINTS } from '../constants/config';
import apiService, { ApiResponse } from './apiService';

export interface Transaction {
  id?: number;
  wallet_id: number;
  user_id?: string;
  type: 'income' | 'expense' | 'transfer' | 'transfer_out' | 'transfer_in';
  amount: number;
  date?: string;
  name?: string; 
  category_id?: number;
  notes?: string;
  tags?: string;
  items?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  file_id?: number;
  recurrence_id?: number;
  origin_wallet_id?: number;
  destination_wallet_id?: number;
  
  exchange_rate?: number;
  original_amount?: number;
  original_currency?: string;
  converted_amount?: number;
  destination_currency?: string;
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
  created_at?: string;
  updated_at?: string;
  category?: {
    id: number;
    name: string;
    color?: string;
    icon?: string;
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
}

export interface TransferResponse {
  transactions: {
    outgoing: Transaction;
    incoming: Transaction;
  };
  wallets: Array<{
    id: number;
    name: string;
    balance: number;
    currency: string;
  }>;
  currencyConversion?: {
    originalAmount: number;
    convertedAmount: number;
    rate: number;
    fromCurrency: string;
    toCurrency: string;
    source: string;
    timestamp: string;
  } | null;
  summary: {
    originalAmount: number;
    originalCurrency: string;
    convertedAmount: number;
    destinationCurrency: string;
    exchangeRate: number;
    fromWallet: {
      id: number;
      name: string;
      currency: string;
    };
    toWallet: {
      id: number;
      name: string;
      currency: string;
    };
  };
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  wallet_id?: number;
  type?: 'income' | 'expense' | 'transfer' | 'transfer_out' | 'transfer_in';
  category_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number;
  netAmount: number;
  transactionCount: number;
  byType: {
    income: number;
    expense: number;
    transfer: number;
  };
  byCategory: {
    [key: string]: {
      amount: number;
      count: number;
    };
  };
}

class TransactionService {
  
  async createTransaction(
    transaction: Transaction,
  ): Promise<ApiResponse<{ transaction: Transaction }>> {
    return apiService.post<{ transaction: Transaction }>(
      API_ENDPOINTS.transactions.create,
      transaction,
    );
  }

  async createTransactionWithFile(
    transaction: Transaction,
    file?: { uri: string; name: string; type: string },
  ): Promise<ApiResponse<{ transaction: Transaction }>> {
    const formData = new FormData();

    if (file) {
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);
    }

    Object.entries(transaction).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        
        if (
          typeof value === 'object' &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          formData.append(key, JSON.stringify(value));
        } else if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    return apiService.uploadFormData<{ transaction: Transaction }>(
      API_ENDPOINTS.transactions.create,
      formData,
    );
  }

  async getTransactions(filters?: TransactionFilters): Promise<
    ApiResponse<{
      transactions: Transaction[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean; 
      };
    }>
  > {
    const queryParams = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `${API_ENDPOINTS.transactions.list}?${queryString}`
      : API_ENDPOINTS.transactions.list;

    const response = await apiService.get(endpoint);

    const recurringTransactions = response.data?.transactions
      ?.filter((t: any) => t.recurrence_info?.is_recurring)
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        recurrence_id: t.recurrence_id,
        frequency: t.recurrence_info?.frequency,
        recentCount: t.recurrence_info?.recent_transactions?.length || 0,
        totalGenerated: t.recurrence_info?.total_generated,
      }));

    if (recurringTransactions && recurringTransactions.length > 0) {
    } else {

      const legacyRecurring = response.data?.transactions
        ?.filter((t: any) => t.recurrence_id || t.recurrence)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          recurrence_id: t.recurrence_id,
          hasLegacyRecurrence: !!t.recurrence,
        }));

      if (legacyRecurring && legacyRecurring.length > 0) {
      }
    }

    return response;
  }

  async getTransaction(
    id: number,
  ): Promise<ApiResponse<{ transaction: Transaction }>> {
    const response = await apiService.get<{ transaction: Transaction }>(
      API_ENDPOINTS.transactions.detail(id),
    );

    return response;
  }

  async updateTransaction(
    id: number,
    updates: Partial<Transaction>,
  ): Promise<ApiResponse<{ transaction: Transaction }>> {
    return apiService.put<{ transaction: Transaction }>(
      API_ENDPOINTS.transactions.update(id),
      updates,
    );
  }

  async deleteTransaction(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.transactions.delete(id));
  }

  async getStats(params?: {
    wallet_id?: number;
    start_date?: string;
    end_date?: string;
    period?: 'week' | 'month' | 'year';
  }): Promise<ApiResponse<{ stats: TransactionStats }>> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `${API_ENDPOINTS.transactions.stats}?${queryString}`
      : API_ENDPOINTS.transactions.stats;

    return apiService.get<{ stats: TransactionStats }>(endpoint);
  }

  async createIncome(
    data: {
      wallet_id: number;
      amount: number;
      name?: string;
      category_id?: number;
      notes?: string;
      tags?: string;
      date?: string;
      items?: Array<{ name: string; price: number; quantity: number }>;
      recurrence?: any;
      file_id?: number;
    },
    file?: { uri: string; name: string; type: string },
  ): Promise<ApiResponse<{ transaction: Transaction }>> {
    
    if (file) {
      return this.createTransactionWithFile(
        {
          ...data,
          type: 'income',
        } as Transaction,
        file,
      );
    }

    return this.createTransaction({
      ...data,
      type: 'income',
    } as Transaction);
  }

  async createExpense(
    data: {
      wallet_id: number;
      amount: number;
      name?: string;
      category_id?: number;
      notes?: string;
      tags?: string;
      items?: Array<{ name: string; price: number; quantity: number }>;
      date?: string;
      recurrence?: any;
      file_id?: number;
    },
    file?: { uri: string; name: string; type: string },
  ): Promise<ApiResponse<{ transaction: Transaction }>> {
    
    if (file) {
      return this.createTransactionWithFile(
        {
          ...data,
          type: 'expense',
        } as Transaction,
        file,
      );
    }

    return this.createTransaction({
      ...data,
      type: 'expense',
    } as Transaction);
  }

  async createTransfer(data: {
    origin_wallet_id: number;
    destination_wallet_id: number;
    amount: number;
    name?: string;
    notes?: string;
    date?: string;
  }): Promise<ApiResponse<{ transaction: Transaction }>> {
    return this.createTransaction({
      wallet_id: data.origin_wallet_id,
      type: 'transfer',
      amount: data.amount,
      name: data.name,
      origin_wallet_id: data.origin_wallet_id,
      destination_wallet_id: data.destination_wallet_id,
      notes: data.notes,
      date: data.date,
    });
  }

  async createTransferNew(
    data: {
      origin_wallet_id: string;
      destination_wallet_id: string;
      amount: number;
      name?: string;
      notes?: string;
      date?: string;
      recurrence?: any;
      file_id?: number;
    },
    file?: { uri: string; name: string; type: string },
  ): Promise<ApiResponse<TransferResponse>> {
    try {
      
      if (file) {
        const formData = new FormData();

        formData.append('file', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        } as any);

        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value)) {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value.toString());
            }
          }
        });

        const response = await apiService.uploadFormData(
          API_ENDPOINTS.transactions.create + '/transfer',
          formData,
        );
        return response;
      }

      const response = await apiService.post(
        API_ENDPOINTS.transactions.create + '/transfer',
        data,
      );
      return response;
    } catch (error: any) {
      console.error('Create transfer error:', error);
      return {
        success: false,
        message: error?.message || 'Failed to create transfer',
        data: undefined,
      };
    }
  }

  isTransfer(transaction: Transaction): boolean {
    return ['transfer', 'transfer_out', 'transfer_in'].includes(
      transaction.type,
    );
  }

  getTransferDirection(
    transaction: Transaction,
    walletId: number,
  ): 'outgoing' | 'incoming' | null {
    if (
      transaction.type === 'transfer_out' &&
      transaction.wallet_id === walletId
    ) {
      return 'outgoing';
    }
    if (
      transaction.type === 'transfer_in' &&
      transaction.wallet_id === walletId
    ) {
      return 'incoming';
    }
    if (transaction.type === 'transfer') {
      
      return transaction.origin_wallet_id === walletId
        ? 'outgoing'
        : 'incoming';
    }
    return null;
  }

  getWalletTransfers(
    transactions: Transaction[],
    walletId: number,
  ): Transaction[] {
    return transactions.filter(
      t =>
        (t.type === 'transfer_out' && t.wallet_id === walletId) ||
        (t.type === 'transfer_in' && t.wallet_id === walletId) ||
        (t.type === 'transfer' &&
          (t.origin_wallet_id === walletId ||
            t.destination_wallet_id === walletId)),
    );
  }

  groupTransfers(
    transactions: Transaction[],
  ): Array<{ outgoing?: Transaction; incoming?: Transaction }> {
    const transfers = transactions.filter(
      t => t.type === 'transfer_out' || t.type === 'transfer_in',
    );

    const grouped = new Map<
      string,
      { outgoing?: Transaction; incoming?: Transaction }
    >();

    transfers.forEach(t => {
      const key = `${t.origin_wallet_id}-${t.destination_wallet_id}-${t.date}`;
      if (!grouped.has(key)) {
        grouped.set(key, {});
      }

      const group = grouped.get(key)!;
      if (t.type === 'transfer_out') {
        group.outgoing = t;
      } else if (t.type === 'transfer_in') {
        group.incoming = t;
      }
    });

    return Array.from(grouped.values());
  }

  getTransactionDisplayInfo(transaction: Transaction): {
    sign: string;
    color: string;
    amount: number;
    currency: string;
    subtitle?: string;
  } {
    switch (transaction.type) {
      case 'income':
        return {
          sign: '+',
          color: 'green',
          amount: transaction.amount,
          currency: transaction.original_currency || 'USD',
        };

      case 'expense':
        return {
          sign: '-',
          color: 'red',
          amount: Math.abs(transaction.amount),
          currency: transaction.original_currency || 'USD',
        };

      case 'transfer_out':
        return {
          sign: '-',
          color: 'blue',
          amount: Math.abs(transaction.amount),
          currency: transaction.original_currency || 'USD',
          subtitle:
            transaction.exchange_rate && transaction.exchange_rate !== 1.0
              ? `→ ${transaction.converted_amount} ${transaction.destination_currency}`
              : undefined,
        };

      case 'transfer_in':
        return {
          sign: '+',
          color: 'blue',
          amount: Math.abs(transaction.amount), 
          currency: transaction.destination_currency || 'USD',
          subtitle:
            transaction.exchange_rate && transaction.exchange_rate !== 1.0
              ? `← ${transaction.original_amount} ${transaction.original_currency}`
              : undefined,
        };

      default:
        return {
          sign: '',
          color: 'black',
          amount: transaction.amount,
          currency: 'USD',
        };
    }
  }
}

export default new TransactionService();
