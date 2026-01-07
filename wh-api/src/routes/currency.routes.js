import { Router } from "express";
import {
  convertCurrency,
  getSupportedCurrencies,
  getExchangeRate,
  getCacheStatus,
  clearRatesCache,
} from "../services/currency.service.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/currencies", async (req, res, next) => {
  try {
    const currencies = await getSupportedCurrencies();
    res.status(200).json({
      success: true,
      data: {
        currencies,
        count: currencies.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/convert", async (req, res, next) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: "Amount, fromCurrency, and toCurrency are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const result = await convertCurrency(amount, fromCurrency, toCurrency);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/rate/:from/:to", async (req, res, next) => {
  try {
    const { from, to } = req.params;

    const rate = await getExchangeRate(from.toUpperCase(), to.toUpperCase());

    res.status(200).json({
      success: true,
      data: {
        fromCurrency: from.toUpperCase(),
        toCurrency: to.toUpperCase(),
        rate,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/cache/status", (req, res) => {
  const status = getCacheStatus();
  res.status(200).json({
    success: true,
    data: status,
  });
});

router.post("/cache/clear", (req, res) => {
  clearRatesCache();
  res.status(200).json({
    success: true,
    message: "Exchange rates cache cleared",
  });
});

export default router;
