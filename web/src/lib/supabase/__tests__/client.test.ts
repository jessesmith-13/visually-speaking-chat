import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("supabase/client", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("exports", () => {
    it("should export supabaseUrl", async () => {
      const { supabaseUrl } = await import("../client");
      expect(supabaseUrl).toBeDefined();
      expect(typeof supabaseUrl).toBe("string");
      expect(supabaseUrl).toContain("supabase.co");
    });

    it("should export supabaseAnonKey", async () => {
      const { supabaseAnonKey } = await import("../client");
      expect(supabaseAnonKey).toBeDefined();
      expect(typeof supabaseAnonKey).toBe("string");
      expect(supabaseAnonKey.length).toBeGreaterThan(0);
    });

    it("should export supabase client instance", async () => {
      const { supabase } = await import("../client");
      expect(supabase).toBeDefined();
      expect(supabase).toHaveProperty("auth");
      expect(supabase).toHaveProperty("from");
      expect(supabase).toHaveProperty("functions");
    });
  });

  describe("singleton pattern", () => {
    it("should return the same instance on multiple imports", async () => {
      const { supabase: instance1 } = await import("../client");
      const { supabase: instance2 } = await import("../client");
      expect(instance1).toBe(instance2);
    });
  });

  describe("client functionality", () => {
    it("should have auth methods", async () => {
      const { supabase } = await import("../client");
      expect(supabase.auth).toBeDefined();
      expect(typeof supabase.auth.getSession).toBe("function");
      expect(typeof supabase.auth.signOut).toBe("function");
    });

    it("should have database methods", async () => {
      const { supabase } = await import("../client");
      expect(typeof supabase.from).toBe("function");

      const table = supabase.from("test");
      expect(table).toBeDefined();
    });

    it("should have edge function methods", async () => {
      const { supabase } = await import("../client");
      expect(supabase.functions).toBeDefined();
      expect(typeof supabase.functions.invoke).toBe("function");
    });
  });
});
