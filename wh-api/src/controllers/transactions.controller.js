import { supabase } from "../services/supabase.service.js";
import { config } from "../config/env.js";
import { convertCurrency } from "../services/currency.service.js";
import { getUserLanguage, translateCategory } from "../utils/translations.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadTransactionFile = async (file, userId) => {
  try {
    if (!file) {
      console.error("uploadTransactionFile: missing file");
      return null;
    }

    const bucket = config.SUPABASE_STORAGE_BUCKET || "main";
    const fileExt = path.extname(file.originalname);
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const objectName = `transaction-receipts/${userId}/${timestamp}-${random}${fileExt}`;

    
    const fileBuffer = fs.readFileSync(file.path);

    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectName, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error("uploadTransactionFile: storage upload error:", uploadError);
      return null;
    }

    
    const storagePath = uploadData?.path || objectName;

    
    const { data: fileRecord, error: fileInsertError} = await supabase
      .from("files")
      .insert({
        user_id: userId,
        file_url: storagePath,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
      })
      .select()
      .single();

    if (fileInsertError) {
      console.error("uploadTransactionFile: file insert error:", fileInsertError);
      await supabase.storage.from(bucket).remove([storagePath]);
      return null;
    }

    
    try {
      fs.unlinkSync(file.path);
    } catch (unlinkErr) {
      console.error("Failed to delete local file:", unlinkErr);
    }

    return {
      fileId: fileRecord.id,
      storagePath: storagePath,
    };
  } catch (err) {
    console.error("uploadTransactionFile: unexpected error:", err);
    return null;
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, WEBP, and PDF are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
});

