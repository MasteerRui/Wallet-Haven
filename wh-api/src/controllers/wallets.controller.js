import { supabase } from "../services/supabase.service.js";
import { isCurrencySupported, SUPPORTED_CURRENCIES, getCurrencyInfo } from "../utils/currencies.js";

export const walletsController = {
  
  getUserWallets: async (req, res, next) => {
    try {
      const user_id = req.user.id;

      const { data: wallets, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", true) 
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching wallets:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch wallets",
        });
      }

      
      const walletsWithCurrencyInfo = wallets.map(wallet => {
        const currencyInfo = getCurrencyInfo(wallet.currency);
        return {
          ...wallet,
          currency_info: currencyInfo, 
        };
      });

      res.status(200).json({
        success: true,
        data: {
          wallets: walletsWithCurrencyInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  getWalletById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const { data: wallet, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .eq("is_active", true) 
        .single();

      if (error || !wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      
      const currencyInfo = getCurrencyInfo(wallet.currency);
      const walletWithCurrencyInfo = {
        ...wallet,
        currency_info: currencyInfo, 
      };

      res.status(200).json({
        success: true,
        data: {
          wallet: walletWithCurrencyInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  createWallet: async (req, res, next) => {
    try {
      const { name, initial_balance = 0, currency = "USD" } = req.body;
      const user_id = req.user.id;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Wallet name is required",
        });
      }

      
      if (initial_balance < 0) {
        return res.status(400).json({
          success: false,
          message: "Initial balance cannot be negative",
        });
      }

      
      const currencyUpper = currency.toUpperCase();
      if (!isCurrencySupported(currencyUpper)) {
        return res.status(400).json({
          success: false,
          message: `Currency "${currencyUpper}" is not supported. Please use a valid ISO 4217 currency code.`,
        });
      }

      const { data: wallet, error } = await supabase
        .from("wallets")
        .insert({
          user_id,
          name: name.trim(),
          initial_balance: parseFloat(initial_balance),
          currency: currencyUpper,
          is_active: true, 
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating wallet:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to create wallet",
        });
      }

      
      const currencyInfo = getCurrencyInfo(wallet.currency);
      const walletWithCurrencyInfo = {
        ...wallet,
        currency_info: currencyInfo, 
      };

      res.status(201).json({
        success: true,
        message: "Wallet created successfully",
        data: {
          wallet: walletWithCurrencyInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  updateWallet: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, currency } = req.body;
      const user_id = req.user.id;

      
      const { data: existingWallet, error: checkError } = await supabase
        .from("wallets")
        .select("id, is_active")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (checkError || !existingWallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      if (!existingWallet.is_active) {
        return res.status(400).json({
          success: false,
          message: "Cannot update a deleted wallet. Restore it first.",
        });
      }

      
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (currency !== undefined) {
        const currencyUpper = currency.toUpperCase();
        if (!isCurrencySupported(currencyUpper)) {
          return res.status(400).json({
            success: false,
            message: `Currency "${currencyUpper}" is not supported. Please use a valid ISO 4217 currency code.`,
          });
        }
        updateData.currency = currencyUpper;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        });
      }

      const { data: wallet, error } = await supabase
        .from("wallets")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user_id)
        .eq("is_active", true) 
        .select()
        .single();

      if (error || !wallet) {
        console.error("Error updating wallet:", error);
        return res.status(404).json({
          success: false,
          message: "Wallet not found or failed to update",
        });
      }

      
      const currencyInfo = getCurrencyInfo(wallet.currency);
      const walletWithCurrencyInfo = {
        ...wallet,
        currency_info: currencyInfo, 
      };

      res.status(200).json({
        success: true,
        message: "Wallet updated successfully",
        data: {
          wallet: walletWithCurrencyInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  deleteWallet: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, is_active")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (walletError || !wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      if (!wallet.is_active) {
        return res.status(400).json({
          success: false,
          message: "Wallet is already deleted",
        });
      }

      
      const { error } = await supabase
        .from("wallets")
        .update({ is_active: false })
        .eq("id", id)
        .eq("user_id", user_id);

      if (error) {
        console.error("Error deleting wallet:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to delete wallet",
        });
      }

      res.status(200).json({
        success: true,
        message: "Wallet deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  
  restoreWallet: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, is_active")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (walletError || !wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      if (wallet.is_active) {
        return res.status(400).json({
          success: false,
          message: "Wallet is already active",
        });
      }

      
      const { data: restoredWallet, error } = await supabase
        .from("wallets")
        .update({ is_active: true })
        .eq("id", id)
        .eq("user_id", user_id)
        .select()
        .single();

      if (error) {
        console.error("Error restoring wallet:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to restore wallet",
        });
      }

      
      const currencyInfo = getCurrencyInfo(restoredWallet.currency);
      const walletWithCurrencyInfo = {
        ...restoredWallet,
        currency_info: currencyInfo, 
      };

      res.status(200).json({
        success: true,
        message: "Wallet restored successfully",
        data: {
          wallet: walletWithCurrencyInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  getWalletBalance: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("initial_balance, balance, currency")
        .eq("id", id)
        .eq("user_id", user_id)
        .eq("is_active", true) 
        .single();

      if (walletError || !wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      
      const { count: transactionCount, error: countError } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .or(
          `wallet_id.eq.${id},origin_wallet_id.eq.${id},destination_wallet_id.eq.${id}`
        );

      if (countError) {
        console.error("Error counting transactions:", countError);
      }

      
      const currencyInfo = getCurrencyInfo(wallet.currency);

      res.status(200).json({
        success: true,
        data: {
          wallet_id: parseInt(id),
          initial_balance: wallet.initial_balance,
          current_balance: wallet.balance || wallet.initial_balance,
          currency: wallet.currency,
          currency_info: currencyInfo, 
          transaction_count: transactionCount || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  getSupportedCurrencies: async (req, res, next) => {
    try {
      res.status(200).json({
        success: true,
        data: {
          currencies: SUPPORTED_CURRENCIES,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
