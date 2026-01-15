/**
 * Environment variable helpers
 * Throws if required env vars are missing
 */

export function mustGetEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Export required environment variables
export const SUPABASE_URL = mustGetEnv('SUPABASE_URL');
export const SUPABASE_ANON_KEY = mustGetEnv('SUPABASE_ANON_KEY');
export const SUPABASE_SERVICE_ROLE_KEY = mustGetEnv('SUPABASE_SERVICE_ROLE_KEY');

// Optional environment variables (may not be set in all deployments)
export const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
export const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';

// CORS allowlist - comma-separated origins, or empty for localhost-only in dev
export const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') || '';
export const JWT_SECRET = mustGetEnv('JWT_SECRET');