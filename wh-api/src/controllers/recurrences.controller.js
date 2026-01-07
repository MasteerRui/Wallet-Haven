import { supabase } from "../services/supabase.service.js";
import { recurrenceService } from "../services/recurrence.service.js";

export const recurrencesController = {
  
  createRecurrence: async (req, res, next) => {
    try {
      const {
        wallet_id,
        type, 
        amount,
        frequency, 
        start_date,
        end_date,
        category_id,
        name,
        notes,
        tags,
        items,
        
        origin_wallet_id,
        destination_wallet_id,
      } = req.body;

      const user_id = req.user.id;

      
      if (!wallet_id || !type || !amount || !frequency || !start_date) {
        return res.status(400).json({
          success: false,
          message:
            "Wallet ID, type, amount, frequency, and start_date are required",
        });
      }

      
      const validTypes = ["income", "expense", "transfer_out", "transfer_in"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction type must be 'income', 'expense', 'transfer_out', or 'transfer_in'",
        });
      }

      
      const validFrequencies = ["daily", "weekly", "monthly", "yearly"];
      if (!validFrequencies.includes(frequency)) {
        return res.status(400).json({
          success: false,
          message:
            "Frequency must be 'daily', 'weekly', 'monthly', or 'yearly'",
        });
      }

      
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
      }

      
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("id", wallet_id)
        .eq("user_id", user_id)
        .single();

      if (walletError || !wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found or doesn't belong to user",
        });
      }

      
      if (type.startsWith("transfer_")) {
        if (!origin_wallet_id || !destination_wallet_id) {
          return res.status(400).json({
            success: false,
            message:
              "Origin and destination wallet IDs are required for transfers",
          });
        }

        
        const { data: wallets, error: walletsError } = await supabase
          .from("wallets")
          .select("*")
          .in("id", [origin_wallet_id, destination_wallet_id])
          .eq("user_id", user_id);

        if (walletsError || wallets.length !== 2) {
          return res.status(404).json({
            success: false,
            message: "One or both wallets not found or don't belong to user",
          });
        }
      }

      
      const { data: recurrence, error } = await supabase
        .from("recurrences")
        .insert([
          {
            user_id,
            wallet_id,
            type,
            amount,
            frequency,
            start_date,
            end_date: end_date || null,
            category_id: category_id || null,
            name: name || null,
            notes: notes || null,
            tags: tags || null,
            items: items ? JSON.stringify(items) : null,
            origin_wallet_id: origin_wallet_id || null,
            destination_wallet_id: destination_wallet_id || null,
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select("*")
        .single();

      if (error) {
        console.error("Create recurrence error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to create recurrence",
          error: error.message,
        });
      }

      res.status(201).json({
        success: true,
        message: "Recurrence created successfully",
        data: { recurrence },
      });
    } catch (error) {
      console.error("Create recurrence error:", error);
      next(error);
    }
  },

  
  getRecurrences: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const {
        page = 1,
        limit = 20,
        wallet_id,
        type,
        frequency,
        is_active,
      } = req.query;

      const offset = (page - 1) * limit;

      
      let query = supabase
        .from("recurrences")
        .select(
          `
          *,
          wallet:wallets!recurrences_wallet_id_fkey(id, name, currency, color),
          category:categories(id, name, color, icon),
          origin_wallet:wallets!recurrences_origin_wallet_id_fkey(id, name, currency),
          destination_wallet:wallets!recurrences_destination_wallet_id_fkey(id, name, currency)
        `
        )
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      
      if (wallet_id) {
        query = query.eq("wallet_id", wallet_id);
      }

      if (type) {
        const types = type.split(",").map((t) => t.trim());
        query = query.in("type", types);
      }

      if (frequency) {
        const frequencies = frequency.split(",").map((f) => f.trim());
        query = query.in("frequency", frequencies);
      }

      if (is_active !== undefined) {
        query = query.eq("is_active", is_active === "true");
      }

      const { data: recurrences, error } = await query;

      if (error) {
        console.error("Get recurrences error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch recurrences",
        });
      }

      
      let countQuery = supabase
        .from("recurrences")
        .select("id", { count: "exact" })
        .eq("user_id", user_id);

      if (wallet_id) countQuery = countQuery.eq("wallet_id", wallet_id);
      if (type) {
        const types = type.split(",").map((t) => t.trim());
        countQuery = countQuery.in("type", types);
      }
      if (frequency) {
        const frequencies = frequency.split(",").map((f) => f.trim());
        countQuery = countQuery.in("frequency", frequencies);
      }
      if (is_active !== undefined) {
        countQuery = countQuery.eq("is_active", is_active === "true");
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error("Count recurrences error:", countError);
      }

      res.json({
        success: true,
        data: {
          recurrences: recurrences || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get recurrences error:", error);
      next(error);
    }
  },

  
  getRecurrence: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const { data: recurrence, error } = await supabase
        .from("recurrences")
        .select(
          `
          *,
          wallet:wallets!recurrences_wallet_id_fkey(id, name, currency, color),
          category:categories(id, name, color, icon),
          origin_wallet:wallets!recurrences_origin_wallet_id_fkey(id, name, currency),
          destination_wallet:wallets!recurrences_destination_wallet_id_fkey(id, name, currency)
        `
        )
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (error || !recurrence) {
        return res.status(404).json({
          success: false,
          message: "Recurrence not found",
        });
      }

      res.json({
        success: true,
        data: { recurrence },
      });
    } catch (error) {
      console.error("Get recurrence error:", error);
      next(error);
    }
  },

  
  updateRecurrence: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      const updateData = { ...req.body };

      
      delete updateData.id;
      delete updateData.user_id;
      delete updateData.created_at;

      
      const { data: existingRecurrence, error: fetchError } = await supabase
        .from("recurrences")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (fetchError || !existingRecurrence) {
        return res.status(404).json({
          success: false,
          message: "Recurrence not found",
        });
      }

      
      const { data: recurrence, error } = await supabase
        .from("recurrences")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user_id)
        .select("*")
        .single();

      if (error) {
        console.error("Update recurrence error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to update recurrence",
        });
      }

      res.json({
        success: true,
        message: "Recurrence updated successfully",
        data: { recurrence },
      });
    } catch (error) {
      console.error("Update recurrence error:", error);
      next(error);
    }
  },

  
  deleteRecurrence: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      
      const { data: existingRecurrence, error: fetchError } = await supabase
        .from("recurrences")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (fetchError || !existingRecurrence) {
        return res.status(404).json({
          success: false,
          message: "Recurrence not found",
        });
      }

      
      const { error } = await supabase
        .from("recurrences")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id);

      if (error) {
        console.error("Delete recurrence error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to delete recurrence",
        });
      }

      res.json({
        success: true,
        message: "Recurrence deleted successfully",
      });
    } catch (error) {
      console.error("Delete recurrence error:", error);
      next(error);
    }
  },

  
  toggleRecurrence: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      
      const { data: existingRecurrence, error: fetchError } = await supabase
        .from("recurrences")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (fetchError || !existingRecurrence) {
        return res.status(404).json({
          success: false,
          message: "Recurrence not found",
        });
      }

      
      const { data: recurrence, error } = await supabase
        .from("recurrences")
        .update({ is_active: !existingRecurrence.is_active })
        .eq("id", id)
        .eq("user_id", user_id)
        .select("*")
        .single();

      if (error) {
        console.error("Toggle recurrence error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to toggle recurrence status",
        });
      }

      res.json({
        success: true,
        message: `Recurrence ${
          recurrence.is_active ? "activated" : "deactivated"
        } successfully`,
        data: { recurrence },
      });
    } catch (error) {
      console.error("Toggle recurrence error:", error);
      next(error);
    }
  },

  
  getUpcomingTransactions: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { days = 30, wallet_id } = req.query;

      
      let query = supabase
        .from("recurrences")
        .select(
          `
          *,
          wallet:wallets!recurrences_wallet_id_fkey(id, name, currency, color),
          category:categories(id, name, color, icon),
          origin_wallet:wallets!recurrences_origin_wallet_id_fkey(id, name, currency),
          destination_wallet:wallets!recurrences_destination_wallet_id_fkey(id, name, currency)
        `
        )
        .eq("user_id", user_id)
        .eq("is_active", true);

      if (wallet_id) {
        query = query.eq("wallet_id", wallet_id);
      }

      const { data: recurrences, error } = await query;

      if (error) {
        console.error("Get upcoming transactions error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch upcoming transactions",
        });
      }

      
      const upcoming = [];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(days));

      recurrences.forEach((recurrence) => {
        const transactions = calculateUpcomingTransactions(recurrence, endDate);
        upcoming.push(...transactions);
      });

      
      upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

      res.json({
        success: true,
        data: {
          upcomingTransactions: upcoming,
          period: {
            start: new Date().toISOString(),
            end: endDate.toISOString(),
            days: parseInt(days),
          },
        },
      });
    } catch (error) {
      console.error("Get upcoming transactions error:", error);
      next(error);
    }
  },

  
  processRecurrences: async (req, res, next) => {
    try {
      const result = await recurrenceService.processRecurrences();

      res.json({
        success: result.success,
        message: result.success
          ? `Processed ${result.processed} recurrences with ${result.errors} errors`
          : "Failed to process recurrences",
        data: result,
      });
    } catch (error) {
      console.error("Manual process recurrences error:", error);
      next(error);
    }
  },

  
  getRecurrenceStats: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const result = await recurrenceService.getRecurrenceStats(user_id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch recurrence statistics",
        });
      }

      res.json({
        success: true,
        data: { stats: result.stats },
      });
    } catch (error) {
      console.error("Get recurrence stats error:", error);
      next(error);
    }
  },

  
  getNextExecutions: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { limit = 10 } = req.query;

      const result = await recurrenceService.getNextExecutionDates(
        user_id,
        parseInt(limit)
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch next execution dates",
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get next executions error:", error);
      next(error);
    }
  },

  
  getGeneratedTransactions: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const result = await recurrenceService.getGeneratedTransactions(
        parseInt(id),
        user_id
      );

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Generated transactions retrieved successfully",
        data: {
          recurrenceId: parseInt(id),
          originalTransaction: result.originalTransaction,
          generatedTransactions: result.transactions,
          totalGenerated: result.totalGenerated,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  checkMissingTransactions: async (req, res, next) => {
    try {
      const user_id = req.user.id;

      const result = await recurrenceService.checkMissingTransactions(user_id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "Missing transactions check completed",
        data: {
          totalRecurrencesChecked: result.total_checked,
          recurrencesWithIssues: result.issues_found,
          missingTransactions: result.missing_transactions,
        },
      });
    } catch (error) {
      console.error("Check missing transactions error:", error);
      next(error);
    }
  },

  
  generateMissingTransactions: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { missing_dates } = req.body;
      const user_id = req.user.id;

      if (
        !missing_dates ||
        !Array.isArray(missing_dates) ||
        missing_dates.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "missing_dates array is required and must contain at least one date",
        });
      }

      const result = await recurrenceService.generateMissingTransactions(
        parseInt(id),
        user_id,
        missing_dates
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: `Generated ${result.generated_count} missing transactions`,
        data: {
          recurrenceId: parseInt(id),
          generatedCount: result.generated_count,
          errorCount: result.error_count,
          generatedTransactionIds: result.generated_transaction_ids,
          errors: result.errors,
        },
      });
    } catch (error) {
      console.error("Generate missing transactions error:", error);
      next(error);
    }
  },
};

function calculateUpcomingTransactions(recurrence, endDate) {
  const transactions = [];
  let currentDate = new Date(recurrence.start_date);
  const today = new Date();

  
  if (currentDate < today) {
    currentDate = getNextOccurrence(recurrence, today);
  }

  while (currentDate <= endDate) {
    
    if (recurrence.end_date && currentDate > new Date(recurrence.end_date)) {
      break;
    }

    transactions.push({
      recurrence_id: recurrence.id,
      wallet_id: recurrence.wallet_id,
      type: recurrence.type,
      amount: recurrence.amount,
      date: currentDate.toISOString(),
      name: recurrence.name,
      notes: recurrence.notes,
      category: recurrence.category,
      wallet: recurrence.wallet,
      origin_wallet: recurrence.origin_wallet,
      destination_wallet: recurrence.destination_wallet,
      frequency: recurrence.frequency,
      is_upcoming: true,
    });

    currentDate = getNextOccurrence(recurrence, currentDate);
  }

  return transactions;
}

function getNextOccurrence(recurrence, fromDate) {
  const nextDate = new Date(fromDate);

  switch (recurrence.frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
}
