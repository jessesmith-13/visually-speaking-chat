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
 * safety override:
 * If set AND not production, all outgoing email recipients should be overridden
 * to this address in send-email.ts.
 *
 * Example: DEV_EMAIL_OVERRIDE="kellie@visuallyspeaking.info"
 */
export const DEV_EMAIL_OVERRIDE = Deno.env.get("DEV_EMAIL_OVERRIDE") || "";

/**
 * "From" email: use your verified domain in ALL envs.
 * This avoids Resend "testing-only" restrictions.
 *
 * NOTE:
 * - The mailbox doesn't have to exist for sending, but it's nicer if it does.
 * - Use a role inbox like no-reply@ or hello@ rather than a personal email.
 */
export function getFromEmail(): string {
  return "Visually Speaking <no-reply@visuallyspeaking.info>";
}
