import { supabase } from "../services/supabase.service.js";
import { convertCurrency } from "../services/currency.service.js";
import {
  addCurrencyInfoToGoal,
  addCurrencyInfoToGoals,
} from "../utils/currency-info.js";
import { getUserLanguage, translateCategory } from "../utils/translations.js";

export const goalsController = {
  createGoal: async (req, res) => {
    try {
      const {
        name,
        description,
        amount_goal,
        amount_saved,
        category_id,
        start_date,
        end_date,
        currency, 
      } = req.body;

      const user_id = req.user.id;

      if (!user_id || !name || !amount_goal || !currency) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: name, amount_goal, and currency are required",
        });
      }

      if (amount_goal < 0 || (amount_saved && amount_saved < 0)) {
        return res.status(400).json({
          success: false,
          message: "Amount goal and amount saved must be non-negative",
        });
      }

      if (amount_saved && amount_saved > amount_goal) {
        return res.status(400).json({
          success: false,
          message: "Amount saved cannot exceed amount goal",
        });
      }

      const goalsData = {
        user_id,
        name,
        description,
        amount_goal,
        amount_saved: amount_saved || 0,
        category_id,
        start_date: start_date || new Date().toISOString(),
        end_date,
        currency, 
      };

      const { data, error } = await supabase
        .from("goals")
        .insert([goalsData])
        .select(
          `
          *,
          category:categories(id, name, color, icon)
        `
        )
        .single();

      if (error) {
        throw error;
      }

      
      const goalWithCurrencyInfo = addCurrencyInfoToGoal(data);

      
      const userLanguage = await getUserLanguage(user_id, supabase);
      if (goalWithCurrencyInfo.category) {
        goalWithCurrencyInfo.category = translateCategory(
          goalWithCurrencyInfo.category,
          userLanguage
        );
      }

      return res.status(201).json({
        success: true,
        message: "Goal created successfully",
        goal: goalWithCurrencyInfo,
      });
    } catch (error) {
      console.error("Error creating goal:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
  getGoals: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      
      const { data: goals, error } = await supabase
        .from("goals")
        .select(
          `
          *,
          category:categories(id, name, color, icon)
        `
        )
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching goals:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch goals",
          error: error.message || error.code || "Unknown error",
        });
      }

      
      let totalCount = 0;
      try {
        const { count, error: countError } = await supabase
          .from("goals")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user_id);

        if (!countError && count !== null) {
          totalCount = count;
        }
      } catch (countErr) {
        
        console.warn(
          "Could not get total count, using returned data length:",
          countErr
        );
        totalCount = goals ? goals.length : 0;
      }

      
      const goalsWithCurrencyInfo = addCurrencyInfoToGoals(goals);

      
      const userLanguage = await getUserLanguage(user_id, supabase);
      if (goalsWithCurrencyInfo && goalsWithCurrencyInfo.length > 0) {
        for (const goal of goalsWithCurrencyInfo) {
          if (goal.category) {
            goal.category = translateCategory(goal.category, userLanguage);
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          goals: goalsWithCurrencyInfo || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching goals:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message || "Unknown error",
      });
    }
  },

  getGoalById: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Goal ID is required",
        });
      }

      
      const { data: goal, error: goalError } = await supabase
        .from("goals")
        .select(
          `
          *,
          category:categories(id, name, color, icon)
        `
        )
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (goalError || !goal) {
        return res.status(404).json({
          success: false,
          message: "Goal not found",
        });
      }

      
      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select(
          `
          *,
          category:categories(id, name, color, icon),
          wallet:wallets!wallet_id(id, name, currency)
        `
        )
        .eq("goal_id", id)
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

      if (transactionsError) {
        console.error("Error fetching goal transactions:", transactionsError);
        
      }

      
      const goalWithCurrencyInfo = addCurrencyInfoToGoal({
        ...goal,
        transactions: transactions || [],
      });

      
      const userLanguage = await getUserLanguage(user_id, supabase);
      if (goalWithCurrencyInfo.category) {
        goalWithCurrencyInfo.category = translateCategory(
          goalWithCurrencyInfo.category,
          userLanguage
        );
      }
      
      if (
        goalWithCurrencyInfo.transactions &&
        goalWithCurrencyInfo.transactions.length > 0
      ) {
        for (const transaction of goalWithCurrencyInfo.transactions) {
          if (transaction.category) {
            transaction.category = translateCategory(
              transaction.category,
              userLanguage
            );
          }
        }
      }

      return res.status(200).json({
        success: true,
        goal: goalWithCurrencyInfo,
      });
    } catch (error) {
      console.error("Error fetching goal:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  updateGoal: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { id } = req.params;
      const {
        name,
        description,
        amount_goal,
        amount_saved,
        category_id,
        wallet_id, 
        start_date,
        end_date,
        currency, 
      } = req.body;

      
      let wallet = null;

      
      const { data: goal, error: goalError } = await supabase
        .from("goals")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (goalError || !goal) {
        return res
          .status(404)
          .json({ success: false, message: "Goal not found" });
      }

      
      if (amount_goal !== undefined && amount_goal < 0) {
        return res.status(400).json({
          success: false,
          message: "Amount goal must be non-negative",
        });
      }
      if (amount_saved !== undefined && amount_saved < 0) {
        return res.status(400).json({
          success: false,
          message: "Amount saved must be non-negative",
        });
      }
      if (
        amount_goal !== undefined &&
        amount_saved !== undefined &&
        amount_saved > amount_goal
      ) {
        return res.status(400).json({
          success: false,
          message: "Amount saved cannot exceed amount goal",
        });
      }
      if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({
          success: false,
          message: "End date cannot be before start date",
        });
      }

      
      let topUpAmount = 0;
      let walletDeductionAmount = 0;
      let currencyConversion = null;
      const isTopUp =
        amount_saved !== undefined && amount_saved > goal.amount_saved;

      if (isTopUp) {
        
        if (!wallet_id) {
          return res.status(400).json({
            success: false,
            message: "wallet_id is required for topping up a goal",
          });
        }

        topUpAmount =
          parseFloat(amount_saved) - parseFloat(goal.amount_saved || 0);

        
        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("id, name, currency, balance, user_id")
          .eq("id", wallet_id)
          .single();

        if (walletError || !walletData) {
          return res.status(404).json({
            success: false,
            message: "Wallet not found",
          });
        }

        
        wallet = walletData;

        
        if (wallet.user_id !== user_id) {
          return res.status(403).json({
            success: false,
            message: "You don't have access to this wallet",
          });
        }

        
        const goalCurrency = goal.currency;
        const walletCurrency = wallet.currency;

        if (goalCurrency !== walletCurrency) {
          
          try {
            const conversion = await convertCurrency(
              topUpAmount,
              goalCurrency,
              walletCurrency
            );

            walletDeductionAmount = conversion.convertedAmount;
            currencyConversion = conversion;

          } catch (error) {
            return res.status(400).json({
              success: false,
              message: `Currency conversion failed: ${error.message}`,
              data: {
                goalCurrency,
                walletCurrency,
              },
            });
          }
        } else {
          
          walletDeductionAmount = topUpAmount;
        }

        
        if (wallet.balance < walletDeductionAmount) {
          return res.status(400).json({
            success: false,
            message: `Insufficient wallet balance. Need ${walletDeductionAmount.toFixed(
              2
            )} ${walletCurrency}, but wallet has ${wallet.balance.toFixed(
              2
            )} ${walletCurrency}`,
            data: {
              required: walletDeductionAmount,
              available: wallet.balance,
              currency: walletCurrency,
            },
          });
        }
      }

      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (amount_goal !== undefined) updateData.amount_goal = amount_goal;
      if (amount_saved !== undefined) updateData.amount_saved = amount_saved;
      if (category_id !== undefined) updateData.category_id = category_id;
      if (start_date !== undefined) updateData.start_date = start_date;
      if (end_date !== undefined) updateData.end_date = end_date;
      if (currency !== undefined) updateData.currency = currency;

      const { data: updatedGoal, error: updateError } = await supabase
        .from("goals")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user_id)
        .select(
          `
          *,
          category:categories(id, name, color, icon)
        `
        )
        .single();

      if (updateError) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to update goal" });
      }

      
      if (isTopUp && topUpAmount > 0) {
        try {
          const goalCurrency = goal.currency;
          const walletCurrency = wallet.currency;

          
          const transactionData = {
            wallet_id: wallet_id,
            user_id: user_id,
            type: "expense",
            amount: walletDeductionAmount, 
            category_id: 2, 
            goal_id: id, 
            name: `Goal top-up: ${goal.name}`,
            notes: currencyConversion
              ? `Top-up for goal: ${
                  goal.name
                } | Goal: ${topUpAmount} ${goalCurrency} | Wallet: ${walletDeductionAmount.toFixed(
                  2
                )} ${walletCurrency} | Exchange Rate: ${
                  currencyConversion.rate
                }`
              : `Top-up for goal: ${goal.name}`,
            date: new Date().toISOString(),
            
            exchange_rate: currencyConversion
              ? parseFloat(currencyConversion.rate)
              : null,
            original_amount: currencyConversion
              ? parseFloat(topUpAmount)
              : null,
            original_currency: currencyConversion ? goalCurrency : null,
            converted_amount: currencyConversion
              ? parseFloat(walletDeductionAmount)
              : null,
            destination_currency: currencyConversion ? walletCurrency : null,
          };

          const { data: transaction, error: transactionError } = await supabase
            .from("transactions")
            .insert([transactionData])
            .select()
            .single();

          if (transactionError) {
            console.error(
              "Error creating top-up transaction:",
              transactionError
            );
            
            await supabase
              .from("goals")
              .update({ amount_saved: goal.amount_saved })
              .eq("id", id);

            return res.status(500).json({
              success: false,
              message: "Failed to create transaction for goal top-up",
            });
          }

          
          const { error: balanceError } = await supabase.rpc(
            "update_wallet_balance",
            {
              p_wallet_id: wallet_id, 
              p_amount: -walletDeductionAmount, 
            }
          );

          if (balanceError) {
            console.error("Error updating wallet balance:", balanceError);
            
            await supabase
              .from("transactions")
              .delete()
              .eq("id", transaction.id);
            await supabase
              .from("goals")
              .update({ amount_saved: goal.amount_saved })
              .eq("id", id);

            return res.status(500).json({
              success: false,
              message: "Failed to update wallet balance",
            });
          }
        } catch (error) {
          console.error("Error processing goal top-up:", error);
          
          await supabase
            .from("goals")
            .update({ amount_saved: goal.amount_saved })
            .eq("id", id);

          return res.status(500).json({
            success: false,
            message: "Failed to process goal top-up",
          });
        }
      }

      
      const updatedGoalWithCurrencyInfo = addCurrencyInfoToGoal(updatedGoal);

      
      const userLanguage = await getUserLanguage(user_id, supabase);
      if (updatedGoalWithCurrencyInfo.category) {
        updatedGoalWithCurrencyInfo.category = translateCategory(
          updatedGoalWithCurrencyInfo.category,
          userLanguage
        );
      }

      return res.status(200).json({
        success: true,
        message: isTopUp
          ? "Goal topped up successfully"
          : "Goal updated successfully",
        goal: updatedGoalWithCurrencyInfo,
        ...(currencyConversion && {
          currencyConversion: {
            topUpAmount,
            goalCurrency: goal.currency,
            walletDeductionAmount,
            walletCurrency: wallet.currency,
            exchangeRate: currencyConversion.rate,
          },
        }),
      });
    } catch (error) {
      console.error("Error updating goal:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  deleteGoal: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { id } = req.params;

      
      const { data: goal, error: goalError } = await supabase
        .from("goals")
        .select("id")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (goalError || !goal) {
        return res
          .status(404)
          .json({ success: false, message: "Goal not found" });
      }

      const { error: deleteError } = await supabase
        .from("goals")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id);

      if (deleteError) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to delete goal" });
      }

      return res
        .status(200)
        .json({ success: true, message: "Goal deleted successfully" });
    } catch (error) {
      console.error("Error deleting goal:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
};
