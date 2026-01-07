import apiService, { ApiResponse } from './apiService';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface GoalTransaction {
  id: number;
  wallet_id: number;
  user_id?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category_id?: number;
  goal_id?: number;
  name?: string;
  notes?: string;
  date?: string;
  created_at?: string;
  
  exchange_rate?: number;
  original_amount?: number;
  original_currency?: string;
  converted_amount?: number;
  destination_currency?: string;
  category?: {
    id: number;
    name: string;
    color?: string;
    icon?: string;
  } | null;
  wallet?: {
    id: number;
    name: string;
    currency?: string;
  };
}

export interface Goal {
  id?: number;
  user_id?: string;
  name: string;
  description?: string;
  amount_goal: number;
  amount_saved?: number;
  currency?: string;
  currency_info?: Currency;
  category_id?: number;
  wallet_id: number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  category?: {
    id: number;
    name: string;
    icon?: string;
    color?: string;
  } | null;
  wallet?: {
    id: number;
    name: string;
    currency?: string;
    color?: string;
    icon?: string;
  };
  transactions?: GoalTransaction[];
}

export interface GoalListResponse {
  goals: Goal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CurrencyConversion {
  topUpAmount: number;
  goalCurrency: string;
  walletDeductionAmount: number;
  walletCurrency: string;
  exchangeRate: number;
}

export interface GoalUpdateResponse {
  goal: Goal;
  currencyConversion?: CurrencyConversion;
}

const goalService = {
  async getGoals(page = 1, limit = 20) {
    const res = await apiService.get<GoalListResponse>(
      `/goals?page=${page}&limit=${limit}`,
    );

    return res;
  },

  async getGoalById(id: number): Promise<ApiResponse<Goal>> {
    const res = await apiService.get<any>(`/goals/${id}`);

    if (res.success && res.data?.goal) {
      return {
        ...res,
        data: res.data.goal,
      };
    }
    return res;
  },

  async createGoal(goalData: Goal): Promise<ApiResponse<Goal>> {
    const res = await apiService.post<any>('/goals', goalData);

    if (res.success && res.data?.goal) {
      return {
        ...res,
        data: res.data.goal,
      };
    }
    return res;
  },

  async updateGoal(
    id: number,
    updateData: Partial<Goal>,
  ): Promise<ApiResponse<GoalUpdateResponse>> {

    const res = await apiService.put<any>(`/goals/${id}`, updateData);

    if (res.success && res.data?.goal) {
      return {
        ...res,
        data: {
          goal: res.data.goal,
          currencyConversion: res.data.currencyConversion,
        },
      };
    }
    return res;
  },

  deleteGoal(id: number) {
    return apiService.delete(`/goals/${id}`);
  },
};

export default goalService;
