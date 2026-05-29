// Single source of truth for Supabase client across the app.
// This avoids split auth/session state caused by importing different clients.
export { supabase } from "../integrations/supabase/client";
