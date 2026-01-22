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
export const SUPABASE_URL = mustGetEnv("SUPABASE_URL");
export const SUPABASE_ANON_KEY = mustGetEnv("SUPABASE_ANON_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = mustGetEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
);

// Optional environment variables (may not be set in all deployments)
export const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
export const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

// CORS allowlist - comma-separated origins, or empty for localhost-only in dev
export const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "";
export const JWT_SECRET = mustGetEnv("JWT_SECRET");

// Email configuration based on environment
export const ENVIRONMENT = Deno.env.get("ENVIRONMENT") || "development";

/**
 * Get the "from" email address based on environment
 * - development: Uses Resend's test email (no verification needed)
 * - production: Uses verified custom domain
 */
export function getFromEmail(): string {
  if (ENVIRONMENT === "production") {
    return "Visually Speaking <kellie@visuallyspeaking.info>";
  }
  // Development & Test - use Resend's onboarding email
  return "Visually Speaking <onboarding@resend.dev>";
}
