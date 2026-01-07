import { supabase } from "../services/supabase.service.js";
import { getCurrencyInfo } from "../utils/currencies.js";

export const dashboardController = {
  
  getDashboardData: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const wallet_id = req.query.wallet_id ? parseInt(req.query.wallet_id) : null;

      
      const { data: wallets, error: walletsError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", true) 
        .order("created_at", { ascending: true });

      if (walletsError) {
        console.error("Error fetching wallets:", walletsError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch wallets",
        });
      }

      
      const enrichedWallets = (wallets || []).map(wallet => {
        
        if (!wallet.id) {
          console.error("Warning: Wallet missing id field:", wallet);
        }
        const currencyInfo = getCurrencyInfo(wallet.currency);
        return {
          ...wallet,
          currency_info: currencyInfo, 
        };
      });

      
      let transactionsQuery = supabase
        .from("transactions")
        .select(
          `
          *,
          origin_wallet:wallets!origin_wallet_id(id, name, currency),
          destination_wallet:wallets!destination_wallet_id(id, name, currency),
          category:categories(id, name, color, icon)
        `
        )
        .eq("user_id", user_id);
      
      
      if (wallet_id) {
        transactionsQuery = transactionsQuery.eq("wallet_id", wallet_id);
      }
      
      const { data: recentTransactions, error: transactionsError } =
        await transactionsQuery
          .order("date", { ascending: false })
          .limit(20);

      if (transactionsError) {
        console.error("Error fetching recent transactions:", transactionsError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch recent transactions",
        });
      }

      
      const { data: categories, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .or(`is_global.eq.true,user_id.eq.${user_id}`)
        .order("name", { ascending: true });

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch categories",
        });
      }

      
      const totalBalance = enrichedWallets.reduce((sum, wallet) => {
        return (
          sum +
          (parseFloat(wallet.balance) ||
            parseFloat(wallet.initial_balance) ||
            0)
        );
      }, 0);

      
      const now = new Date();
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59
      ).toISOString();

      let monthlyQuery = supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", user_id)
        .gte("date", startOfMonth)
        .lte("date", endOfMonth);
      
      
      if (wallet_id) {
        monthlyQuery = monthlyQuery.eq("wallet_id", wallet_id);
      }
      
      const { data: monthlyTransactions, error: monthlyError } = await monthlyQuery;

      if (monthlyError) {
        console.error("Error fetching monthly stats:", monthlyError);
      }

      
      const monthlyStats = {
        totalIncome: 0,
        totalExpenses: 0,
        totalTransfers: 0,
        transactionCount: 0,
      };

      if (monthlyTransactions) {
        monthlyTransactions.forEach((transaction) => {
          const amount = parseFloat(transaction.amount);
          monthlyStats.transactionCount++;

          if (transaction.type === "income") {
            monthlyStats.totalIncome += amount;
          } else if (transaction.type === "expense") {
            monthlyStats.totalExpenses += amount;
          } else if (transaction.type === "transfer") {
            monthlyStats.totalTransfers += amount;
          }
        });
      }

      monthlyStats.netAmount =
        monthlyStats.totalIncome - monthlyStats.totalExpenses;

      
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select(
          "name, email, is_email_verified, biometric_enabled, preferences_json"
        )
        .eq("id", user_id)
        .single();

      
      if (profileError && profileError.code === "PGRST116") {
        
        const userName =
          req.user.user_metadata?.full_name ||
          req.user.user_metadata?.name ||
          req.user.email?.split("@")[0] ||
          "User";

        const { data: createdProfile, error: createProfileError } = await supabase
          .from("users")
          .insert({
            id: req.user.id,
            email: req.user.email,
            name: userName,
            is_email_verified: req.user.email_confirmed_at ? true : false,
            biometric_enabled: false,
            preferences_json: {},
          })
          .select()
          .single();

        if (createProfileError && createProfileError.code !== "23505") {
          
          if (createProfileError.code !== "42501") {
            console.error("Error creating user profile in dashboard:", createProfileError);
          }
          
          
        }

        
        let finalWallets = enrichedWallets;
        if ((createdProfile || createProfileError?.code === "23505") && (enrichedWallets.length === 0)) {
          const { data: newWallet, error: walletCreateError } = await supabase
            .from("wallets")
            .insert({
              user_id: req.user.id,
              name: "Main Wallet",
              initial_balance: 0.0,
              currency: "USD",
              is_active: true,
            })
            .select()
            .single();

          if (walletCreateError && walletCreateError.code !== "23505") {
            console.error("Error creating default wallet in dashboard:", walletCreateError);
            
          } else if (newWallet) {
            
            const { data: refreshedWallets } = await supabase
              .from("wallets")
              .select("*")
              .eq("user_id", user_id)
              .eq("is_active", true)
              .order("created_at", { ascending: true });
            
            if (refreshedWallets && refreshedWallets.length > 0) {
              
              finalWallets = refreshedWallets.map(wallet => {
                const currencyInfo = getCurrencyInfo(wallet.currency);
                return {
                  ...wallet,
                  currency_info: currencyInfo,
                };
              });
            } else {
              
              const currencyInfo = getCurrencyInfo(newWallet.currency);
              finalWallets = [{
                ...newWallet,
                currency_info: currencyInfo,
              }];
            }
          }
        }

        
        const finalTotalBalance = finalWallets.reduce((sum, wallet) => {
          return (
            sum +
            (parseFloat(wallet.balance) ||
              parseFloat(wallet.initial_balance) ||
              0)
          );
        }, 0);

        
        const { data: newUserProfile } = await supabase
          .from("users")
          .select(
            "name, email, is_email_verified, biometric_enabled, preferences_json"
          )
          .eq("id", user_id)
          .single();

        
        const finalUserProfile = newUserProfile || {};
        
        return res.status(200).json({
          success: true,
          message: "Dashboard data loaded successfully",
          data: {
            user: finalUserProfile,
            wallets: finalWallets,
            totalBalance: finalTotalBalance,
            recentTransactions: recentTransactions || [],
            categories: categories || [],
            monthlyStats: monthlyStats,
            summary: {
              walletsCount: finalWallets.length,
              categoriesCount: categories?.length || 0,
              recentTransactionsCount: recentTransactions?.length || 0,
              lastTransactionDate: recentTransactions?.[0]?.date || null,
            },
          },
        });
      }

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching user profile:", profileError);
      }

      
      res.status(200).json({
        success: true,
        message: "Dashboard data loaded successfully",
        data: {
          user: userProfile || {},
          wallets: enrichedWallets,
          totalBalance: totalBalance,
          recentTransactions: recentTransactions || [],
          categories: categories || [],
          monthlyStats: monthlyStats,
          summary: {
            walletsCount: enrichedWallets.length,
            categoriesCount: categories?.length || 0,
            recentTransactionsCount: recentTransactions?.length || 0,
            lastTransactionDate: recentTransactions?.[0]?.date || null,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  getQuickSummary: async (req, res, next) => {
    try {
      const user_id = req.user.id;

      
      const { data: wallets, error: walletsError } = await supabase
        .from("wallets")
        .select("balance, initial_balance")
        .eq("user_id", user_id);

      if (walletsError) {
        console.error("Error fetching wallets summary:", walletsError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch summary",
        });
      }

      const totalBalance = wallets.reduce((sum, wallet) => {
        return (
          sum +
          (parseFloat(wallet.balance) ||
            parseFloat(wallet.initial_balance) ||
            0)
        );
      }, 0);

      
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).toISOString();
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59
      ).toISOString();

      const { count: todayTransactions, error: countError } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .gte("date", startOfDay)
        .lte("date", endOfDay);

      if (countError) {
        console.error("Error counting today's transactions:", countError);
      }

      res.status(200).json({
        success: true,
        data: {
          totalBalance: totalBalance,
          walletsCount: wallets.length,
          todayTransactions: todayTransactions || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
