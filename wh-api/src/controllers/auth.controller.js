import { supabase } from "../services/supabase.service.js";
import { config } from "../config/env.js";

export const authController = {
  
  signUp: async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: undefined, 
        },
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      
      
      
      
      const { data: existingProfile } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      
      if (!existingProfile) {
        try {
          const userName =
            firstName && lastName
              ? `${firstName} ${lastName}`
              : firstName || lastName || null;

          const { data: userProfile, error: profileError } = await supabase
            .from("users")
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: userName,
              is_email_verified: false,
              biometric_enabled: false,
              preferences_json: {},
            })
            .select()
            .single();

          if (profileError) {
            
            const isDuplicateError =
              profileError.code === "23505" ||
              profileError.message?.includes("duplicate") ||
              profileError.message?.includes("already exists");

            if (isDuplicateError) {
              
            } else {
              
              console.error("Error creating user profile:", profileError);
            }
          } else {
          }
        } catch (profileCreationError) {
          console.error("User profile creation error:", profileCreationError);
          
        }
      } else {
        
        if (firstName || lastName) {
          const userName =
            firstName && lastName
              ? `${firstName} ${lastName}`
              : firstName || lastName || existingProfile.name;

          await supabase
            .from("users")
            .update({ name: userName })
            .eq("id", data.user.id);
        }
      }

      
      try {
        const defaultWalletName = "Main Wallet";
        const defaultCurrency = "USD";
        const defaultBalance = 0.0;

        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .insert({
            user_id: data.user.id,
            name: defaultWalletName,
            initial_balance: defaultBalance,
            currency: defaultCurrency,
          })
          .select()
          .single();

        if (walletError) {
          console.error("Error creating default wallet:", walletError);
          
        }
        
      } catch (walletCreationError) {
        console.error("Wallet creation error:", walletCreationError);
        
      }

      
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
      }

      const isVerified = userData?.is_email_verified || false;

      res.status(201).json({
        success: true,
        message:
          "Account created successfully. Please verify your email using the code sent to your inbox.",
        data: {
          user: {
            ...data.user,
            
            name: userData?.name,
            email: userData?.email || data.user.email,
            firstName: firstName || data.user.user_metadata?.first_name || null,
            lastName: lastName || data.user.user_metadata?.last_name || null,
            biometric_enabled: userData?.biometric_enabled || false,
            pin: userData?.pin,
            preferences_json: userData?.preferences_json || {},
            is_email_verified: userData?.is_email_verified || false,
            created_at: userData?.created_at,
            updated_at: userData?.updated_at,
          },
          session: data.session,
          isEmailVerified: isVerified,
          needsVerification: !isVerified,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  signIn: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({
          success: false,
          message: error.message,
        });
      }

      
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
      }

      const isVerified = userData?.is_email_verified || false;

      res.status(200).json({
        success: true,
        message: isVerified
          ? "Signed in successfully"
          : "Signed in successfully. Please verify your email.",
        data: {
          user: {
            ...data.user,
            
            name: userData?.name,
            email: userData?.email,
            biometric_enabled: userData?.biometric_enabled || false,
            pin: userData?.pin,
            preferences_json: userData?.preferences_json || {},
            is_email_verified: userData?.is_email_verified || false,
            created_at: userData?.created_at,
            updated_at: userData?.updated_at,
          },
          session: data.session,
          isEmailVerified: isVerified,
          needsVerification: !isVerified,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  signOut: async (req, res, next) => {
    try {
      
      if (req.user || req.token) {
        const { error } = await supabase.auth.signOut();

        if (error) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: "Signed out successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  
  
  clearGoogleSession: async (req, res, next) => {
    try {
      
      await supabase.auth.signOut();

      res.status(200).json({
        success: true,
        message: "Google session cleared. Next login will show account picker.",
        note: "In simulator, you may also need to clear Safari cookies: Settings → Safari → Clear History and Website Data",
      });
    } catch (error) {
      next(error);
    }
  },

  
  getUser: async (req, res, next) => {
    try {
      
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", req.user.id)
        .single();

      
      
      if (userError && userError.code === "PGRST116") {
        
        const userName =
          req.user.user_metadata?.full_name ||
          req.user.user_metadata?.name ||
          req.user.email?.split("@")[0] ||
          "User";

        const { data: createdProfile, error: profileError } = await supabase
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

        
        if (profileError && profileError.code !== "23505") {
          
          
          if (profileError.code !== "42501") {
            console.error("Error creating user profile in getUser:", profileError);
          }
          
          
          return res.status(200).json({
            success: true,
            data: {
              user: {
                ...req.user,
                
                name: userName,
                email: req.user.email,
                biometric_enabled: false,
                preferences_json: {},
                is_email_verified: req.user.email_confirmed_at ? true : false,
              },
              isEmailVerified: req.user.email_confirmed_at ? true : false,
              name: userName,
              email: req.user.email,
            },
          });
        }

        
        if (createdProfile || profileError?.code === "23505") {
          
          const { data: existingWallet } = await supabase
            .from("wallets")
            .select("id")
            .eq("user_id", req.user.id)
            .limit(1);

          
          if (!existingWallet || existingWallet.length === 0) {
            const { error: walletError } = await supabase.from("wallets").insert({
              user_id: req.user.id,
              name: "Main Wallet",
              initial_balance: 0.0,
              currency: "USD",
            });

            if (walletError && walletError.code !== "23505") {
              console.error("Error creating default wallet in getUser:", walletError);
              
            }
          }
        }

        
        const { data: newUserData, error: newUserError } = await supabase
          .from("users")
          .select("*")
          .eq("id", req.user.id)
          .single();

        
        if (newUserError) {
          console.error("Error fetching user data after creation:", newUserError);
          return res.status(200).json({
            success: true,
            data: {
              user: {
                ...req.user,
                name: userName,
                email: req.user.email,
                biometric_enabled: false,
                preferences_json: {},
                is_email_verified: req.user.email_confirmed_at ? true : false,
              },
              isEmailVerified: req.user.email_confirmed_at ? true : false,
              name: userName,
              email: req.user.email,
            },
          });
        }

        return res.status(200).json({
          success: true,
          data: {
            user: {
              ...req.user,
              
              name: newUserData?.name,
              email: newUserData?.email,
              biometric_enabled: newUserData?.biometric_enabled || false,
              pin: newUserData?.pin,
              preferences_json: newUserData?.preferences_json || {},
              is_email_verified: newUserData?.is_email_verified || false,
              created_at: newUserData?.created_at,
              updated_at: newUserData?.updated_at,
            },
            isEmailVerified: newUserData?.is_email_verified || false,
            name: newUserData?.name,
            email: newUserData?.email,
          },
        });
      }

      if (userError && userError.code !== "PGRST116") {
        console.error("Error fetching user data:", userError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch user data",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            ...req.user,
            
            name: userData?.name,
            email: userData?.email,
            biometric_enabled: userData?.biometric_enabled || false,
            pin: userData?.pin,
            preferences_json: userData?.preferences_json || {},
            is_email_verified: userData?.is_email_verified || false,
            created_at: userData?.created_at,
            updated_at: userData?.updated_at,
          },
          isEmailVerified: userData?.is_email_verified || false,
          name: userData?.name,
          email: userData?.email,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  refreshSession: async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        return res.status(401).json({
          success: false,
          message: error.message,
        });
      }

      res.status(200).json({
        success: true,
        message: "Session refreshed successfully",
        data: {
          session: data.session,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  getGoogleAuthUrl: async (req, res, next) => {
    try {
      const { redirectTo } = req.query;

      
      const appRedirectUrl = redirectTo || 'wallethaven://google-callback';
      
      
      if (!appRedirectUrl.includes('://')) {
        return res.status(400).json({
          success: false,
          message: "redirectTo must be a deep link (e.g., wallethaven://google-callback)",
        });
      }

      
      if (appRedirectUrl.startsWith('http://') || appRedirectUrl.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          message: "redirectTo must be a deep link, not an HTTP URL. Use: wallethaven://google-callback",
        });
      }

      
      const supabaseUrl = config.SUPABASE_URL;
      
      
      
      const callbackUrl = `${config.APP_URL}/api/auth/google/callback?app_redirect=${encodeURIComponent(appRedirectUrl)}`;
      
      
      
      const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(callbackUrl)}&prompt=select_account`;

      res.status(200).json({
        success: true,
        data: {
          url: oauthUrl,
          redirectTo: appRedirectUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  handleGoogleCallback: async (req, res, next) => {
    try {
      const { code, app_redirect, error } = req.query;
      
      
      
      
      
      
      const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
      const hashMatch = fullUrl.match(/#(.+)$/);
      const hash = hashMatch ? hashMatch[1] : null;

      
      if (error) {
        console.error('OAuth error:', error);
        if (app_redirect) {
          return res.redirect(`${app_redirect}?error=${encodeURIComponent(error)}`);
        }
        return res.status(400).json({
          success: false,
          message: `OAuth error: ${error}`,
        });
      }

      
      
      if (app_redirect && !code && !hash) {
        
        
        return res.redirect(app_redirect);
      }

      
      
      if (hash && !code) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          
          const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
          
          if (userError || !user) {
            if (app_redirect) {
              return res.redirect(`${app_redirect}?error=${encodeURIComponent(userError?.message || 'Failed to get user')}`);
            }
            return res.status(400).json({
              success: false,
              message: userError?.message || 'Failed to get user',
            });
          }

          
          const session = {
            access_token: accessToken,
            refresh_token: refreshToken || '',
            expires_in: hashParams.get('expires_in') || 3600,
            token_type: hashParams.get('token_type') || 'bearer',
          };

          
          const { data: existingUser, error: existingUserError } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          
          let userProfile = existingUser;
          if ((existingUserError && existingUserError.code === "PGRST116") || !existingUser) {
            
            const { data: existingUserByEmail } = await supabase
              .from("users")
              .select("*")
              .eq("email", user.email)
              .limit(1)
              .maybeSingle();

            if (existingUserByEmail) {
              
              userProfile = existingUserByEmail;
            } else {
              
              const userName =
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split("@")[0] ||
                "User";

              const { data: createdProfile, error: profileError } = await supabase
                .from("users")
                .insert({
                  id: user.id,
                  email: user.email,
                  name: userName,
                  is_email_verified: true,
                  biometric_enabled: false,
                  preferences_json: {},
                })
                .select()
                .single();

              if (profileError && profileError.code !== "23505") {
                
                if (profileError.code !== "42501") {
                  console.error("Error creating user profile:", profileError);
                }
                userProfile = null;
              } else {
                userProfile = createdProfile;
              }

              
              if (userProfile && (!profileError || profileError?.code === "23505")) {
                
                const { data: existingWallet } = await supabase
                  .from("wallets")
                  .select("id")
                  .eq("user_id", user.id)
                  .limit(1);

                
                if (!existingWallet || existingWallet.length === 0) {
                  const { error: walletError } = await supabase.from("wallets").insert({
                    user_id: user.id,
                    name: "Main Wallet",
                    initial_balance: 0.0,
                    currency: "USD",
                  });

                  if (walletError && walletError.code !== "23505") {
                    console.error("Error creating default wallet:", walletError);
                  }
                }
              }
            }
          }

          
          let userData = userProfile;
          if (!userData) {
            const { data: fetchedUserData, error: userDataError } = await supabase
              .from("users")
              .select("*")
              .eq("id", user.id)
              .single();

            if (userDataError && userDataError.code !== "PGRST116") {
              console.error("Error fetching user data after Google login:", userDataError);
            } else {
              userData = fetchedUserData;
            }
          }

          if (app_redirect) {
            const redirectUrl = new URL(app_redirect);
            redirectUrl.searchParams.set('access_token', session.access_token);
            redirectUrl.searchParams.set('refresh_token', session.refresh_token);
            redirectUrl.searchParams.set('user_id', user.id);
            redirectUrl.searchParams.set('success', 'true');
            return res.redirect(redirectUrl.toString());
          }

          return res.status(200).json({
            success: true,
            message: "Signed in with Google successfully",
            data: {
              user: {
                ...user,
                name: userData?.name,
                email: userData?.email,
                biometric_enabled: userData?.biometric_enabled || false,
                pin: userData?.pin,
                preferences_json: userData?.preferences_json || {},
                is_email_verified: userData?.is_email_verified || true,
                created_at: userData?.created_at,
                updated_at: userData?.updated_at,
              },
              session: session,
              isEmailVerified: true,
              needsVerification: false,
            },
          });
        }
      }

      if (!code) {
        
        
        
        if (app_redirect) {
          
          
          return res.redirect(app_redirect);
        }
        
        
        return res.status(200).json({
          success: true,
          message: "OAuth completed. If using hash fragment flow, process tokens in your app.",
          note: "Supabase may have redirected directly to your app with tokens in hash fragment.",
        });
      }

      
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        
        if (app_redirect) {
          return res.redirect(`${app_redirect}?error=${encodeURIComponent(sessionError.message)}`);
        }
        return res.status(400).json({
          success: false,
          message: sessionError.message,
        });
      }

      
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("*")
        .eq("id", sessionData.user.id)
        .single();

      
      let userProfile = existingUser;
      if ((userCheckError && userCheckError.code === "PGRST116") || !existingUser) {
        
        const { data: existingUserByEmail } = await supabase
          .from("users")
          .select("*")
          .eq("email", sessionData.user.email)
          .limit(1)
          .maybeSingle();

        if (existingUserByEmail) {
          
          
          userProfile = existingUserByEmail;
        } else {
          
          const userName =
            sessionData.user.user_metadata?.full_name ||
            sessionData.user.user_metadata?.name ||
            sessionData.user.email?.split("@")[0] ||
            "User";

          const { data: createdProfile, error: profileError } = await supabase
            .from("users")
            .insert({
              id: sessionData.user.id,
              email: sessionData.user.email,
              name: userName,
              is_email_verified: true, 
              biometric_enabled: false,
              preferences_json: {},
            })
            .select()
            .single();

          if (profileError && profileError.code !== "23505") {
            
            if (profileError.code !== "42501") {
              console.error("Error creating user profile:", profileError);
            }
            
            userProfile = null;
          } else {
            userProfile = createdProfile;
          }

          
          if (userProfile && (!profileError || profileError?.code === "23505")) {
            
            const { data: existingWallet } = await supabase
              .from("wallets")
              .select("id")
              .eq("user_id", sessionData.user.id)
              .limit(1);

            
            if (!existingWallet || existingWallet.length === 0) {
              const { error: walletError } = await supabase.from("wallets").insert({
                user_id: sessionData.user.id,
                name: "Main Wallet",
                initial_balance: 0.0,
                currency: "USD",
              });

              if (walletError && walletError.code !== "23505") {
                console.error("Error creating default wallet:", walletError);
              }
            }
          }
        }
      }

      
      let userData = userProfile;
      if (!userData) {
        const { data: fetchedUserData, error: userDataError } = await supabase
          .from("users")
          .select("*")
          .eq("id", sessionData.user.id)
          .single();

        if (userDataError && userDataError.code !== "PGRST116") {
          console.error("Error fetching user data after Google login:", userDataError);
        } else {
          userData = fetchedUserData;
        }
      }

      
      
      if (app_redirect) {
        
        const redirectUrl = new URL(app_redirect);
        redirectUrl.searchParams.set('access_token', sessionData.session.access_token);
        redirectUrl.searchParams.set('refresh_token', sessionData.session.refresh_token);
        redirectUrl.searchParams.set('user_id', sessionData.user.id);
        redirectUrl.searchParams.set('success', 'true');
        
        return res.redirect(redirectUrl.toString());
      }

      
      res.status(200).json({
        success: true,
        message: "Signed in with Google successfully",
        data: {
          user: {
            ...sessionData.user,
            name: userData?.name,
            email: userData?.email,
            biometric_enabled: userData?.biometric_enabled || false,
            pin: userData?.pin,
            preferences_json: userData?.preferences_json || {},
            is_email_verified: userData?.is_email_verified || true,
            created_at: userData?.created_at,
            updated_at: userData?.updated_at,
          },
          session: sessionData.session,
          isEmailVerified: true,
          needsVerification: false,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  signInWithGoogle: async (req, res, next) => {
    try {
      const { access_token, id_token } = req.body;

      if (!access_token && !id_token) {
        return res.status(400).json({
          success: false,
          message: "Google access token or ID token is required",
        });
      }

      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: id_token || access_token,
      });

      if (error) {
        return res.status(401).json({
          success: false,
          message: error.message,
        });
      }

      
      const { data: existingUser, error: existingUserError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      
      let userProfile = existingUser;
      if ((existingUserError && existingUserError.code === "PGRST116") || !existingUser) {
        
        const { data: existingUserByEmail } = await supabase
          .from("users")
          .select("*")
          .eq("email", data.user.email)
          .limit(1)
          .maybeSingle();

        if (existingUserByEmail) {
          
          userProfile = existingUserByEmail;
        } else {
          
          const userName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            data.user.email?.split("@")[0] ||
            "User";

          const { data: createdProfile, error: profileError } = await supabase
            .from("users")
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: userName,
              is_email_verified: true,
              biometric_enabled: false,
              preferences_json: {},
            })
            .select()
            .single();

          if (profileError && profileError.code !== "23505") {
            console.error("Error creating user profile:", profileError);
            userProfile = null;
          } else {
            userProfile = createdProfile;
          }

          
          if (userProfile && (!profileError || profileError?.code === "23505")) {
            
            const { data: existingWallet } = await supabase
              .from("wallets")
              .select("id")
              .eq("user_id", data.user.id)
              .limit(1);

            
            if (!existingWallet || existingWallet.length === 0) {
              const { error: walletError } = await supabase.from("wallets").insert({
                user_id: data.user.id,
                name: "Main Wallet",
                initial_balance: 0.0,
                currency: "USD",
              });

              if (walletError && walletError.code !== "23505") {
                console.error("Error creating default wallet:", walletError);
              }
            }
          }
        }
      }

      
      let userData = userProfile;
      if (!userData) {
        const { data: fetchedUserData, error: userDataError } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (userDataError && userDataError.code !== "PGRST116") {
          console.error("Error fetching user data after Google sign in:", userDataError);
        } else {
          userData = fetchedUserData;
        }
      }

      res.status(200).json({
        success: true,
        message: "Signed in with Google successfully",
        data: {
          user: {
            ...data.user,
            name: userData?.name,
            email: userData?.email,
            biometric_enabled: userData?.biometric_enabled || false,
            pin: userData?.pin,
            preferences_json: userData?.preferences_json || {},
            is_email_verified: userData?.is_email_verified || true,
            created_at: userData?.created_at,
            updated_at: userData?.updated_at,
          },
          session: data.session,
          isEmailVerified: true,
          needsVerification: false,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
