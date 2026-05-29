import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase env missing");
  console.error("SUPABASE_URL:", supabaseUrl);
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey);
  throw new Error("Missing Supabase environment variables");
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey
);
