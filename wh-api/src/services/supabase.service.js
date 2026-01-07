import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";

const supabaseUrl = config.SUPABASE_URL;
const supabaseServiceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase URL or Service Role Key in environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

