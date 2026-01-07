

export const CURRENCY_INFO = {
  USD: { code: "USD", name: "US Dollar", symbol: "$" },
  EUR: { code: "EUR", name: "Euro", symbol: "€" },
  GBP: { code: "GBP", name: "British Pound", symbol: "£" },
  JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  BRL: { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  CHF: { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
  CNY: { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  INR: { code: "INR", name: "Indian Rupee", symbol: "₹" },
  MXN: { code: "MXN", name: "Mexican Peso", symbol: "$" },
  ZAR: { code: "ZAR", name: "South African Rand", symbol: "R" },
  SGD: { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  HKD: { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  NZD: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  SEK: { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  NOK: { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  DKK: { code: "DKK", name: "Danish Krone", symbol: "kr" },
  PLN: { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  THB: { code: "THB", name: "Thai Baht", symbol: "฿" },
  KRW: { code: "KRW", name: "South Korean Won", symbol: "₩" },
  RUB: { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  TRY: { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  IDR: { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  MYR: { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  PHP: { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  CZK: { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  ILS: { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
  AED: { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  SAR: { code: "SAR", name: "Saudi Riyal", symbol: "ر.س" },
};

export function getCurrencyInfo(currencyCode) {
  if (!currencyCode) {
    return null;
  }

  const info = CURRENCY_INFO[currencyCode.toUpperCase()];

  if (!info) {
    
    return {
      code: currencyCode.toUpperCase(),
      name: currencyCode.toUpperCase(),
      symbol: currencyCode.toUpperCase(),
    };
  }

  return info;
}

export function getCurrencySymbol(currencyCode) {
  const info = getCurrencyInfo(currencyCode);
  return info ? info.symbol : currencyCode;
}

export function getCurrencyName(currencyCode) {
  const info = getCurrencyInfo(currencyCode);
  return info ? info.name : currencyCode;
}

export function formatCurrency(amount, currencyCode, showCode = true) {
  const info = getCurrencyInfo(currencyCode);
  const symbol = info ? info.symbol : currencyCode;
  const formatted = amount.toFixed(2);

  return showCode
    ? `${symbol}${formatted} ${currencyCode}`
    : `${symbol}${formatted}`;
}

export function addCurrencyInfoToGoals(goals) {
  if (!goals || !Array.isArray(goals)) {
    return goals;
  }

  return goals.map((goal) => {
    if (goal.currency) {
      goal.currency_info = getCurrencyInfo(goal.currency);
    }

    
    if (goal.wallet && goal.wallet.currency) {
      goal.wallet.currency_info = getCurrencyInfo(goal.wallet.currency);
    }

    return goal;
  });
}

export function addCurrencyInfoToGoal(goal) {
  if (!goal) {
    return goal;
  }

  if (goal.currency) {
    goal.currency_info = getCurrencyInfo(goal.currency);
  }

  
  if (goal.wallet && goal.wallet.currency) {
    goal.wallet.currency_info = getCurrencyInfo(goal.wallet.currency);
  }

  return goal;
}
