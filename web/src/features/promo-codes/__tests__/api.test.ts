import { describe, it, expect, vi, beforeEach } from "vitest";
import * as api from "../api";
import { callEdgeFunction } from "@/lib/edge/client";
import type { CreatePromoCodeInput, PromoCode } from "../types";

// Mock the edge function client
vi.mock("@/lib/edge/client", () => ({
  callEdgeFunction: vi.fn(),
}));

describe("Promo Code API", () => {
  const mockCallEdgeFunction = vi.mocked(callEdgeFunction);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchPromoCodes", () => {
    it("should fetch all promo codes", async () => {
      const mockPromoCodes: PromoCode[] = [
        {
          id: "1",
          code: "SUMMER50",
          type: "percent",
          amount: 50,
          active: true,
          max_redemptions: 100,
          redeemed_count: 25,
          expires_at: null,
          event_id: null,
          created_by: "admin-user-id",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          code: "FREEEVENT",
          type: "free",
          amount: 100,
          active: true,
          max_redemptions: 50,
          redeemed_count: 10,
          expires_at: null,
          event_id: "event-123",
          created_by: "admin-user-id",
          created_at: "2024-01-02T00:00:00Z",
        },
      ];

      mockCallEdgeFunction.mockResolvedValue({ promoCodes: mockPromoCodes });

      const result = await api.fetchPromoCodes();

      expect(mockCallEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/promo-codes",
        { method: "GET" },
      );
      expect(result).toEqual(mockPromoCodes);
    });

    it("should return empty array if no promo codes", async () => {
      mockCallEdgeFunction.mockResolvedValue({});

      const result = await api.fetchPromoCodes();

      expect(result).toEqual([]);
    });
  });

  describe("createPromoCode", () => {
    it("should create a new promo code", async () => {
      const input: CreatePromoCodeInput = {
        code: "NEWCODE",
        type: "percent",
        amount: 25,
        maxRedemptions: 100,
        eventId: null,
        expiresAt: null,
      };

      const mockPromoCode: PromoCode = {
        id: "new-id",
        code: input.code,
        type: input.type,
        amount: input.amount,
        max_redemptions: input.maxRedemptions,
        event_id: input.eventId ?? null,
        expires_at: input.expiresAt ?? null,
        active: true,
        redeemed_count: 0,
        created_by: "admin-user-id",
        created_at: "2024-01-03T00:00:00Z",
      };

      mockCallEdgeFunction.mockResolvedValue({ promoCode: mockPromoCode });

      const result = await api.createPromoCode(input);

      expect(mockCallEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/promo-codes",
        {
          method: "POST",
          body: input,
        },
      );
      expect(result).toEqual(mockPromoCode);
    });
  });

  describe("updatePromoCode", () => {
    it("should update an existing promo code", async () => {
      const promoCodeId = "promo-123";
      const updates = {
        active: false,
        maxRedemptions: 200,
      };

      const mockUpdatedPromo: PromoCode = {
        id: promoCodeId,
        code: "UPDATED",
        type: "percent",
        amount: 50,
        active: false,
        max_redemptions: 200,
        redeemed_count: 50,
        expires_at: null,
        event_id: null,
        created_by: "admin-user-id",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockCallEdgeFunction.mockResolvedValue({ promoCode: mockUpdatedPromo });

      const result = await api.updatePromoCode(promoCodeId, updates);

      expect(mockCallEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        `/promo-codes/${promoCodeId}`,
        {
          method: "PUT",
          body: updates,
        },
      );
      expect(result).toEqual(mockUpdatedPromo);
    });
  });

  describe("deletePromoCode", () => {
    it("should delete a promo code", async () => {
      const promoCodeId = "promo-to-delete";

      mockCallEdgeFunction.mockResolvedValue({});

      await api.deletePromoCode(promoCodeId);

      expect(mockCallEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        `/promo-codes/${promoCodeId}`,
        { method: "DELETE" },
      );
    });
  });

  describe("redeemPromoCode", () => {
    it("should redeem a valid promo code for free ticket", async () => {
      const eventId = "event-123";
      const code = "FREECODE";
      const mockResponse = {
        free: true,
        ticket: {
          id: "ticket-123",
          userId: "user-456",
          eventId: eventId,
        },
        promoCodeId: "promo-123",
      };

      mockCallEdgeFunction.mockResolvedValue(mockResponse);

      const result = await api.redeemPromoCode(eventId, code);

      expect(mockCallEdgeFunction).toHaveBeenCalledWith("tickets", "/redeem", {
        method: "POST",
        body: { eventId, code },
      });
      expect(result).toEqual(mockResponse);
      expect(result.free).toBe(true);
    });

    it("should redeem a valid promo code with discount", async () => {
      const eventId = "event-123";
      const code = "SUMMER50";
      const mockResponse = {
        free: false,
        discountedAmount: 25,
        originalAmount: 50,
        discount: 50,
        promoCodeId: "promo-123",
      };

      mockCallEdgeFunction.mockResolvedValue(mockResponse);

      const result = await api.redeemPromoCode(eventId, code);

      expect(result).toEqual(mockResponse);
      expect(result.free).toBe(false);
      expect(result.discount).toBe(50);
    });
  });

  describe("issueCompTicket", () => {
    it("should issue a comp ticket", async () => {
      const input = {
        eventId: "event-123",
        targetUserId: "user-456",
      };

      const mockTicket = {
        id: "ticket-123",
        userId: "user-456",
        eventId: input.eventId,
        purchasePrice: 0,
      };

      mockCallEdgeFunction.mockResolvedValue({ ticket: mockTicket });

      const result = await api.issueCompTicket(input);

      expect(mockCallEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/comp-ticket",
        {
          method: "POST",
          body: input,
        },
      );
      expect(result).toEqual(mockTicket);
    });
  });
});
