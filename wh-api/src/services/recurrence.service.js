import { supabase } from "./supabase.service.js";
import { transactionsController } from "../controllers/transactions.controller.js";

export const recurrenceService = {
  
  processRecurrences: async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      
      const { data: recurrences, error } = await supabase
        .from("recurrences")
        .select(
          `
          *,
          transaction:transactions!recurrences_transaction_id_fkey(
            *,
            wallet:wallets!wallet_id(id, name, currency, user_id),
            origin_wallet:wallets!origin_wallet_id(id, name, currency),
            destination_wallet:wallets!destination_wallet_id(id, name, currency),
            category:categories(id, name, color, icon)
          )
        `
        );

      if (error) {
        console.error("❌ Error fetching recurrences:", error);
        return { success: false, error: error.message };
      }

      let processedCount = 0;
      let errorCount = 0;
      const results = [];

      for (const recurrence of recurrences) {
        try {
          const shouldProcess = await shouldProcessRecurrence(
            recurrence,
            today
          );

          if (shouldProcess) {
            const result = await createTransactionFromRecurrence(recurrence);
            results.push(result);

            if (result.success) {
              processedCount++;
            } else {
              errorCount++;
            }
          }
        } catch (error) {
          console.error(
            `❌ Error processing recurrence ${recurrence.id}:`,
            error
          );
          errorCount++;
          results.push({
            success: false,
            recurrence_id: recurrence.id,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        processed: processedCount,
        errors: errorCount,
        results,
      };
    } catch (error) {
      console.error("❌ Critical error in processRecurrences:", error);
      return { success: false, error: error.message };
    }
  },

  
  getRecurrenceStats: async (user_id) => {
    try {
      const { data: recurrences, error } = await supabase
        .from("recurrences")
        .select(
          `
          *,
          transaction:transactions!recurrences_transaction_id_fkey(
            wallet:wallets!wallet_id(user_id)
          )
        `
        )
        .eq("transaction.wallet.user_id", user_id);

      if (error) {
        return { success: false, error: error.message };
      }

      const stats = {
        total: recurrences.length,
        byFrequency: {
          daily: recurrences.filter((r) => r.frequency === "daily").length,
          weekly: recurrences.filter((r) => r.frequency === "weekly").length,
          monthly: recurrences.filter((r) => r.frequency === "monthly").length,
          yearly: recurrences.filter((r) => r.frequency === "yearly").length,
        },
      };

      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  
  getNextExecutionDates: async (user_id, limit = 10) => {
    try {
      const { data: recurrences, error } = await supabase
        .from("recurrences")
        .select(
          `
          *,
          transaction:transactions!recurrences_transaction_id_fkey(
            *,
            wallet:wallets!wallet_id(id, name, currency, user_id),
            category:categories(id, name, color, icon)
          )
        `
        );

      if (error) {
        return { success: false, error: error.message };
      }

      
      const userRecurrences = recurrences.filter(
        (r) =>
          r.transaction &&
          r.transaction.wallet &&
          r.transaction.wallet.user_id === user_id
      );

      const today = new Date();
      const nextExecutions = [];

      userRecurrences.forEach((recurrence) => {
        const nextDate = getNextExecutionDate(recurrence, today);
        if (nextDate) {
          nextExecutions.push({
            recurrence_id: recurrence.id,
            name: recurrence.transaction.name,
            type: recurrence.transaction.type,
            amount: recurrence.transaction.amount,
            frequency: recurrence.frequency,
            next_execution: nextDate.toISOString(),
            wallet: recurrence.transaction.wallet,
            category: recurrence.transaction.category,
          });
        }
      });

      
      nextExecutions.sort(
        (a, b) => new Date(a.next_execution) - new Date(b.next_execution)
      );

      return {
        success: true,
        nextExecutions: nextExecutions.slice(0, limit),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  
  getGeneratedTransactions: async (recurrenceId, userId) => {
    try {
      
      const { data: recurrence, error: recurrenceError } = await supabase
        .from("recurrences")
        .select(
          `
          id,
          generated_transactions,
          transaction:transactions!recurrences_transaction_id_fkey(
            wallet:wallets!wallet_id(user_id)
          )
        `
        )
        .eq("id", recurrenceId)
        .single();

      if (recurrenceError || !recurrence) {
        return { success: false, error: "Recurrence not found" };
      }

      
      if (recurrence.transaction?.wallet?.user_id !== userId) {
        return { success: false, error: "Access denied" };
      }

      const generatedTransactionIds = recurrence.generated_transactions || [];

      if (generatedTransactionIds.length === 0) {
        return {
          success: true,
          transactions: [],
          originalTransaction: recurrence.transaction,
        };
      }

      
      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select(
          `
          *,
          wallet:wallets!wallet_id(id, name, currency),
          origin_wallet:wallets!origin_wallet_id(id, name, currency),
          destination_wallet:wallets!destination_wallet_id(id, name, currency),
          category:categories(id, name, color, icon)
        `
        )
        .in("id", generatedTransactionIds)
        .order("created_at", { ascending: false });

      if (transactionsError) {
        return { success: false, error: transactionsError.message };
      }

      return {
        success: true,
        transactions: transactions || [],
        originalTransaction: recurrence.transaction,
        totalGenerated: generatedTransactionIds.length,
      };
    } catch (error) {
      console.error("Error fetching generated transactions:", error);
      return { success: false, error: error.message };
    }
  },

  
  checkMissingTransactions: async (userId) => {
    try {

      
      const { data: recurrences, error } = await supabase
        .from("recurrences")
        .select(
          `
          *,
          transaction:transactions!recurrences_transaction_id_fkey(
            *,
            wallet:wallets!wallet_id(id, name, currency, user_id)
          )
        `
        )
        .eq("transaction.wallet.user_id", userId);

      if (error) {
        return { success: false, error: error.message };
      }

      const today = new Date();
      today.setHours(23, 59, 59, 999); 
      const missingTransactions = [];

      for (const recurrence of recurrences) {
        try {
          const startDate = new Date(recurrence.start_date);
          const endDate = recurrence.end_date
            ? new Date(recurrence.end_date)
            : today;
          const generatedTransactionIds =
            recurrence.generated_transactions || [];

          
          const expectedDates = getExpectedTransactionDates(
            recurrence,
            startDate,
            Math.min(today, endDate)
          );

          
          let actualTransactions = [];
          if (generatedTransactionIds.length > 0) {
            const { data: transactions, error: transError } = await supabase
              .from("transactions")
              .select("id, date, created_at")
              .in("id", generatedTransactionIds);

            if (!transError && transactions) {
              actualTransactions = transactions;
            }
          }

          
          const actualDates = actualTransactions.map((t) =>
            new Date(t.date).toDateString()
          );
          const missingDates = expectedDates.filter(
            (expectedDate) => !actualDates.includes(expectedDate.toDateString())
          );

          if (missingDates.length > 0) {
            missingTransactions.push({
              recurrence_id: recurrence.id,
              recurrence_name: recurrence.name,
              frequency: recurrence.frequency,
              expected_count: expectedDates.length,
              actual_count: actualTransactions.length,
              missing_dates: missingDates.map(
                (date) => date.toISOString().split("T")[0]
              ),
              last_generated:
                actualTransactions.length > 0
                  ? actualTransactions.sort(
                      (a, b) => new Date(b.created_at) - new Date(a.created_at)
                    )[0].date
                  : null,
            });
          }
        } catch (recurrenceError) {
          console.error(
            `Error checking recurrence ${recurrence.id}:`,
            recurrenceError
          );
        }
      }

      return {
        success: true,
        missing_transactions: missingTransactions,
        total_checked: recurrences.length,
        issues_found: missingTransactions.length,
      };
    } catch (error) {
      console.error("Error checking missing transactions:", error);
      return { success: false, error: error.message };
    }
  },

  
  generateMissingTransactions: async (recurrenceId, userId, missingDates) => {
    try {

      
      const { data: recurrence, error: recurrenceError } = await supabase
        .from("recurrences")
        .select(
          `
          *,
          transaction:transactions!recurrences_transaction_id_fkey(
            *,
            wallet:wallets!wallet_id(id, name, currency, user_id),
            origin_wallet:wallets!origin_wallet_id(id, name, currency),
            destination_wallet:wallets!destination_wallet_id(id, name, currency),
            category:categories(id, name, color, icon)
          )
        `
        )
        .eq("id", recurrenceId)
        .single();

      if (recurrenceError || !recurrence) {
        return { success: false, error: "Recurrence not found" };
      }

      
      if (recurrence.transaction?.wallet?.user_id !== userId) {
        return { success: false, error: "Access denied" };
      }

      const generatedTransactionIds = [];
      const errors = [];

      
      for (const dateStr of missingDates) {
        try {
          const transactionDate = new Date(dateStr);
          const result = await createTransactionFromRecurrenceForDate(
            recurrence,
            transactionDate
          );

          if (
            result.success &&
            result.transaction &&
            result.transaction.data &&
            result.transaction.data.transaction
          ) {
            generatedTransactionIds.push(
              result.transaction.data.transaction.id
            );
          } else {
            errors.push({
              date: dateStr,
              error: result.error || "Unknown error",
            });
          }
        } catch (error) {
          errors.push({ date: dateStr, error: error.message });
        }
      }

      
      if (generatedTransactionIds.length > 0) {
        const currentTransactions = recurrence.generated_transactions || [];
        const updatedTransactions = [
          ...currentTransactions,
          ...generatedTransactionIds,
        ];

        const { error: updateError } = await supabase
          .from("recurrences")
          .update({ generated_transactions: updatedTransactions })
          .eq("id", recurrenceId);

        if (updateError) {
          console.error(
            `⚠️ Failed to update recurrence ${recurrenceId} tracking:`,
            updateError
          );
        }
      }

      return {
        success: true,
        generated_count: generatedTransactionIds.length,
        error_count: errors.length,
        generated_transaction_ids: generatedTransactionIds,
        errors,
      };
    } catch (error) {
      console.error("Error generating missing transactions:", error);
      return { success: false, error: error.message };
    }
  },
};

function getExpectedTransactionDates(recurrence, startDate, endDate) {
  const expectedDates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (matchesFrequencyPattern(recurrence, startDate, currentDate)) {
      expectedDates.push(new Date(currentDate));
    }

    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return expectedDates;
}

async function createTransactionFromRecurrenceForDate(
  recurrence,
  transactionDate
) {
  try {
    
    const originalTransaction = recurrence.transaction;

    if (!originalTransaction) {
      throw new Error(
        `No original transaction found for recurrence ${recurrence.id}`
      );
    }

    
    const transactionData = {
      user_id: originalTransaction.wallet.user_id,
      wallet_id: originalTransaction.wallet_id,
      type: originalTransaction.type,
      amount: originalTransaction.amount,
      category_id: originalTransaction.category_id,
      name: originalTransaction.name,
      notes: originalTransaction.notes || "",
      tags: originalTransaction.tags,
      items: originalTransaction.items,
      date: transactionDate.toISOString(),
      recurrence_id: recurrence.id, 
    };

    
    if (originalTransaction.type === "transfer") {
      transactionData.origin_wallet_id = originalTransaction.origin_wallet_id;
      transactionData.destination_wallet_id =
        originalTransaction.destination_wallet_id;
    }

    
    const { data: newTransaction, error: transactionError } = await supabase
      .from("transactions")
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error("❌ Error creating missing transaction:", transactionError);
      throw new Error(
        `Failed to create missing transaction: ${transactionError.message}`
      );
    }

    
    const { error: balanceError } = await supabase.rpc(
      "update_wallet_balance",
      {
        p_wallet_id: newTransaction.wallet_id,
        p_amount: newTransaction.amount,
      }
    );

    if (balanceError) {
      console.error("⚠️ Error updating wallet balance:", balanceError);
      
    }

    return {
      success: true,
      recurrence_id: recurrence.id,
      transaction: {
        data: {
          transaction: newTransaction,
        },
      },
    };
  } catch (error) {
    console.error(
      `Error creating transaction from recurrence ${recurrence.id} for date ${transactionDate}:`,
      error
    );
    return {
      success: false,
      recurrence_id: recurrence.id,
      error: error.message,
    };
  }
}

async function shouldProcessRecurrence(recurrence, today) {
  const startDate = new Date(recurrence.start_date);
  const endDate = recurrence.end_date ? new Date(recurrence.end_date) : null;

  
  if (today < startDate) return false;
  if (endDate && today > endDate) return false;

  
  const generatedTransactionIds = recurrence.generated_transactions || [];
  if (generatedTransactionIds.length > 0) {
    
    const { data: todayTransactions, error: todayError } = await supabase
      .from("transactions")
      .select("id, date, created_at")
      .in("id", generatedTransactionIds)
      .gte("date", today.toISOString())
      .lt(
        "date",
        new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
      );

    if (todayError) {
      console.error(
        "Error checking today's generated transactions:",
        todayError
      );
    } else if (todayTransactions && todayTransactions.length > 0) {
      return false; 
    }
  }

  
  const { data: existingTransactions, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("recurrence_id", recurrence.id)
    .gte("date", today.toISOString())
    .lt("date", new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error("Error checking existing transactions:", error);
    return false;
  }

  if (existingTransactions && existingTransactions.length > 0) {
    return false; 
  }

  
  const shouldProcess = matchesFrequencyPattern(recurrence, startDate, today);

  if (shouldProcess) {
  } else {
  }

  return shouldProcess;
}

function matchesFrequencyPattern(recurrence, startDate, checkDate) {
  const daysDiff = Math.floor((checkDate - startDate) / (1000 * 60 * 60 * 24));

  switch (recurrence.frequency) {
    case "daily":
      return daysDiff >= 0;

    case "weekly":
      return daysDiff >= 0 && daysDiff % 7 === 0;

    case "monthly":
      const startDay = startDate.getDate();
      const checkDay = checkDate.getDate();
      return (
        checkDay === startDay ||
        (startDay > 28 &&
          checkDay ===
            new Date(
              checkDate.getFullYear(),
              checkDate.getMonth() + 1,
              0
            ).getDate())
      );

    case "yearly":
      return (
        checkDate.getMonth() === startDate.getMonth() &&
        checkDate.getDate() === startDate.getDate()
      );

    default:
      return false;
  }
}

function getNextExecutionDate(recurrence, fromDate) {
  const startDate = new Date(recurrence.start_date);
  let nextDate = new Date(Math.max(startDate, fromDate));

  
  if (
    nextDate.toDateString() === startDate.toDateString() &&
    nextDate.toDateString() === fromDate.toDateString()
  ) {
    if (matchesFrequencyPattern(recurrence, startDate, nextDate)) {
      return nextDate;
    }
  }

  
  switch (recurrence.frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case "weekly":
      const daysUntilNext =
        (7 - (((nextDate - startDate) / (1000 * 60 * 60 * 24)) % 7)) % 7;
      nextDate.setDate(nextDate.getDate() + (daysUntilNext || 7));
      break;

    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(startDate.getDate());
      
      if (nextDate.getDate() !== startDate.getDate()) {
        nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
      }
      break;

    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      nextDate.setMonth(startDate.getMonth());
      nextDate.setDate(startDate.getDate());
      break;
  }

  
  if (recurrence.end_date && nextDate > new Date(recurrence.end_date)) {
    return null;
  }

  return nextDate;
}

async function createTransactionFromRecurrence(recurrence) {
  try {
    
    const originalTransaction = recurrence.transaction;

    if (!originalTransaction) {
      throw new Error(
        `No original transaction found for recurrence ${recurrence.id}`
      );
    }

    
    const transactionData = {
      user_id: originalTransaction.wallet.user_id,
      wallet_id: originalTransaction.wallet_id,
      type: originalTransaction.type,
      amount: originalTransaction.amount,
      category_id: originalTransaction.category_id,
      name: originalTransaction.name,
      notes: originalTransaction.notes || "",
      tags: originalTransaction.tags,
      items: originalTransaction.items,
      date: new Date().toISOString(),
      recurrence_id: recurrence.id, 
    };

    
    if (originalTransaction.type === "transfer") {
      transactionData.origin_wallet_id = originalTransaction.origin_wallet_id;
      transactionData.destination_wallet_id =
        originalTransaction.destination_wallet_id;
    }

    
    const { data: newTransaction, error: transactionError } = await supabase
      .from("transactions")
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error(
        "❌ Error creating auto-generated transaction:",
        transactionError
      );
      throw new Error(
        `Failed to create auto-generated transaction: ${transactionError.message}`
      );
    }

    
    const { error: balanceError } = await supabase.rpc(
      "update_wallet_balance",
      {
        p_wallet_id: newTransaction.wallet_id,
        p_amount: newTransaction.amount,
      }
    );

    if (balanceError) {
      console.error("⚠️ Error updating wallet balance:", balanceError);
      
    }

    
    const capturedResult = {
      success: true,
      message: "Auto-generated transaction created successfully",
      data: {
        transaction: newTransaction,
      },
    };

    
    const transactionId = newTransaction.id;

    
    if (transactionId) {
      try {
        
        const { data: currentRecurrence, error: fetchError } = await supabase
          .from("recurrences")
          .select("generated_transactions")
          .eq("id", recurrence.id)
          .single();

        if (!fetchError && currentRecurrence) {
          const currentTransactions =
            currentRecurrence.generated_transactions || [];

          
          if (!currentTransactions.includes(transactionId)) {
            const updatedTransactions = [...currentTransactions, transactionId];

            
            const { error: updateError } = await supabase
              .from("recurrences")
              .update({ generated_transactions: updatedTransactions })
              .eq("id", recurrence.id);

            if (updateError) {
              console.error(
                `⚠️ Failed to update recurrence ${recurrence.id} with generated transaction ${transactionId}:`,
                updateError
              );
            } else {
            }
          } else {
          }
        } else {
          console.error(
            `⚠️ Failed to fetch recurrence ${recurrence.id}:`,
            fetchError
          );
        }
      } catch (trackingError) {
        console.error(
          `⚠️ Error tracking transaction for recurrence ${recurrence.id}:`,
          trackingError
        );
      }
    } else {
      console.error(
        `⚠️ No transaction ID found in result for recurrence ${recurrence.id}`
      );
    }

    return {
      success: true,
      recurrence_id: recurrence.id,
      transaction: capturedResult,
      transaction_id: transactionId,
    };
  } catch (error) {
    console.error(
      `Error creating transaction from recurrence ${recurrence.id}:`,
      error
    );
    return {
      success: false,
      recurrence_id: recurrence.id,
      error: error.message,
    };
  }
}

async function createRecurrenceTransfer(recurrence, transactionData) {
  try {
    
    const outgoingData = {
      ...transactionData,
      wallet_id: recurrence.origin_wallet_id,
      type: "transfer_out",
      amount: -Math.abs(transactionData.amount),
      name: `${transactionData.name} (Out)`,
    };

    const incomingData = {
      ...transactionData,
      wallet_id: recurrence.destination_wallet_id,
      type: "transfer_in",
      amount: Math.abs(transactionData.amount),
      name: `${transactionData.name} (In)`,
    };

    
    const { data: outgoingTransaction, error: outgoingError } = await supabase
      .from("transactions")
      .insert([outgoingData])
      .select("*")
      .single();

    if (outgoingError) throw outgoingError;

    
    const { data: incomingTransaction, error: incomingError } = await supabase
      .from("transactions")
      .insert([incomingData])
      .select("*")
      .single();

    if (incomingError) throw incomingError;

    
    await updateWalletBalance(
      recurrence.origin_wallet_id,
      -Math.abs(transactionData.amount)
    );
    await updateWalletBalance(
      recurrence.destination_wallet_id,
      Math.abs(transactionData.amount)
    );

    return {
      outgoing: outgoingTransaction,
      incoming: incomingTransaction,
    };
  } catch (error) {
    console.error("Error creating recurrence transfer:", error);
    throw error;
  }
}

async function updateWalletBalance(wallet_id, amount) {
  const { data, error } = await supabase.rpc("update_wallet_balance", {
    p_wallet_id: wallet_id,
    p_amount: amount,
  });

  if (error) {
    console.error(`Error updating wallet ${wallet_id} balance:`, error);
    throw error;
  }

  return data;
}
