import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import * as api from "../api";
import { supabase } from "@/lib/supabase/client";
import { tickets as ticketsEdgeAPI } from "@/lib/edge/client";
import type { User, AuthError } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import type { Ticket } from "@/features/tickets/types";

// Define types for our mock query builder
interface MockQueryBuilder {
  select: Mock;
  eq: Mock;
}

interface TicketRow {
  event_id: string;
}

interface PaymentIntentResponse {
  sessionId: string;
  checkoutUrl: string;
}

interface CancelTicketResponse {
  refunded: boolean;
}

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock("@/lib/edge/client", () => ({
  tickets: {
    purchaseTicket: vi.fn(),
    createPaymentIntent: vi.fn(),
    cancelTicket: vi.fn(),
  },
}));

describe("Tickets API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchUserTickets", () => {
    it("should fetch active tickets for authenticated user", async () => {
      const mockUser = { id: "user-123" } as User;
      const mockTickets: TicketRow[] = [
        { event_id: "event-1" },
        { event_id: "event-2" },
        { event_id: "event-3" },
      ];

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // Only the final call in the chain returns data
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockResolvedValueOnce({
        data: mockTickets,
        error: null,
      } as PostgrestSingleResponse<TicketRow[]>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await api.fetchUserTickets();

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith("tickets");
      expect(mockQuery.select).toHaveBeenCalledWith("event_id");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockQuery.eq).toHaveBeenCalledWith("status", "active");
      expect(result).toEqual(["event-1", "event-2", "event-3"]);
    });

    it("should return empty array when user is not authenticated", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: {
          message: "Not authenticated",
          name: "AuthError",
          status: 401,
        } as AuthError,
      });

      const result = await api.fetchUserTickets();

      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("should return empty array on database error", async () => {
      const mockUser = { id: "user-123" } as User;

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // Only the final call in the chain returns data
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockResolvedValueOnce({
        data: null,
        error: new Error("Database error"),
      } as PostgrestSingleResponse<TicketRow[]>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await api.fetchUserTickets();

      expect(result).toEqual([]);
    });

    it("should filter out cancelled tickets", async () => {
      const mockUser = { id: "user-123" } as User;
      const mockTickets: TicketRow[] = [
        { event_id: "event-1" },
        { event_id: "event-2" },
      ];

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // Only the final call in the chain returns data
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockResolvedValueOnce({
        data: mockTickets,
        error: null,
      } as PostgrestSingleResponse<TicketRow[]>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      await api.fetchUserTickets();

      // Verify that status filter is applied
      expect(mockQuery.eq).toHaveBeenCalledWith("status", "active");
    });
  });

  describe("hasTicketForEvent", () => {
    it("should return true when user has ticket for event", async () => {
      const mockUser = { id: "user-123" } as User;
      const mockTickets: TicketRow[] = [
        { event_id: "event-1" },
        { event_id: "event-2" },
      ];

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // Only the final call in the chain returns data
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockResolvedValueOnce({
        data: mockTickets,
        error: null,
      } as PostgrestSingleResponse<TicketRow[]>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await api.hasTicketForEvent("event-1");

      expect(result).toBe(true);
    });

    it("should return false when user does not have ticket for event", async () => {
      const mockUser = { id: "user-123" } as User;
      const mockTickets: TicketRow[] = [
        { event_id: "event-2" },
        { event_id: "event-3" },
      ];

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // Only the final call in the chain returns data
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockResolvedValueOnce({
        data: mockTickets,
        error: null,
      } as PostgrestSingleResponse<TicketRow[]>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await api.hasTicketForEvent("event-1");

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(
        new Error("Auth error"),
      );

      const result = await api.hasTicketForEvent("event-1");

      expect(result).toBe(false);
    });
  });

  describe("purchaseTicket", () => {
    it("should call edge function to purchase ticket", async () => {
      const mockTicket: Ticket = {
        id: "ticket-123",
        user_id: "user-123",
        event_id: "event-123",
        status: "active",
        payment_intent_id: "pi_123",
        purchased_at: new Date().toISOString(),
      };
      vi.mocked(ticketsEdgeAPI.purchaseTicket).mockResolvedValue(mockTicket);

      const result = await api.purchaseTicket("event-123", 50, "pi_123", false);

      expect(ticketsEdgeAPI.purchaseTicket).toHaveBeenCalledWith(
        "event-123",
        50,
        "pi_123",
        false,
      );
      expect(result).toEqual(mockTicket);
    });

    it("should support demo mode", async () => {
      const mockTicket: Ticket = {
        id: "demo-ticket",
        user_id: "user-123",
        event_id: "event-123",
        status: "active",
        purchased_at: new Date().toISOString(),
      };
      vi.mocked(ticketsEdgeAPI.purchaseTicket).mockResolvedValue(mockTicket);

      await api.purchaseTicket("event-123", 0, undefined, true);

      expect(ticketsEdgeAPI.purchaseTicket).toHaveBeenCalledWith(
        "event-123",
        0,
        undefined,
        true,
      );
    });
  });

  describe("createPaymentIntent", () => {
    it("should call edge function to create payment intent", async () => {
      const mockIntent: PaymentIntentResponse = {
        sessionId: "session_123",
        checkoutUrl: "https://checkout.com/session_123",
      };
      vi.mocked(ticketsEdgeAPI.createPaymentIntent).mockResolvedValue(
        mockIntent,
      );

      const result = await api.createPaymentIntent("event-123", 50);

      expect(ticketsEdgeAPI.createPaymentIntent).toHaveBeenCalledWith(
        "event-123",
        50,
      );
      expect(result).toEqual(mockIntent);
    });
  });

  describe("cancelTicket", () => {
    it("should call edge function to cancel ticket", async () => {
      const mockResponse: CancelTicketResponse = { refunded: true };
      vi.mocked(ticketsEdgeAPI.cancelTicket).mockResolvedValue(mockResponse);

      const result = await api.cancelTicket("ticket-123");

      expect(ticketsEdgeAPI.cancelTicket).toHaveBeenCalledWith("ticket-123");
      expect(result).toEqual(mockResponse);
    });

    it("should handle non-refunded cancellation", async () => {
      const mockResponse: CancelTicketResponse = { refunded: false };
      vi.mocked(ticketsEdgeAPI.cancelTicket).mockResolvedValue(mockResponse);

      const result = await api.cancelTicket("ticket-123");

      expect(result).toEqual(mockResponse);
      expect(result.refunded).toBe(false);
    });
  });
});
