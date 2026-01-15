import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

// Use environment variables for better security
const supabaseUrl = env.supabase.url
const supabaseAnonKey = env.supabase.anonKey

// Export the URL and key for direct REST API calls
export { supabaseUrl, supabaseAnonKey };

// Singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'sb-btyneapnbsbgpopcfnzy-auth-token', // Explicit storage key
    },
    
  });

  return supabaseInstance;
}

// Export singleton instance
export const supabase = createSupabaseClient();