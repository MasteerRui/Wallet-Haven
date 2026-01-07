

const FALLBACK_EXCHANGE_RATES = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  JPY: 110.0,
  BRL: 5.2,
  CAD: 1.25,
  AUD: 1.35,
  CHF: 0.92,
  CNY: 6.45,
  INR: 74.5,
};

let ratesCache = {
  rates: null,
  timestamp: null,
  expiresIn: 3600000, 
};

export const fetchRealTimeRates = async () => {
  try {
    
    if (ratesCache.rates && ratesCache.timestamp) {
      const now = Date.now();
      const timeDiff = now - ratesCache.timestamp;

      if (timeDiff < ratesCache.expiresIn) {
        return ratesCache.rates;
      }
    }

    
    
    const API_URL = "https://api.exchangerate-api.com/v4/latest/USD";

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.rates) {
      throw new Error("Invalid API response format");
    }

    
    ratesCache.rates = data.rates;
    ratesCache.timestamp = Date.now();

    return data.rates;
  } catch (error) {
    console.error("Failed to fetch real-time rates:", error.message);
    return FALLBACK_EXCHANGE_RATES;
  }
};

export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    
    if (fromCurrency === toCurrency) {
      return {
        convertedAmount: amount,
        rate: 1.0,
        fromCurrency,
        toCurrency,
        originalAmount: amount,
        source: "no-conversion",
      };
    }

    
    const rates = await fetchRealTimeRates();

    
    if (!rates[fromCurrency] || !rates[toCurrency]) {
      throw new Error(`Unsupported currency: ${fromCurrency} or ${toCurrency}`);
    }

    
    let convertedAmount;
    let rate;

    if (fromCurrency === "USD") {
      
      convertedAmount = amount * rates[toCurrency];
      rate = rates[toCurrency];
    } else if (toCurrency === "USD") {
      
      convertedAmount = amount / rates[fromCurrency];
      rate = 1 / rates[fromCurrency];
    } else {
      
      const amountInUSD = amount / rates[fromCurrency];
      convertedAmount = amountInUSD * rates[toCurrency];
      rate = rates[toCurrency] / rates[fromCurrency];
    }

    return {
      convertedAmount: Math.round(convertedAmount * 100) / 100, 
      rate: Math.round(rate * 10000) / 10000, 
      fromCurrency,
      toCurrency,
      originalAmount: amount,
      source: ratesCache.timestamp ? "api" : "fallback",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Currency conversion failed: ${error.message}`);
  }
};

export const getSupportedCurrencies = async () => {
  try {
    const rates = await fetchRealTimeRates();
    return Object.keys(rates);
  } catch (error) {
    console.error("Error getting supported currencies:", error);
    return Object.keys(FALLBACK_EXCHANGE_RATES);
  }
};

export const getExchangeRate = async (fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return 1.0;

  try {
    const rates = await fetchRealTimeRates();

    if (!rates[fromCurrency] || !rates[toCurrency]) {
      throw new Error(`Unsupported currency: ${fromCurrency} or ${toCurrency}`);
    }

    if (fromCurrency === "USD") {
      return rates[toCurrency];
    } else if (toCurrency === "USD") {
      return 1 / rates[fromCurrency];
    } else {
      return rates[toCurrency] / rates[fromCurrency];
    }
  } catch (error) {
    console.error("Error getting exchange rate:", error);
    throw error;
  }
};

export const clearRatesCache = () => {
  ratesCache.rates = null;
  ratesCache.timestamp = null;
};

export const getCacheStatus = () => {
  if (!ratesCache.timestamp) {
    return { status: "empty" };
  }

  const now = Date.now();
  const age = now - ratesCache.timestamp;
  const isExpired = age >= ratesCache.expiresIn;

  return {
    status: isExpired ? "expired" : "valid",
    age: Math.round(age / 1000 / 60), 
    currencies: ratesCache.rates ? Object.keys(ratesCache.rates).length : 0,
  };
};
