
export const API_CONFIG = {
  
  BASE_URL: 'http://192.168.1.126:3000/api',

};

export const API_ENDPOINTS = {
  auth: {
    signup: '/auth/signup',
    signin: '/auth/signin',
    signout: '/auth/signout',
    user: '/auth/user',
    refresh: '/auth/refresh',
    google: {
      url: '/auth/google/url',
      callback: '/auth/google/callback',
      signin: '/auth/google/signin',
    },
  },
  verification: {
    sendCode: '/verification/send-code',
    verifyCode: '/verification/verify-code',
    resendCode: '/verification/resend-code',
  },
  passwordReset: {
    request: '/password-reset/request',
    verify: '/password-reset/verify-code',
    reset: '/password-reset/reset',
  },
  ocrai: {
    process: '/ocrai/process',
    createTransactions: '/ocrai/create-transactions',
    pending: '/ocrai/pending',
    batchProcess: '/ocrai/batch-process',
  },
  transactions: {
    list: '/transactions',
    create: '/transactions',
    detail: (id: number) => `/transactions/${id}`,
    update: (id: number) => `/transactions/${id}`,
    delete: (id: number) => `/transactions/${id}`,
    stats: '/transactions/stats',
  },
  dashboard: {
    full: '/dashboard',
    summary: '/dashboard/summary',
  },
  categories: {
    list: '/categories',
    create: '/categories',
    update: (id: number) => `/categories/${id}`,
    delete: (id: number) => `/categories/${id}`,
  },
  goals: {
    list: '/goals',
    create: '/goals',
    detail: (id: number) => `/goals/${id}`,
    update: (id: number) => `/goals/${id}`,
    delete: (id: number) => `/goals/${id}`,
  },
  wallets: {
    list: '/wallets',
    create: '/wallets',
    detail: (id: number) => `/wallets/${id}`,
    update: (id: number) => `/wallets/${id}`,
    delete: (id: number) => `/wallets/${id}`,
    restore: (id: number) => `/wallets/${id}/restore`,
    balance: (id: number) => `/wallets/${id}/balance`,
    currencies: '/wallets/currencies',
  },
  settings: {
    get: '/user/settings',
    setPin: '/user/settings/pin',
    verifyPin: '/user/settings/pin/verify',
    removePin: '/user/settings/pin',
    setBiometric: '/user/settings/biometric',
    updatePreferences: '/user/settings/preferences',
  },
};

export const getApiUrl = (endpoint: string) =>
  `${API_CONFIG.BASE_URL}${endpoint}`;
