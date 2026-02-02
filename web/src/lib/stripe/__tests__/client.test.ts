import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock fetch globally at module level
global.fetch = vi.fn();

// Mock the supabase client first (before edge client imports it)
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
  supabaseUrl: "https://test.supabase.co",
}));

// Mock the edge client
vi.mock("@/lib/edge/client", () => ({
  tickets: {
    createPaymentIntent: vi.fn(),
    purchaseTicket: vi.fn(),
  },
  adminOperations: {},
  matchmaking: {},
  email: {},
}));

// Mock env
vi.mock("@/lib/env", () => ({
  env: {
    stripe: {
      publishableKey: "pk_test_mock_key_123",
    },
  },
}));

// Import mocked module at top level
import { tickets } from "@/lib/edge/client";

import {
  STRIPE_PUBLISHABLE_KEY,
  createCheckoutSession,
  createPaymentIntent,
  purchaseTicketWithStripe,
} from "../client";

describe("stripe/client", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup supabase session mock
    const { supabase } = await import("@/lib/supabase/client");
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: "mock-token",
          user: { id: "mock-user-id" },
        },
      },
      error: null,
    });

    // Setup fetch mock
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => "",
    });
  });

  describe("STRIPE_PUBLISHABLE_KEY", () => {
    it("should export the Stripe publishable key from env", () => {
      expect(STRIPE_PUBLISHABLE_KEY).toBe("pk_test_mock_key_123");
    });

    it("should be a non-empty string", () => {
      expect(typeof STRIPE_PUBLISHABLE_KEY).toBe("string");
      expect(STRIPE_PUBLISHABLE_KEY.length).toBeGreaterThan(0);
    });
  });

  describe("createCheckoutSession", () => {
    it("should create a checkout session without promo code", async () => {
      const mockResponse = {
        sessionId: "cs_test_123",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_123",
      };

      vi.mocked(tickets.createPaymentIntent).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await createCheckoutSession({
        eventId: "event-123",
        amount: 2500,
      });

      expect(result).toEqual(mockResponse);
      expect(tickets.createPaymentIntent).toHaveBeenCalledWith(
        "event-123",
        2500,
        undefined,
      );
    });

    it("should create a checkout session with promo code", async () => {
      const mockResponse = {
        sessionId: "cs_test_123",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_123",
      };

      vi.mocked(tickets.createPaymentIntent).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await createCheckoutSession({
        eventId: "event-123",
        amount: 2500,
        promoCodeId: "promo-123",
      });

      expect(result).toEqual(mockResponse);
      expect(tickets.createPaymentIntent).toHaveBeenCalledWith(
        "event-123",
        2500,
        "promo-123",
      );
    });

    it("should handle zero amount (free tickets)", async () => {
      const mockResponse = {
        sessionId: "cs_test_free",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_free",
      };

      vi.mocked(tickets.createPaymentIntent).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await createCheckoutSession({
        eventId: "event-123",
        amount: 0,
        promoCodeId: "free-promo",
      });

      expect(result).toEqual(mockResponse);
      expect(tickets.createPaymentIntent).toHaveBeenCalledWith(
        "event-123",
        0,
        "free-promo",
      );
    });

    it("should propagate errors from edge client", async () => {
      vi.mocked(tickets.createPaymentIntent).mockRejectedValueOnce(
        new Error("Payment intent creation failed"),
      );

      await expect(
        createCheckoutSession({
          eventId: "event-123",
          amount: 2500,
        }),
      ).rejects.toThrow("Payment intent creation failed");
    });
  });

  describe("createPaymentIntent", () => {
    it("should be an alias for createCheckoutSession", () => {
      expect(createPaymentIntent).toBe(createCheckoutSession);
    });

    it("should work identically to createCheckoutSession", async () => {
      const mockResponse = {
        sessionId: "cs_test_456",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_456",
      };

      vi.mocked(tickets.createPaymentIntent).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await createPaymentIntent({
        eventId: "event-456",
        amount: 1500,
      });

      expect(result).toEqual(mockResponse);
      expect(tickets.createPaymentIntent).toHaveBeenCalledWith(
        "event-456",
        1500,
        undefined,
      );
    });
  });

  describe("purchaseTicketWithStripe", () => {
    it("should purchase a ticket with Stripe session ID", async () => {
      const mockTicket = {
        id: "ticket-123",
        event_id: "event-123",
        user_id: "user-123",
        amount: 2500,
        status: "active",
      };

      vi.mocked(tickets.purchaseTicket).mockResolvedValueOnce(mockTicket);

      const result = await purchaseTicketWithStripe(
        "event-123",
        2500,
        "cs_test_123",
      );

      expect(result).toEqual(mockTicket);
      expect(tickets.purchaseTicket).toHaveBeenCalledWith(
        "event-123",
        2500,
        "cs_test_123",
        false,
      );
    });

    it("should not use demo mode", async () => {
      const mockTicket = {
        id: "ticket-456",
        event_id: "event-456",
        user_id: "user-456",
        amount: 3000,
        status: "active",
      };

      vi.mocked(tickets.purchaseTicket).mockResolvedValueOnce(mockTicket);

      await purchaseTicketWithStripe("event-456", 3000, "cs_test_456");

      // Verify demo mode is false
      expect(tickets.purchaseTicket).toHaveBeenCalledWith(
        "event-456",
        3000,
        "cs_test_456",
        false,
      );
    });

    it("should handle free tickets with Stripe session", async () => {
      const mockTicket = {
        id: "ticket-free",
        event_id: "event-free",
        user_id: "user-123",
        amount: 0,
        status: "active",
      };

      vi.mocked(tickets.purchaseTicket).mockResolvedValueOnce(mockTicket);

      const result = await purchaseTicketWithStripe(
        "event-free",
        0,
        "cs_test_free",
      );

      expect(result).toEqual(mockTicket);
      expect(tickets.purchaseTicket).toHaveBeenCalledWith(
        "event-free",
        0,
        "cs_test_free",
        false,
      );
    });

    it("should propagate errors from edge client", async () => {
      vi.mocked(tickets.purchaseTicket).mockRejectedValueOnce(
        new Error("Ticket purchase failed"),
      );

      await expect(
        purchaseTicketWithStripe("event-123", 2500, "cs_test_123"),
      ).rejects.toThrow("Ticket purchase failed");
    });

    it("should handle authentication errors", async () => {
      vi.mocked(tickets.purchaseTicket).mockRejectedValueOnce(
        new Error("No authentication token found. Please log in."),
      );

      await expect(
        purchaseTicketWithStripe("event-123", 2500, "cs_test_123"),
      ).rejects.toThrow("No authentication token found");
    });

    it("should handle invalid session errors", async () => {
      vi.mocked(tickets.purchaseTicket).mockRejectedValueOnce(
        new Error("Invalid or expired Stripe session"),
      );

      await expect(
        purchaseTicketWithStripe("event-123", 2500, "cs_invalid"),
      ).rejects.toThrow("Invalid or expired Stripe session");
    });
  });

  describe("type safety", () => {
    it("should accept valid CreatePaymentIntentRequest", async () => {
      const mockResponse = {
        sessionId: "cs_test_123",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_123",
      };

      vi.mocked(tickets.createPaymentIntent).mockResolvedValueOnce(
        mockResponse,
      );

      const validRequest = {
        eventId: "event-123",
        amount: 2500,
        promoCodeId: "promo-123",
      };

      const result = await createCheckoutSession(validRequest);
      expect(result).toEqual(mockResponse);
    });

    it("should return correct CreateCheckoutResponse type", async () => {
      const mockResponse = {
        sessionId: "cs_test_123",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_123",
      };

      vi.mocked(tickets.createPaymentIntent).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await createCheckoutSession({
        eventId: "event-123",
        amount: 2500,
      });

      // Type assertions to verify structure
      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("checkoutUrl");
      expect(typeof result.sessionId).toBe("string");
      expect(typeof result.checkoutUrl).toBe("string");
    });
  });

  describe("edge cases", () => {
    it("should handle multiple sequential checkout session creations", async () => {
      const mockResponse1 = {
        sessionId: "cs_test_1",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_1",
      };

      const mockResponse2 = {
        sessionId: "cs_test_2",
        checkoutUrl: "https://checkout.stripe.com/pay/cs_test_2",
      };

      vi.mocked(tickets.createPaymentIntent)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result1 = await createCheckoutSession({
        eventId: "event-1",
        amount: 1000,
      });
      const result2 = await createCheckoutSession({
        eventId: "event-2",
        amount: 2000,
      });

      expect(result1.sessionId).toBe("cs_test_1");
      expect(result2.sessionId).toBe("cs_test_2");
      expect(tickets.createPaymentIntent).toHaveBeenCalledTimes(2);
      expect(tickets.createPaymentIntent).toHaveBeenNthCalledWith(
        1,
        "event-1",
        1000,
        undefined,
      );
      expect(tickets.createPaymentIntent).toHaveBeenNthCalledWith(
        2,
        "event-2",
        2000,
        undefined,
      );
    });
  });
});
