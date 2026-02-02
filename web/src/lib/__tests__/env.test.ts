import { describe, it, expect, beforeEach, vi } from "vitest";
import { validateEnv } from "../env";

describe("env", () => {
  describe("validateEnv", () => {
    beforeEach(() => {
      // Clear console.error mock before each test
      vi.clearAllMocks();
    });

    it("should return true when all required environment variables are set", () => {
      // Environment variables are mocked in test/setup.ts
      const result = validateEnv();

      expect(result).toBe(true);
    });

    it("should return false when VITE_SUPABASE_URL is missing", async () => {
      // Spy on console.error
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock missing URL
      const originalUrl = import.meta.env.VITE_SUPABASE_URL;
      vi.stubEnv("VITE_SUPABASE_URL", "");

      // Need to re-import to get updated env values
      vi.resetModules();
      const { validateEnv: validateEnvReimported } = await import("../env");

      const result = validateEnvReimported();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ Missing required environment variables:",
        expect.arrayContaining(["VITE_SUPABASE_URL"]),
      );

      // Restore
      vi.stubEnv("VITE_SUPABASE_URL", originalUrl);
      consoleErrorSpy.mockRestore();
    });

    it("should return false when VITE_SUPABASE_ANON_KEY is missing", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const originalKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

      vi.resetModules();
      const { validateEnv: validateEnvReimported } = await import("../env");

      const result = validateEnvReimported();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ Missing required environment variables:",
        expect.arrayContaining(["VITE_SUPABASE_ANON_KEY"]),
      );

      vi.stubEnv("VITE_SUPABASE_ANON_KEY", originalKey);
      consoleErrorSpy.mockRestore();
    });

    it("should return false when multiple environment variables are missing", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const originalUrl = import.meta.env.VITE_SUPABASE_URL;
      const originalKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      vi.stubEnv("VITE_SUPABASE_URL", "");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

      vi.resetModules();
      const { validateEnv: validateEnvReimported } = await import("../env");

      const result = validateEnvReimported();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ Missing required environment variables:",
        expect.arrayContaining(["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]),
      );

      vi.stubEnv("VITE_SUPABASE_URL", originalUrl);
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", originalKey);
      consoleErrorSpy.mockRestore();
    });

    it("should allow optional VITE_STRIPE_PUBLISHABLE_KEY to be missing", () => {
      // Stripe key is optional, so validation should still pass
      const originalStripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", "");

      const result = validateEnv();

      expect(result).toBe(true);

      vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", originalStripeKey);
    });
  });

  describe("env object", () => {
    it("should export environment variables in correct structure", async () => {
      const { env } = await import("../env");

      expect(env).toHaveProperty("supabase");
      expect(env.supabase).toHaveProperty("url");
      expect(env.supabase).toHaveProperty("anonKey");

      expect(env).toHaveProperty("stripe");
      expect(env.stripe).toHaveProperty("publishableKey");

      expect(env).toHaveProperty("isDev");
      expect(env).toHaveProperty("isProd");
      expect(env).toHaveProperty("mode");
    });

    it("should have boolean values for isDev and isProd", async () => {
      const { env } = await import("../env");

      expect(typeof env.isDev).toBe("boolean");
      expect(typeof env.isProd).toBe("boolean");
    });

    it("should have mode as a string", async () => {
      const { env } = await import("../env");

      expect(typeof env.mode).toBe("string");
    });
  });
});
