import { supabase } from "../services/supabase.service.js";
import { emailService } from "../services/email.service.js";
import crypto from "crypto";

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const verificationController = {
  
  sendVerificationCode: async (req, res, next) => {
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
        .select("id, name, is_email_verified")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (userData.is_email_verified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      
      const code = generateVerificationCode();

      
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      
      const { error: insertError } = await supabase
        .from("email_verification_codes")
        .insert({
          user_id: userData.id,
          code: code,
          expires_at: expiresAt,
          is_used: false,
        });

      if (insertError) {
        console.error("Error storing verification code:", insertError);
        return res.status(500).json({
          success: false,
          message: "Failed to generate verification code",
        });
      }

      
      const userName = userData.name || "User";
      
      await emailService.sendEmail(
        email,
        "Seu Código de Verificação Wallethaven",
        `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="background-color: #1a1a1a; padding: 40px 30px; text-align: left;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                            Verificação de Email
                          </h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 30px; background-color: #ffffff;">
                          <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                            Olá ${userName},
                          </p>
                          <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                            O teu código de verificação é:
                          </p>
                          
                          <!-- Code Display -->
                          <div style="text-align: center; margin: 40px 0;">
                            <div style="display: inline-block; background-color: #1a1a1a; padding: 24px 48px; border-radius: 12px; font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #ffffff; font-family: 'Courier New', monospace;">
                              ${code}
                            </div>
                          </div>
                          
                          <p style="margin: 30px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6; text-align: center;">
                            Este código expira em <strong style="color: #1a1a1a;">15 minutos</strong>.
                          </p>
                          
                          <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6; text-align: center;">
                            Se não pediste este código, podes ignorar este email com segurança.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 30px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #e5e5e5;">
                          <p style="margin: 0; color: #999999; font-size: 12px;">
                            © ${new Date().getFullYear()} Wallethaven. Todos os direitos reservados.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
        `Seu código de verificação Wallethaven é: ${code}\n\nEste código expira em 15 minutos.\n\nSe não pediste este código, podes ignorar este email.`
      );

      res.status(200).json({
        success: true,
        message: "Verification code sent to your email",
      });
    } catch (error) {
      next(error);
    }
  },

  
  verifyCode: async (req, res, next) => {
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
        .select("id, is_email_verified")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (userData.is_email_verified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      
      const { data: codeData, error: codeError } = await supabase
        .from("email_verification_codes")
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
          message: "Invalid or expired verification code",
        });
      }

      
      await supabase
        .from("email_verification_codes")
        .update({ is_used: true })
        .eq("id", codeData.id);

      
      const { error: updateError } = await supabase
        .from("users")
        .update({ is_email_verified: true })
        .eq("id", userData.id);

      if (updateError) {
        console.error("Error updating user:", updateError);
        return res.status(500).json({
          success: false,
          message: "Failed to verify email",
        });
      }

      
      

      res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  
  resendCode: async (req, res, next) => {
    try {
      
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (userData) {
        
        await supabase
          .from("email_verification_codes")
          .update({ is_used: true })
          .eq("user_id", userData.id)
          .eq("is_used", false);
      }

      
      return verificationController.sendVerificationCode(req, res, next);
    } catch (error) {
      next(error);
    }
  },
};

