import { supabase } from "../services/supabase.service.js";
import { emailService } from "../services/email.service.js";

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const passwordResetController = {
  
  requestPasswordReset: async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        
        return res.status(200).json({
          success: true,
          message: "If this email exists, a password reset code has been sent",
        });
      }

      
      const code = generateResetCode();

      
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      
      await supabase
        .from("password_reset_codes")
        .update({ is_used: true })
        .eq("user_id", userData.id)
        .eq("is_used", false);

      
      const { error: insertError } = await supabase
        .from("password_reset_codes")
        .insert({
          user_id: userData.id,
          code: code,
          expires_at: expiresAt,
          is_used: false,
        });

      if (insertError) {
        console.error("Error storing password reset code:", insertError);
        return res.status(500).json({
          success: false,
          message: "Failed to generate password reset code",
        });
      }

      
      const userName = userData.name || "User";
      
      await emailService.sendEmail(
        email,
        "Your Wallethaven Password Reset Code",
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>🔐 Password Reset</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${userName},</p>
              <p>You requested to reset your password. Your verification code is:</p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background: white; padding: 20px 40px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; border: 2px dashed #667eea;">
                  ${code}
                </div>
              </div>
              <p>This code will expire in <strong>15 minutes</strong>.</p>
              <p><strong>If you didn't request this password reset, please ignore this email.</strong> Your password will not be changed.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Wallethaven. All rights reserved.</p>
            </div>
          </div>
        `,
        `Your Wallethaven password reset code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`
      );

      res.status(200).json({
        success: true,
        message: "Password reset code sent to your email",
      });
    } catch (error) {
      next(error);
    }
  },

  
  verifyResetCode: async (req, res, next) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: "Email and code are required",
        });
      }

      
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        return res.status(404).json({
          success: false,
          message: "Invalid code",
        });
      }

      
      const { data: codeData, error: codeError } = await supabase
        .from("password_reset_codes")
        .select("*")
        .eq("user_id", userData.id)
        .eq("code", code)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (codeError || !codeData) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset code",
        });
      }

      res.status(200).json({
        success: true,
        message: "Code is valid",
      });
    } catch (error) {
      next(error);
    }
  },

  
  resetPassword: async (req, res, next) => {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Email, code, and new password are required",
        });
      }

      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        return res.status(404).json({
          success: false,
          message: "Invalid reset code",
        });
      }

      
      const { data: codeData, error: codeError } = await supabase
        .from("password_reset_codes")
        .select("*")
        .eq("user_id", userData.id)
        .eq("code", code)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (codeError || !codeData) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset code",
        });
      }

      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userData.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Error updating password:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to reset password",
        });
      }

      
      await supabase
        .from("password_reset_codes")
        .update({ is_used: true })
        .eq("id", codeData.id);

      
      const { data: userInfo } = await supabase
        .from("users")
        .select("name")
        .eq("id", userData.id)
        .single();

      const userName = userInfo?.name || "User";

      await emailService.sendEmail(
        email,
        "Your Wallethaven Password Has Been Reset",
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>✅ Password Reset Successful</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${userName},</p>
              <p>Your password has been successfully reset.</p>
              <p>You can now sign in with your new password.</p>
              <p><strong>If you didn't make this change, please contact support immediately.</strong></p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Wallethaven. All rights reserved.</p>
            </div>
          </div>
        `,
        `Your Wallethaven password has been successfully reset.\n\nYou can now sign in with your new password.\n\nIf you didn't make this change, please contact support immediately.`
      );

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};

