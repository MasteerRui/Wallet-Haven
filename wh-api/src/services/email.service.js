import nodemailer from "nodemailer";
import { config } from "../config/env.js";

const createTransporter = () => {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASSWORD) {
    throw new Error("SMTP configuration is missing. Check your .env file.");
  }

  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: parseInt(config.SMTP_PORT) || 587,
    secure: config.SMTP_SECURE === "true", 
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASSWORD,
    },
  });
};

const emailTemplates = {
  welcomeEmail: (userName) => ({
    subject: "Bem-vindo ao Wallethaven! 🎉",
    html: `
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
                        Bem-vindo ao Wallethaven! 🎉
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
                        A tua conta está verificada e pronta a usar! Aqui está o que podes fazer com o Wallethaven:
                      </p>
                      
                      <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 12px; border-left: 4px solid #1a1a1a;">
                        <h3 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">
                          💳 Rastreia os Teus Gastos
                        </h3>
                        <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                          Organiza e categoriza facilmente os teus gastos.
                        </p>
                      </div>
                      
                      <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 12px; border-left: 4px solid #1a1a1a;">
                        <h3 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">
                          📊 Vê Insights
                        </h3>
                        <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                          Obtém análises detalhadas sobre os teus hábitos financeiros.
                        </p>
                      </div>
                      
                      <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 12px; border-left: 4px solid #1a1a1a;">
                        <h3 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">
                          🔒 Seguro e Privado
                        </h3>
                        <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                          Os teus dados estão encriptados e seguros.
                        </p>
                      </div>
                      
                      <p style="margin: 30px 0 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        Começa a usar fazendo login na app e explorando o teu dashboard!
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
    text: `
      Bem-vindo ao Wallethaven!
      
      Olá ${userName},
      
      A tua conta está verificada e pronta a usar! Aqui está o que podes fazer com o Wallethaven:
      
      💳 Rastreia os Teus Gastos - Organiza e categoriza facilmente os teus gastos
      📊 Vê Insights - Obtém análises detalhadas sobre os teus hábitos financeiros
      🔒 Seguro e Privado - Os teus dados estão encriptados e seguros
      
      Começa a usar fazendo login na app e explorando o teu dashboard!
    `,
  }),
};

export const emailService = {
  
  sendWelcomeEmail: async (email, userName) => {
    try {
      const transporter = createTransporter();
      const template = emailTemplates.welcomeEmail(userName);

      await transporter.sendMail({
        from: `"Wallethaven" <${config.EMAIL_FROM}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      return { success: true, message: "Welcome email sent" };
    } catch (error) {
      console.error("Error sending welcome email:", error);
      
      return { success: false, message: "Failed to send welcome email" };
    }
  },

  
  sendEmail: async (to, subject, html, text) => {
    try {
      const transporter = createTransporter();

      await transporter.sendMail({
        from: `"Wallethaven" <${config.EMAIL_FROM || config.EMAIL_USER}>`,
        to,
        subject,
        html,
        text,
      });

      return { success: true, message: "Email sent successfully" };
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
  },
};

