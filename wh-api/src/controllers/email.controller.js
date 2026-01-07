import { emailService } from "../services/email.service.js";

export const emailController = {
  
  sendCustomEmail: async (req, res, next) => {
    try {
      const { to, subject, message } = req.body;

      if (!to || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: "To, subject, and message are required",
        });
      }

      await emailService.sendEmail(to, subject, message, message);

      res.status(200).json({
        success: true,
        message: "Email sent successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  
  testEmail: async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      await emailService.sendEmail(
        email,
        "Test Email from Wallethaven",
        "<h1>Test Email</h1><p>Your email configuration is working correctly! 🎉</p>",
        "Test Email - Your email configuration is working correctly!"
      );

      res.status(200).json({
        success: true,
        message: "Test email sent successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};

