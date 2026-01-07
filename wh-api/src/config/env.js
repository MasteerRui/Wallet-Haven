import "dotenv/config";

export const config = {
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || "main",
  OCR_API_KEY: process.env.OCR_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
  
  
  APP_URL: process.env.APP_URL || "http://localhost:3000",
};
