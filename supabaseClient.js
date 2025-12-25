import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(
  "https://zlkkmizsazuzmbmqhbnp.supabase.co",
  "sb_publishable_l8HBJM8g-FehGXKHqIs0tQ_Y10GEAav",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);