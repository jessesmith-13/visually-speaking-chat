import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePromoCodes } from "../hooks";
import * as api from "../api";
import type { PromoCode } from "../types";

// Mock the API module
vi.mock("../api");

describe("usePromoCodes", () => {
  const mockApi = vi.mocked(api);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchPromoCodes", () => {
    it("should fetch promo codes successfully", async () => {
      const mockPromoCodes: PromoCode[] = [
        {
          id: "1",
          code: "TEST",
          type: "percent",
          amount: 50,
          active: true,
          max_redemptions: 100,
          redeemed_count: 0,
          expires_at: null,
          event_id: null,
          created_by: "admin-user-id",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockApi.fetchPromoCodes.mockResolvedValue(mockPromoCodes);

      const { result } = renderHook(() => usePromoCodes());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();

      const promoCodes = await result.current.fetchPromoCodes();

      // Should complete successfully
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(promoCodes).toEqual(mockPromoCodes);
      expect(mockApi.fetchPromoCodes).toHaveBeenCalledTimes(1);
    });

    it("should handle fetch errors", async () => {
      const errorMessage = "Network error";
      mockApi.fetchPromoCodes.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePromoCodes());

      await expect(result.current.fetchPromoCodes()).rejects.toThrow(
        errorMessage,
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(errorMessage);
      });
    });
  });

  describe("createPromoCode", () => {
    it("should create a promo code successfully", async () => {
      const input = {
        code: "NEWCODE",
        type: "percent" as const,
        amount: 25,
        maxRedemptions: 100,
        eventId: null,
        expiresAt: null,
      };

      const mockCreatedPromo: PromoCode = {
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
        created_at: "2024-01-01T00:00:00Z",
      };

      mockApi.createPromoCode.mockResolvedValue(mockCreatedPromo);

      const { result } = renderHook(() => usePromoCodes());

      const promoCode = await result.current.createPromoCode(input);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(promoCode).toEqual(mockCreatedPromo);
      expect(mockApi.createPromoCode).toHaveBeenCalledWith(input);
    });

    it("should handle create errors", async () => {
      const input = {
        code: "DUPLICATE",
        type: "percent" as const,
        amount: 25,
        maxRedemptions: 100,
        eventId: null,
        expiresAt: null,
      };

      mockApi.createPromoCode.mockRejectedValue(
        new Error("Code already exists"),
      );

      const { result } = renderHook(() => usePromoCodes());

      await expect(result.current.createPromoCode(input)).rejects.toThrow(
        "Code already exists",
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("Code already exists");
      });
    });
  });

  describe("updatePromoCode", () => {
    it("should update a promo code successfully", async () => {
      const promoCodeId = "promo-123";
      const updates = { active: false };
      const mockUpdatedPromo: PromoCode = {
        id: promoCodeId,
        code: "TEST",
        type: "percent",
        amount: 50,
        active: false,
        max_redemptions: 100,
        redeemed_count: 0,
        expires_at: null,
        event_id: null,
        created_by: "admin-user-id",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockApi.updatePromoCode.mockResolvedValue(mockUpdatedPromo);

      const { result } = renderHook(() => usePromoCodes());

      const updated = await result.current.updatePromoCode(
        promoCodeId,
        updates,
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(updated).toEqual(mockUpdatedPromo);
      expect(mockApi.updatePromoCode).toHaveBeenCalledWith(
        promoCodeId,
        updates,
      );
    });

    it("should handle update errors", async () => {
      mockApi.updatePromoCode.mockRejectedValue(
        new Error("Promo code not found"),
      );

      const { result } = renderHook(() => usePromoCodes());

      await expect(
        result.current.updatePromoCode("invalid-id", { active: false }),
      ).rejects.toThrow("Promo code not found");

      await waitFor(() => {
        expect(result.current.error).toBe("Promo code not found");
      });
    });
  });

  describe("deletePromoCode", () => {
    it("should delete a promo code successfully", async () => {
      mockApi.deletePromoCode.mockResolvedValue();

      const { result } = renderHook(() => usePromoCodes());

      await result.current.deletePromoCode("promo-123");

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockApi.deletePromoCode).toHaveBeenCalledWith("promo-123");
    });

    it("should handle delete errors", async () => {
      mockApi.deletePromoCode.mockRejectedValue(new Error("Cannot delete"));

      const { result } = renderHook(() => usePromoCodes());

      await expect(result.current.deletePromoCode("promo-123")).rejects.toThrow(
        "Cannot delete",
      );

      await waitFor(() => {
        expect(result.current.error).toBe("Cannot delete");
      });
    });
  });

  describe("redeemPromoCode", () => {
    it("should redeem a free promo code successfully", async () => {
      const mockResponse = {
        free: true,
        ticket: {
          id: "ticket-123",
          userId: "user-456",
          eventId: "event-123",
        },
        promoCodeId: "promo-123",
      };

      mockApi.redeemPromoCode.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePromoCodes());

      const response = await result.current.redeemPromoCode(
        "event-123",
        "FREECODE",
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(response).toEqual(mockResponse);
      expect(response.free).toBe(true);
      expect(mockApi.redeemPromoCode).toHaveBeenCalledWith(
        "event-123",
        "FREECODE",
      );
    });

    it("should redeem a discount promo code successfully", async () => {
      const mockResponse = {
        free: false,
        discountedAmount: 25,
        originalAmount: 50,
        discount: 50,
        promoCodeId: "promo-123",
      };

      mockApi.redeemPromoCode.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePromoCodes());

      const response = await result.current.redeemPromoCode(
        "event-123",
        "SUMMER50",
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(response).toEqual(mockResponse);
      expect(response.free).toBe(false);
      expect(response.discount).toBe(50);
      expect(mockApi.redeemPromoCode).toHaveBeenCalledWith(
        "event-123",
        "SUMMER50",
      );
    });

    it("should handle redeem errors", async () => {
      mockApi.redeemPromoCode.mockRejectedValue(
        new Error("Invalid promo code"),
      );

      const { result } = renderHook(() => usePromoCodes());

      await expect(
        result.current.redeemPromoCode("event-123", "INVALID"),
      ).rejects.toThrow("Invalid promo code");

      await waitFor(() => {
        expect(result.current.error).toBe("Invalid promo code");
      });
    });
  });

  describe("issueCompTicket", () => {
    it("should issue a comp ticket successfully", async () => {
      const input = {
        eventId: "event-123",
        targetUserId: "user-456",
      };

      const mockTicket = {
        id: "ticket-123",
        userId: "user-456",
        eventId: input.eventId,
      };

      mockApi.issueCompTicket.mockResolvedValue(mockTicket);

      const { result } = renderHook(() => usePromoCodes());

      const ticket = await result.current.issueCompTicket(input);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(ticket).toEqual(mockTicket);
      expect(mockApi.issueCompTicket).toHaveBeenCalledWith(input);
    });

    it("should handle comp ticket errors", async () => {
      const input = {
        eventId: "event-123",
        targetUserId: "invalid-user-id",
      };

      mockApi.issueCompTicket.mockRejectedValue(new Error("User not found"));

      const { result } = renderHook(() => usePromoCodes());

      await expect(result.current.issueCompTicket(input)).rejects.toThrow(
        "User not found",
      );

      await waitFor(() => {
        expect(result.current.error).toBe("User not found");
      });
    });
  });
});
