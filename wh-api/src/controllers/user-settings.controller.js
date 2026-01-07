import { supabase } from "../services/supabase.service.js";
import bcrypt from "bcryptjs";

export const userSettingsController = {
  
  getUserSettings: async (req, res, next) => {
    try {
      const user_id = req.user.id;

      const { data: user, error } = await supabase
        .from("users")
        .select("pin, biometric_enabled, preferences_json")
        .eq("id", user_id)
        .single();

      if (error) {
        console.error("Error fetching user settings:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch user settings",
        });
      }

      
      let preferences = user.preferences_json || {};

      res.status(200).json({
        success: true,
        data: {
          has_pin: !!user.pin,
          biometric_enabled: user.biometric_enabled || false,
          preferences: preferences,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  setPin: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { pin, current_pin } = req.body;

      
      if (!pin || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({
          success: false,
          message: "PIN must be exactly 6 digits",
        });
      }

      
      const { data: currentUser, error: fetchError } = await supabase
        .from("users")
        .select("pin")
        .eq("id", user_id)
        .single();

      if (fetchError) {
        console.error("Error fetching user:", fetchError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch user data",
        });
      }

      
      if (currentUser.pin) {
        if (!current_pin) {
          return res.status(400).json({
            success: false,
            message: "Current PIN is required to change PIN",
          });
        }

        const isPinValid = await bcrypt.compare(current_pin, currentUser.pin);
        if (!isPinValid) {
          return res.status(401).json({
            success: false,
            message: "Current PIN is incorrect",
          });
        }
      }

      
      const hashedPin = await bcrypt.hash(pin, 10);

      
      const { error: updateError } = await supabase
        .from("users")
        .update({
          pin: hashedPin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);

      if (updateError) {
        console.error("Error updating PIN:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to update PIN",
        });
      }

      res.status(200).json({
        success: true,
        message: currentUser.pin
          ? "PIN updated successfully"
          : "PIN set successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  
  verifyPin: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { pin } = req.body;

      
      if (!pin || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({
          success: false,
          message: "PIN must be exactly 6 digits",
        });
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("pin")
        .eq("id", user_id)
        .single();

      if (error || !user.pin) {
        return res.status(404).json({
          success: false,
          message: "No PIN set for this user",
        });
      }

      const isPinValid = await bcrypt.compare(pin, user.pin);

      if (!isPinValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid PIN",
        });
      }

      res.status(200).json({
        success: true,
        message: "PIN verified successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  
  removePin: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { pin } = req.body;

      
      if (!pin || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({
          success: false,
          message: "PIN must be exactly 6 digits",
        });
      }

      
      const { data: user, error } = await supabase
        .from("users")
        .select("pin")
        .eq("id", user_id)
        .single();

      if (error || !user.pin) {
        return res.status(404).json({
          success: false,
          message: "No PIN set for this user",
        });
      }

      const isPinValid = await bcrypt.compare(pin, user.pin);
      if (!isPinValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid PIN",
        });
      }

      
      const { error: updateError } = await supabase
        .from("users")
        .update({
          pin: null,
          biometric_enabled: false, 
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);

      if (updateError) {
        console.error("Error removing PIN:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to remove PIN",
        });
      }

      res.status(200).json({
        success: true,
        message: "PIN removed successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  
  setBiometric: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { enabled, pin } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "enabled field is required and must be a boolean",
        });
      }

      
      const { data: user, error } = await supabase
        .from("users")
        .select("pin")
        .eq("id", user_id)
        .single();

      if (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch user data",
        });
      }

      if (!user.pin) {
        return res.status(400).json({
          success: false,
          message:
            "You must set a PIN before enabling biometric authentication",
        });
      }

      
      if (enabled) {
        if (!pin) {
          return res.status(400).json({
            success: false,
            message: "PIN is required to enable biometric authentication",
          });
        }

        
        if (!/^\d{6}$/.test(pin)) {
          return res.status(400).json({
            success: false,
            message: "PIN must be exactly 6 digits",
          });
        }

        const isPinValid = await bcrypt.compare(pin, user.pin);
        if (!isPinValid) {
          return res.status(401).json({
            success: false,
            message: "Invalid PIN",
          });
        }
      }

      
      const { error: updateError } = await supabase
        .from("users")
        .update({
          biometric_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);

      if (updateError) {
        console.error("Error updating biometric setting:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to update biometric setting",
        });
      }

      res.status(200).json({
        success: true,
        message: enabled
          ? "Biometric authentication enabled successfully"
          : "Biometric authentication disabled successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  
  updatePreferences: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { language, notifications } = req.body;

      
      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("preferences_json")
        .eq("id", user_id)
        .single();

      if (fetchError) {
        console.error("Error fetching user preferences:", fetchError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch user preferences",
        });
      }

      let preferences = user.preferences_json || {};

      
      if (language !== undefined) {
        if (!["portuguese", "english"].includes(language)) {
          return res.status(400).json({
            success: false,
            message: "Language must be 'portuguese' or 'english'",
          });
        }
        preferences.language = language;
      }

      
      if (notifications !== undefined) {
        preferences.notifications = notifications;
      }

      
      const { error: updateError } = await supabase
        .from("users")
        .update({
          preferences_json: preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);

      if (updateError) {
        console.error("Error updating preferences:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to update preferences",
        });
      }

      res.status(200).json({
        success: true,
        message: "Preferences updated successfully",
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  },

  
  getUserProfile: async (req, res, next) => {
    try {
      const user_id = req.user.id;

      const { data: user, error } = await supabase
        .from("users")
        .select("name, email, is_email_verified")
        .eq("id", user_id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch user profile",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          name: user.name || "",
          email: user.email || "",
          is_email_verified: user.is_email_verified || false,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  updateUserProfile: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { name, email } = req.body;

      
      if (name === undefined && email === undefined) {
        return res.status(400).json({
          success: false,
          message: "At least one field (name or email) must be provided",
        });
      }

      
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: "Name must be a non-empty string",
          });
        }
        if (name.trim().length > 100) {
          return res.status(400).json({
            success: false,
            message: "Name must be 100 characters or less",
          });
        }
      }

      
      if (email !== undefined) {
        if (typeof email !== "string" || email.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: "Email must be a non-empty string",
          });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          return res.status(400).json({
            success: false,
            message: "Invalid email format",
          });
        }

        
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("email", email.trim())
          .neq("id", user_id)
          .maybeSingle();

        if (checkError) {
          console.error("Error checking email:", checkError);
          return res.status(500).json({
            success: false,
            message: "Failed to validate email",
          });
        }

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Email is already in use by another account",
          });
        }
      }

      
      const updateData = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) {
        updateData.name = name.trim();
      }

      if (email !== undefined) {
        updateData.email = email.trim();
        
        updateData.is_email_verified = false;
      }

      
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user_id)
        .select("name, email, is_email_verified")
        .single();

      if (updateError) {
        console.error("Error updating user profile:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to update user profile",
        });
      }

      
      if (email !== undefined) {
        try {
          const { error: authUpdateError } = await supabase.auth.updateUser({
            email: email.trim(),
          });

          if (authUpdateError) {
            console.error("Error updating auth email:", authUpdateError);
            
            
          }
        } catch (authError) {
          console.error("Error updating Supabase Auth email:", authError);
          
        }
      }

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          name: updatedUser.name,
          email: updatedUser.email,
          is_email_verified: updatedUser.is_email_verified,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  changePassword: async (req, res, next) => {
    try {
      const user_id = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required",
        });
      }

      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        });
      }

      
      const { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword,
      });

      if (authError || !authUser) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user_id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Error updating password:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to update password",
        });
      }

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};