export const transactionsController = {
  
  uploadMiddleware: upload.single("file"),

  
  createTransaction: async (req, res, next) => {
    try {
      
      let uploadedFileId = null;
      if (req.file) {
        const user_id = req.user.id;
        const uploadResult = await uploadTransactionFile(req.file, user_id);
        
        if (!uploadResult) {
          return res.status(500).json({
            success: false,
            message: "Failed to upload file",
          });
        }
        
        uploadedFileId = uploadResult.fileId;
      }

      const {
        wallet_id,
        type, 
        amount,
        origin_wallet_id,
        destination_wallet_id,
        category_id,
        name, 
        notes,
        tags,
        items,
        file_id, 
        recurrence_id,
        date, 
        
        recurrence,
      } = req.body;

      const user_id = req.user.id;

      
      const finalFileId = uploadedFileId || file_id || null;

      
      const transactionDate = date || new Date().toISOString();

      
      if (!wallet_id || !type || !amount) {
        return res.status(400).json({
          success: false,
          message: "Wallet ID, type, and amount are required",
        });
      }

      
      const validTypes = ["transfer", "income", "expense"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction type must be 'transfer', 'income', or 'expense'",
        });
      }

      
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
      }

      
      if (type === "transfer") {
        if (!origin_wallet_id || !destination_wallet_id) {
          return res.status(400).json({
            success: false,
            message:
              "Transfer transactions require both origin and destination wallet IDs",
          });
        }

        if (origin_wallet_id === destination_wallet_id) {
          return res.status(400).json({
            success: false,
            message: "Origin and destination wallets cannot be the same",
          });
        }

        
        const { data: wallets, error: walletsError } = await supabase
          .from("wallets")
          .select("id, user_id")
          .in("id", [origin_wallet_id, destination_wallet_id]);

        if (walletsError || wallets.length !== 2) {
          return res.status(400).json({
            success: false,
            message: "Invalid wallet IDs provided",
          });
        }

        const walletsNotOwnedByUser = wallets.filter(
          (wallet) => wallet.user_id !== user_id
        );
        if (walletsNotOwnedByUser.length > 0) {
          return res.status(403).json({
            success: false,
            message: "You can only transfer between your own wallets",
          });
        }
      } else {
        
        const { data: wallet, error: walletError } = await supabase
          .from("wallets")
          .select("user_id")
          .eq("id", wallet_id)
          .single();

        if (walletError || !wallet || wallet.user_id !== user_id) {
          return res.status(403).json({
            success: false,
            message:
              "Wallet not found or you don't have permission to access it",
          });
        }
      }

      
      if (category_id) {
        const { data: category, error: categoryError } = await supabase
          .from("categories")
          .select("user_id, is_global")
          .eq("id", category_id)
          .single();

        if (categoryError || !category) {
          return res.status(400).json({
            success: false,
            message: "Category not found",
          });
        }

        
        const isAccessible = category.is_global || category.user_id === user_id;
        if (!isAccessible) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID",
          });
        }
      }

      
      
      const transactionName = name && name.trim() ? name.trim() : null;

      const transactionData = {
        wallet_id,
        user_id,
        type,
        amount: parseFloat(amount),
        date: transactionDate, 
        origin_wallet_id: type === "transfer" ? origin_wallet_id : null,
        destination_wallet_id:
          type === "transfer" ? destination_wallet_id : null,
        category_id: category_id || null,
        name: transactionName, 
        notes: notes || null, 
        tags: tags || null,
        items: items || null, 
        file_id: finalFileId, 
        recurrence_id: recurrence_id || null,
      };

      
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select()
        .single();

      if (transactionError) {
        console.error("Error creating transaction:", transactionError);
        return res.status(500).json({
          success: false,
          message: "Failed to create transaction",
        });
      }

      
      if (type === "transfer") {
        
        const { error: originUpdateError } = await supabase.rpc(
          "update_wallet_balance",
          {
            p_wallet_id: origin_wallet_id,
            p_amount: -parseFloat(amount),
          }
        );

        if (originUpdateError) {
          console.error(
            "Error updating origin wallet balance:",
            originUpdateError
          );
          
          await supabase.from("transactions").delete().eq("id", transaction.id);
          return res.status(500).json({
            success: false,
            message: "Failed to update origin wallet balance",
          });
        }

        const { error: destUpdateError } = await supabase.rpc(
          "update_wallet_balance",
          {
            p_wallet_id: destination_wallet_id,
            p_amount: parseFloat(amount),
          }
        );

        if (destUpdateError) {
          console.error(
            "Error updating destination wallet balance:",
            destUpdateError
          );
          
          await supabase.from("transactions").delete().eq("id", transaction.id);
          await supabase.rpc("update_wallet_balance", {
            p_wallet_id: origin_wallet_id,
            p_amount: parseFloat(amount), 
          });
          return res.status(500).json({
            success: false,
            message: "Failed to update destination wallet balance",
          });
        }
      } else if (type === "income") {
        
        const { error: balanceError } = await supabase.rpc(
          "update_wallet_balance",
          {
            p_wallet_id: wallet_id,
            p_amount: parseFloat(amount),
          }
        );

        if (balanceError) {
          console.error(
            "Error updating wallet balance for income:",
            balanceError
          );
          await supabase.from("transactions").delete().eq("id", transaction.id);
          return res.status(500).json({
            success: false,
            message: "Failed to update wallet balance",
          });
        }
      } else if (type === "expense") {
        
        const { error: balanceError } = await supabase.rpc(
          "update_wallet_balance",
          {
            p_wallet_id: wallet_id,
            p_amount: -parseFloat(amount),
          }
        );

        if (balanceError) {
          console.error(
            "Error updating wallet balance for expense:",
            balanceError
          );
          await supabase.from("transactions").delete().eq("id", transaction.id);
          return res.status(500).json({
            success: false,
            message: "Failed to update wallet balance",
          });
        }
      }

      
      let createdRecurrence = null;

      if (recurrence && recurrence.frequency) {

        try {
          const { data: recurrenceResult, error: recurrenceError } =
            await supabase
              .from("recurrences")
              .insert([
                {
                  transaction_id: transaction.id, 
                  frequency: recurrence.frequency,
                  start_date:
                    recurrence.start_date ||
                    new Date().toISOString().split("T")[0], 
                  end_date: recurrence.end_date
                    ? recurrence.end_date.split("T")[0]
                    : null, 
                },
              ])
              .select("*")
              .single();

          if (!recurrenceError && recurrenceResult) {
            createdRecurrence = recurrenceResult;

            
            const { error: updateError } = await supabase
              .from("transactions")
              .update({ recurrence_id: recurrenceResult.id })
              .eq("id", transaction.id);

            if (updateError) {
              console.error(
                "⚠️ Failed to update transaction with recurrence_id:",
                updateError
              );
            } else {
              
              transaction.recurrence_id = recurrenceResult.id;

              
              const { data: verifyData, error: verifyError } = await supabase
                .from("transactions")
                .select("id, recurrence_id")
                .eq("id", transaction.id)
                .single();

              if (!verifyError && verifyData) {
              } else {
                console.error(
                  "❌ Failed to verify transaction update:",
                  verifyError
                );
              }
            }
          } else if (recurrenceError) {
            console.error("⚠️ Failed to create recurrence:", recurrenceError);
            
          }
        } catch (recurrenceCreateError) {
          console.error("⚠️ Error creating recurrence:", recurrenceCreateError);
          
        }
      }

      
      let finalTransaction = transaction;
      if (createdRecurrence) {
        const { data: updatedTransaction } = await supabase
          .from("transactions")
          .select(
            `
            *,
            wallet:wallets!wallet_id(id, name, currency),
            origin_wallet:wallets!origin_wallet_id(id, name, currency),
            destination_wallet:wallets!destination_wallet_id(id, name, currency),
            category:categories(id, name, color, icon),
            file:files(id, file_url, file_name, file_type),
            recurrence:recurrences!transactions_recurrence_id_fkey(id, frequency, start_date, end_date)
          `
          )
          .eq("id", transaction.id)
          .single();

        if (updatedTransaction) {
          finalTransaction = updatedTransaction;
        }
      }

      res.status(201).json({
        success: true,
        message: createdRecurrence
          ? "Transaction and recurrence created successfully"
          : "Transaction created successfully",
        data: {
          transaction: finalTransaction,
          recurrence: createdRecurrence,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  getUserTransactions: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const {
        page = 1,
        limit = 20,
        wallet_id,
        type,
        category_id,
        start_date,
        end_date,
        search,
      } = req.query;

      
      const userLanguage = await getUserLanguage(user_id, supabase);

      const offset = (page - 1) * limit;

      

      
      let query = supabase
        .from("transactions")
        .select(
          `
          *,
          wallet:wallets!wallet_id(id, name, currency),
          origin_wallet:wallets!origin_wallet_id(id, name, currency),
          destination_wallet:wallets!destination_wallet_id(id, name, currency),
          category:categories(id, name, color, icon),
          file:files(id, file_url, file_name, file_type),
          recurrence:recurrences!transactions_recurrence_id_fkey(id, frequency, start_date, end_date)
        `
        )
        .eq("user_id", user_id)
        .order("created_at", { ascending: false }) 
        .order("date", { ascending: false }) 
        .range(offset, offset + limit - 1);

      
      if (wallet_id) {
        query = query.eq("wallet_id", wallet_id);
      }

      if (type) {
        query = query.eq("type", type);
      }

      if (category_id) {
        query = query.eq("category_id", category_id);
      }

      if (start_date) {
        query = query.gte("date", start_date);
      }

      if (end_date) {
        query = query.lte("date", end_date);
      }

      if (search) {
        query = query.or(`notes.ilike.%${search}%, tags.ilike.%${search}%`);
      }

      const { data: transactions, error: transactionsError } = await query;

      if (transactionsError) {
        console.error("Error fetching transactions:", transactionsError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch transactions",
        });
      }

      
      if (transactions && transactions.length > 0) {
        const dates = transactions.map((t) => t.date).sort();
      } else {
      }

      
      let countQuery = supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id);

      
      if (wallet_id) countQuery = countQuery.eq("wallet_id", wallet_id);
      if (type) countQuery = countQuery.eq("type", type);
      if (category_id) countQuery = countQuery.eq("category_id", category_id);
      if (start_date) countQuery = countQuery.gte("date", start_date);
      if (end_date) countQuery = countQuery.lte("date", end_date);
      if (search)
        countQuery = countQuery.or(
          `notes.ilike.%${search}%, tags.ilike.%${search}%`
        );

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error("Error counting transactions:", countError);
      }

      
      if (transactions && transactions.length > 0) {
        const bucket = config.SUPABASE_STORAGE_BUCKET || "main";

        for (const transaction of transactions) {
          
          if (transaction.items) {
            if (typeof transaction.items === "string") {
              try {
                transaction.items = JSON.parse(transaction.items);
              } catch (e) {
                console.error(
                  `Error parsing items for transaction ${transaction.id}:`,
                  e
                );
                transaction.items = null;
              }
            }
            
          }

          
          if (transaction.recurrence_id) {
            
            let recurrenceData = transaction.recurrence;

            if (!recurrenceData) {
              try {
                const { data: fetchedRecurrence, error: recurrenceError } =
                  await supabase
                    .from("recurrences")
                    .select("id, frequency, start_date, end_date")
                    .eq("id", transaction.recurrence_id)
                    .single();

                if (!recurrenceError && fetchedRecurrence) {
                  recurrenceData = fetchedRecurrence;
                }
              } catch (fetchError) {
                console.error(
                  `Error fetching recurrence data for transaction ${transaction.id}:`,
                  fetchError
                );
              }
            }

            if (recurrenceData) {
              transaction.recurrence_info = {
                is_recurring: true,
                frequency: recurrenceData.frequency,
                start_date: recurrenceData.start_date,
                end_date: recurrenceData.end_date,
              };

              
              try {
                const {
                  data: recentRecurringTransactions,
                  error: recentError,
                } = await supabase
                  .from("transactions")
                  .select("id, date, amount, created_at")
                  .eq("recurrence_id", transaction.recurrence_id)
                  .eq("user_id", user_id)
                  .neq("id", transaction.id) 
                  .order("created_at", { ascending: false })
                  .limit(5);

                if (!recentError && recentRecurringTransactions) {
                  transaction.recurrence_info.recent_transactions =
                    recentRecurringTransactions;
                  transaction.recurrence_info.total_generated =
                    recentRecurringTransactions.length + 1; 
                }
              } catch (recentError) {
                console.error(
                  `Error fetching recent recurring transactions for ${transaction.id}:`,
                  recentError
                );
              }
            } else {
              
              transaction.recurrence_info = {
                is_recurring: true,
                frequency: "unknown",
                error: "Could not fetch recurrence details",
              };
            }
          } else {
            transaction.recurrence_info = {
              is_recurring: false,
            };
          }

          if (transaction.file && transaction.file.file_url) {
            let storagePath = transaction.file.file_url;

            
            if (
              storagePath.startsWith("http://") ||
              storagePath.startsWith("https://")
            ) {
              
              transaction.file.file_url = storagePath;
            } else {
              
              const { data: signedUrlData, error: signedUrlError } =
                await supabase.storage
                  .from(bucket)
                  .createSignedUrl(storagePath, 3600); 

              if (!signedUrlError && signedUrlData?.signedUrl) {
                transaction.file.file_url = signedUrlData.signedUrl;
              } else {
                
                console.error(
                  `Error generating signed URL for file ${transaction.file.id}:`,
                  signedUrlError
                );
                transaction.file.file_url = null;
              }
            }
          }
        }
      }

      
      if (transactions && transactions.length > 0) {
        for (const transaction of transactions) {
          if (transaction.category) {
            transaction.category = translateCategory(
              transaction.category,
              userLanguage
            );
          }
        }
      }

      const total = count || 0;
      const currentPage = parseInt(page);
      const pageLimit = parseInt(limit);
      const totalPages = Math.ceil(total / pageLimit);
      const hasMore = currentPage * pageLimit < total; 

      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: currentPage,
            limit: pageLimit,
            total: total,
            totalPages: totalPages,
            hasMore: hasMore, 
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  getTransactionById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .select(
          `
          *,
          wallet:wallets!wallet_id(id, name, currency),
          origin_wallet:wallets!origin_wallet_id(id, name, currency),
          destination_wallet:wallets!destination_wallet_id(id, name, currency),
          category:categories(id, name, color, icon),
          file:files(id, file_url, file_name, file_type),
          recurrence:recurrences!transactions_recurrence_id_fkey(id, frequency, start_date, end_date)
        `
        )
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (transactionError || !transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      
      if (transaction.items) {
        if (typeof transaction.items === "string") {
          try {
            transaction.items = JSON.parse(transaction.items);
          } catch (e) {
            console.error(
              `Error parsing items for transaction ${transaction.id}:`,
              e
            );
            transaction.items = null;
          }
        }
        
      }

      
      if (transaction.file && transaction.file.file_url) {
        const bucket = config.SUPABASE_STORAGE_BUCKET || "main";
        let storagePath = transaction.file.file_url;

        
        if (
          storagePath.startsWith("http://") ||
          storagePath.startsWith("https://")
        ) {
          
          transaction.file.file_url = storagePath;
        } else {
          
          const { data: signedUrlData, error: signedUrlError } =
            await supabase.storage
              .from(bucket)
              .createSignedUrl(storagePath, 3600); 

          if (!signedUrlError && signedUrlData?.signedUrl) {
            transaction.file.file_url = signedUrlData.signedUrl;
          } else {
            console.error(
              `Error generating signed URL for file ${transaction.file.id}:`,
              signedUrlError
            );
            transaction.file.file_url = null;
          }
        }
      }

      
      if (transaction.recurrence_id) {
        
        let recurrenceData = transaction.recurrence;

        if (!recurrenceData) {
          try {
            const { data: fetchedRecurrence, error: recurrenceError } =
              await supabase
                .from("recurrences")
                .select("id, frequency, start_date, end_date")
                .eq("id", transaction.recurrence_id)
                .single();

            if (!recurrenceError && fetchedRecurrence) {
              recurrenceData = fetchedRecurrence;
            }
          } catch (fetchError) {
            console.error(
              `Error fetching recurrence data for transaction ${transaction.id}:`,
              fetchError
            );
          }
        }

        if (recurrenceData) {
          transaction.recurrence_info = {
            is_recurring: true,
            frequency: recurrenceData.frequency,
            start_date: recurrenceData.start_date,
            end_date: recurrenceData.end_date,
          };

          
          try {
            const { data: recentRecurringTransactions, error: recentError } =
              await supabase
                .from("transactions")
                .select("id, date, amount, created_at")
                .eq("recurrence_id", transaction.recurrence_id)
                .eq("user_id", user_id)
                .neq("id", transaction.id) 
                .order("created_at", { ascending: false })
                .limit(5);

            if (!recentError && recentRecurringTransactions) {
              transaction.recurrence_info.recent_transactions =
                recentRecurringTransactions;
              transaction.recurrence_info.total_generated =
                recentRecurringTransactions.length + 1; 
            }
          } catch (recentError) {
            console.error(
              `Error fetching recent recurring transactions for ${transaction.id}:`,
              recentError
            );
          }
        } else {
          
          transaction.recurrence_info = {
            is_recurring: true,
            frequency: "unknown",
            error: "Could not fetch recurrence details",
          };
        }
      } else {
        transaction.recurrence_info = {
          is_recurring: false,
        };
      }

      res.status(200).json({
        success: true,
        data: {
          transaction,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  updateTransaction: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      const { type, amount, category_id, name, notes, tags, items, date } =
        req.body;

      
      const { data: existingTransaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (fetchError || !existingTransaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      
      const updateData = {};

      if (type !== undefined) updateData.type = type;
      if (amount !== undefined) {
        if (amount <= 0) {
          return res.status(400).json({
            success: false,
            message: "Amount must be greater than 0",
          });
        }
        updateData.amount = parseFloat(amount);
      }
      if (category_id !== undefined) updateData.category_id = category_id;
      if (name !== undefined)
        updateData.name = name && name.trim() ? name.trim() : null;
      if (notes !== undefined) updateData.notes = notes;
      if (tags !== undefined) updateData.tags = tags;
      if (items !== undefined) updateData.items = items || null; 
      if (date !== undefined) updateData.date = date;

      
      if (category_id) {
        const { data: category, error: categoryError } = await supabase
          .from("categories")
          .select("user_id, is_global")
          .eq("id", category_id)
          .single();

        if (categoryError || !category) {
          return res.status(400).json({
            success: false,
            message: "Category not found",
          });
        }

        
        const isAccessible = category.is_global || category.user_id === user_id;
        if (!isAccessible) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID",
          });
        }
      }

      
      if (amount !== undefined && amount !== existingTransaction.amount) {
        const amountDifference =
          parseFloat(amount) - existingTransaction.amount;

        if (existingTransaction.type === "transfer") {
          
          await supabase.rpc("update_wallet_balance", {
            p_wallet_id: existingTransaction.origin_wallet_id,
            p_amount: -amountDifference,
          });

          await supabase.rpc("update_wallet_balance", {
            p_wallet_id: existingTransaction.destination_wallet_id,
            p_amount: amountDifference,
          });
        } else if (existingTransaction.type === "income") {
          
          await supabase.rpc("update_wallet_balance", {
            p_wallet_id: existingTransaction.wallet_id,
            p_amount: amountDifference,
          });
        } else if (existingTransaction.type === "expense") {
          
          await supabase.rpc("update_wallet_balance", {
            p_wallet_id: existingTransaction.wallet_id,
            p_amount: -amountDifference,
          });
        }
      }

      
      const { data: updatedTransaction, error: updateError } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user_id)
        .select(
          `
          *,
          origin_wallet:wallets!origin_wallet_id(id, name, currency),
          destination_wallet:wallets!destination_wallet_id(id, name, currency),
          category:categories(id, name, color, icon)
        `
        )
        .single();

      if (updateError) {
        console.error("Error updating transaction:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to update transaction",
        });
      }

      res.status(200).json({
        success: true,
        message: "Transaction updated successfully",
        data: {
          transaction: updatedTransaction,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  deleteTransaction: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      
      const { data: transaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (fetchError || !transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      
      if (transaction.type === "transfer") {
        
        await supabase.rpc("update_wallet_balance", {
          p_wallet_id: transaction.origin_wallet_id,
          p_amount: transaction.amount, 
        });

        await supabase.rpc("update_wallet_balance", {
          p_wallet_id: transaction.destination_wallet_id,
          p_amount: -transaction.amount, 
        });
      } else if (transaction.type === "income") {
        
        await supabase.rpc("update_wallet_balance", {
          p_wallet_id: transaction.wallet_id,
          p_amount: -transaction.amount,
        });
      } else if (transaction.type === "expense") {
        
        await supabase.rpc("update_wallet_balance", {
          p_wallet_id: transaction.wallet_id,
          p_amount: transaction.amount,
        });
      }

      
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id);

      if (deleteError) {
        console.error("Error deleting transaction:", deleteError);
        return res.status(500).json({
          success: false,
          message: "Failed to delete transaction",
        });
      }

      res.status(200).json({
        success: true,
        message: "Transaction deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  
  getTransactionStats: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const {
        wallet_id,
        start_date,
        end_date,
        period = "month", 
      } = req.query;

      
      let dateFilter = {};
      if (start_date && end_date) {
        dateFilter.start = start_date;
        dateFilter.end = end_date;
      } else {
        const now = new Date();
        if (period === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter.start = weekAgo.toISOString();
          dateFilter.end = now.toISOString();
        } else if (period === "month") {
          const monthAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
          );
          dateFilter.start = monthAgo.toISOString();
          dateFilter.end = now.toISOString();
        } else if (period === "year") {
          const yearAgo = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate()
          );
          dateFilter.start = yearAgo.toISOString();
          dateFilter.end = now.toISOString();
        }
      }

      
      let query = supabase
        .from("transactions")
        .select("type, amount, category_id, categories(name)")
        .eq("user_id", user_id);

      if (wallet_id) {
        query = query.eq("wallet_id", wallet_id);
      }

      if (dateFilter.start) {
        query = query.gte("date", dateFilter.start);
      }

      if (dateFilter.end) {
        query = query.lte("date", dateFilter.end);
      }

      const { data: transactions, error } = await query;

      if (error) {
        console.error("Error fetching transaction stats:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch transaction statistics",
        });
      }

      
      const stats = {
        totalIncome: 0,
        totalExpenses: 0,
        totalTransfers: 0,
        netAmount: 0,
        transactionCount: transactions.length,
        byCategory: {},
        byType: {
          income: 0,
          expense: 0,
          transfer: 0,
        },
      };

      transactions.forEach((transaction) => {
        const amount = parseFloat(transaction.amount);

        if (transaction.type === "income") {
          stats.totalIncome += amount;
          stats.byType.income += amount;
        } else if (transaction.type === "expense") {
          stats.totalExpenses += amount;
          stats.byType.expense += amount;
        } else if (transaction.type === "transfer") {
          stats.totalTransfers += amount;
          stats.byType.transfer += amount;
        }

        
        if (transaction.categories?.name) {
          const categoryName = transaction.categories.name;
          if (!stats.byCategory[categoryName]) {
            stats.byCategory[categoryName] = {
              amount: 0,
              count: 0,
            };
          }
          stats.byCategory[categoryName].amount += amount;
          stats.byCategory[categoryName].count += 1;
        }
      });

      stats.netAmount = stats.totalIncome - stats.totalExpenses;

      res.status(200).json({
        success: true,
        data: {
          stats,
          period: {
            start: dateFilter.start,
            end: dateFilter.end,
            type: period,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  transferBetweenWallets: async (req, res, next) => {
    try {
      
      let uploadedFileId = null;
      if (req.file) {
        const user_id = req.user.id;
        const uploadResult = await uploadTransactionFile(req.file, user_id);
        
        if (!uploadResult) {
          return res.status(500).json({
            success: false,
            message: "Failed to upload file",
          });
        }
        
        uploadedFileId = uploadResult.fileId;
      }

      const { origin_wallet_id, destination_wallet_id, amount, name, notes, file_id } =
        req.body;
      const user_id = req.user.id;
      
      
      const finalFileId = uploadedFileId || file_id || null;

      
      const originWalletId = parseInt(origin_wallet_id);
      const destinationWalletId = parseInt(destination_wallet_id);

      
      if (!originWalletId || !destinationWalletId || !amount) {
        return res.status(400).json({
          success: false,
          message: "Origin wallet, destination wallet, and amount are required",
        });
      }

      
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
      }

      
      if (originWalletId === destinationWalletId) {
        return res.status(400).json({
          success: false,
          message: "Origin and destination wallets cannot be the same",
        });
      }

      
      const { data: wallets, error: walletsError } = await supabase
        .from("wallets")
        .select("id, user_id, name, balance, initial_balance, currency")
        .in("id", [originWalletId, destinationWalletId]);

      if (walletsError || wallets.length !== 2) {
        return res.status(400).json({
          success: false,
          message: "Invalid wallet IDs provided",
          debug: {
            walletsError,
            walletsFound: wallets?.length || 0,
            expected: 2,
          },
        });
      }

      const walletsNotOwnedByUser = wallets.filter(
        (wallet) => wallet.user_id !== user_id
      );
      if (walletsNotOwnedByUser.length > 0) {
        return res.status(403).json({
          success: false,
          message: "You can only transfer between your own wallets",
        });
      }

      
      const originWallet = wallets.find((w) => w.id === originWalletId);
      const destinationWallet = wallets.find(
        (w) => w.id === destinationWalletId
      );

      
      if (!originWallet || !destinationWallet) {
        return res.status(404).json({
          success: false,
          message: "One or both wallets not found",
        });
      }

      
      let convertedAmount = amount;
      let exchangeRate = 1.0;
      let currencyConversion = null;

      if (originWallet.currency !== destinationWallet.currency) {
        try {
          const conversionResult = await convertCurrency(
            amount,
            originWallet.currency,
            destinationWallet.currency
          );

          convertedAmount = conversionResult.convertedAmount;
          exchangeRate = conversionResult.rate;
          currencyConversion = conversionResult;

        } catch (error) {
          return res.status(400).json({
            success: false,
            message: `Currency conversion failed: ${error.message}`,
            data: {
              originCurrency: originWallet.currency,
              destinationCurrency: destinationWallet.currency,
            },
          });
        }
      }

      
      const originCurrentBalance =
        originWallet.balance !== null
          ? originWallet.balance
          : originWallet.initial_balance || 0;

      if (originCurrentBalance < amount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance in origin wallet. Current balance: ${originCurrentBalance} ${originWallet.currency}`,
        });
      }

      
      const transactionName =
        name ||
        `Transfer from ${originWallet.name} to ${destinationWallet.name}`;

      const transferDate = new Date().toISOString();

      
      

      
      const originTransactionData = {
        wallet_id: originWalletId,
        user_id,
        type: "transfer_out",
        amount: -parseFloat(amount), 
        date: transferDate,
        origin_wallet_id: originWalletId,
        destination_wallet_id: destinationWalletId,
        name: `${transactionName} (Out)`,
        notes: currencyConversion
          ? `${notes || ""} | Sent: ${amount} ${
              originWallet.currency
            } | Exchange Rate: ${exchangeRate}`.trim()
          : notes || null,
        
        exchange_rate: currencyConversion ? parseFloat(exchangeRate) : null,
        original_amount: parseFloat(amount),
        original_currency: originWallet.currency,
        converted_amount: parseFloat(convertedAmount),
        destination_currency: destinationWallet.currency,
        file_id: finalFileId, 
      };

      
      const destinationTransactionData = {
        wallet_id: destinationWalletId,
        user_id,
        type: "transfer_in",
        amount: parseFloat(convertedAmount), 
        date: transferDate,
        origin_wallet_id: originWalletId,
        destination_wallet_id: destinationWalletId,
        name: `${transactionName} (In)`,
        notes: currencyConversion
          ? `${notes || ""} | Received: ${convertedAmount} ${
              destinationWallet.currency
            } | Exchange Rate: ${exchangeRate}`.trim()
          : notes || null,
        
        exchange_rate: currencyConversion ? parseFloat(exchangeRate) : null,
        original_amount: parseFloat(amount),
        original_currency: originWallet.currency,
        converted_amount: parseFloat(convertedAmount),
        destination_currency: destinationWallet.currency,
        file_id: finalFileId, 
      };

      
      const { data: transactions, error: transactionError } = await supabase
        .from("transactions")
        .insert([originTransactionData, destinationTransactionData])
        .select();

      if (transactionError || !transactions || transactions.length !== 2) {
        console.error(
          "Error creating transfer transactions:",
          transactionError
        );
        return res.status(500).json({
          success: false,
          message: "Failed to create transfer transactions",
          error: transactionError,
        });
      }

      const [originTransaction, destinationTransaction] = transactions;

      
      
      const { error: originUpdateError } = await supabase.rpc(
        "update_wallet_balance",
        {
          p_wallet_id: originWalletId,
          p_amount: -parseFloat(amount), 
        }
      );

      if (originUpdateError) {
        console.error(
          "Error updating origin wallet balance:",
          originUpdateError
        );
        
        await supabase
          .from("transactions")
          .delete()
          .in("id", [originTransaction.id, destinationTransaction.id]);
        return res.status(500).json({
          success: false,
          message: "Failed to update origin wallet balance",
        });
      }

      
      const { error: destUpdateError } = await supabase.rpc(
        "update_wallet_balance",
        {
          p_wallet_id: destinationWalletId,
          p_amount: parseFloat(convertedAmount), 
        }
      );

      if (destUpdateError) {
        console.error(
          "Error updating destination wallet balance:",
          destUpdateError
        );
        
        await supabase
          .from("transactions")
          .delete()
          .in("id", [originTransaction.id, destinationTransaction.id]);
        await supabase.rpc("update_wallet_balance", {
          p_wallet_id: originWalletId,
          p_amount: parseFloat(amount), 
        });
        return res.status(500).json({
          success: false,
          message: "Failed to update destination wallet balance",
        });
      }

      
      const { data: updatedWallets } = await supabase
        .from("wallets")
        .select("id, name, balance, initial_balance, currency")
        .in("id", [originWalletId, destinationWalletId]);

      res.status(201).json({
        success: true,
        message: "Transfer completed successfully",
        data: {
          transactions: {
            outgoing: originTransaction,
            incoming: destinationTransaction,
          },
          wallets: updatedWallets,
          currencyConversion: currencyConversion || null,
          summary: {
            originalAmount: amount,
            originalCurrency: originWallet.currency,
            convertedAmount: convertedAmount,
            destinationCurrency: destinationWallet.currency,
            exchangeRate: exchangeRate,
            fromWallet: {
              id: originWallet.id,
              name: originWallet.name,
              currency: originWallet.currency,
            },
            toWallet: {
              id: destinationWallet.id,
              name: destinationWallet.name,
              currency: destinationWallet.currency,
            },
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
