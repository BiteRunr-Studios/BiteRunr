import { createClient } from "@supabase/supabase-js";
import env from "@/env";

// Create a single supabase client for interacting with your database
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
