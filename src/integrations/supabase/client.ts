import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://nbotxsgzmtnwdzurxqzu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ib3R4c2d6bXRud2R6dXJ4cXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTM1NTYsImV4cCI6MjA5NTE4OTU1Nn0.ly-8671DRtkylVU9I7omKOpkgkyVUrEQR_b2VI1-5Ak";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
