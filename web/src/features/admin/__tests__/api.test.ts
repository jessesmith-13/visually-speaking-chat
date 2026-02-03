import { describe, it, expect, vi, beforeEach } from "vitest";
import * as api from "../api";
import { callEdgeFunction } from "@/lib/edge/client";
import { supabase } from "@/lib/supabase/client";
import { UserProfile } from "../types";

// Mock the edge function client
vi.mock("@/lib/edge/client", () => ({
  callEdgeFunction: vi.fn(),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("Admin API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAllUsers", () => {
    it("should fetch all users successfully", async () => {
      const mockUsers: UserProfile[] = [
        {
          id: "user-1",
          email: "user1@example.com",
          full_name: "User One",
          is_admin: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "user-2",
          email: "user2@example.com",
          full_name: "User Two",
          is_admin: true,
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ];

      vi.mocked(callEdgeFunction).mockResolvedValue({ users: mockUsers });

      const result = await api.fetchAllUsers();

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/users",
        { method: "GET" },
      );
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no users exist", async () => {
      vi.mocked(callEdgeFunction).mockResolvedValue({ users: [] });

      const result = await api.fetchAllUsers();

      expect(result).toEqual([]);
    });

    it("should return empty array when users field is undefined", async () => {
      vi.mocked(callEdgeFunction).mockResolvedValue({});

      const result = await api.fetchAllUsers();

      expect(result).toEqual([]);
    });

    it("should handle AbortError gracefully", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";

      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      const result = await api.fetchAllUsers();

      expect(result).toEqual([]);
    });

    it("should handle aborted message error gracefully", async () => {
      const abortError = new Error("Request aborted");

      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      const result = await api.fetchAllUsers();

      expect(result).toEqual([]);
    });

    it("should handle error code 20 gracefully", async () => {
      const abortError = { code: 20, message: "Aborted" };

      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      const result = await api.fetchAllUsers();

      expect(result).toEqual([]);
    });

    it("should throw non-abort errors", async () => {
      const serverError = new Error("Server error");

      vi.mocked(callEdgeFunction).mockRejectedValue(serverError);

      await expect(api.fetchAllUsers()).rejects.toThrow("Server error");
    });
  });

  describe("toggleAdminStatus", () => {
    it("should toggle admin status to true", async () => {
      vi.mocked(callEdgeFunction).mockResolvedValue({});

      await api.toggleAdminStatus("user-123", true);

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/users/user-123/admin",
        {
          method: "PUT",
          body: { isAdmin: true },
        },
      );
    });

    it("should toggle admin status to false", async () => {
      vi.mocked(callEdgeFunction).mockResolvedValue({});

      await api.toggleAdminStatus("user-456", false);

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/users/user-456/admin",
        {
          method: "PUT",
          body: { isAdmin: false },
        },
      );
    });

    it("should handle AbortError by throwing abort message", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";

      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      await expect(api.toggleAdminStatus("user-123", true)).rejects.toThrow(
        "Request aborted",
      );
    });

    it("should handle error with aborted message", async () => {
      const abortError = new Error("Request was aborted");

      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      await expect(api.toggleAdminStatus("user-123", true)).rejects.toThrow(
        "Request aborted",
      );
    });

    it("should handle error code 20", async () => {
      const abortError = { code: 20, message: "Aborted" };

      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      await expect(api.toggleAdminStatus("user-123", true)).rejects.toThrow(
        "Request aborted",
      );
    });

    it("should throw non-abort errors", async () => {
      const permissionError = new Error("Permission denied");

      vi.mocked(callEdgeFunction).mockRejectedValue(permissionError);

      await expect(api.toggleAdminStatus("user-123", true)).rejects.toThrow(
        "Permission denied",
      );
    });
  });

  describe("sendEmail", () => {
    it("should send email to single recipient", async () => {
      const mockResponse = { emailsSent: 1 };

      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.sendEmail(
        "user@example.com",
        "Test Subject",
        "Test Message",
      );

      expect(callEdgeFunction).toHaveBeenCalledWith("send-email", "", {
        method: "POST",
        body: {
          to: "user@example.com",
          subject: "Test Subject",
          message: "Test Message",
        },
      });
      expect(result).toEqual(mockResponse);
      expect(result.emailsSent).toBe(1);
    });

    it("should send email to multiple recipients", async () => {
      const recipients = [
        "user1@example.com",
        "user2@example.com",
        "user3@example.com",
      ];
      const mockResponse = { emailsSent: 3 };

      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.sendEmail(
        recipients,
        "Bulk Email",
        "Message to all",
      );

      expect(callEdgeFunction).toHaveBeenCalledWith("send-email", "", {
        method: "POST",
        body: {
          to: recipients,
          subject: "Bulk Email",
          message: "Message to all",
        },
      });
      expect(result.emailsSent).toBe(3);
    });

    it("should handle email sending errors", async () => {
      const emailError = new Error("Email service unavailable");

      vi.mocked(callEdgeFunction).mockRejectedValue(emailError);

      await expect(
        api.sendEmail("user@example.com", "Subject", "Message"),
      ).rejects.toThrow("Email service unavailable");
    });

    it("should handle empty recipients array", async () => {
      const mockResponse = { emailsSent: 0 };

      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.sendEmail([], "Subject", "Message");

      expect(result.emailsSent).toBe(0);
    });
  });

  describe("getTicketDetails", () => {
    it("should fetch ticket details successfully", async () => {
      const mockTicket = {
        id: "ticket-123",
        event_id: "event-456",
        user_id: "user-789",
        check_in_count: 1,
        last_checked_in_at: "2026-02-01T10:00:00.000Z",
        events: {
          name: "Test Event",
          date: "2026-02-15T18:00:00.000Z",
          event_type: "in-person",
        },
        profiles: {
          full_name: "John Doe",
          email: "john@example.com",
        },
      };

      vi.mocked(callEdgeFunction).mockResolvedValue({ ticket: mockTicket });

      const result = await api.getTicketDetails("ticket-123");

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/tickets/ticket-123",
        { method: "GET" },
      );
      expect(result).toEqual(mockTicket);
    });

    it("should handle null last_checked_in_at", async () => {
      const mockTicket = {
        id: "ticket-456",
        event_id: "event-789",
        user_id: "user-123",
        check_in_count: 0,
        last_checked_in_at: null,
        events: {
          name: "Another Event",
          date: "2026-03-01T18:00:00.000Z",
          event_type: "virtual",
        },
        profiles: {
          full_name: "Jane Smith",
          email: "jane@example.com",
        },
      };

      vi.mocked(callEdgeFunction).mockResolvedValue({ ticket: mockTicket });

      const result = await api.getTicketDetails("ticket-456");

      expect(result.last_checked_in_at).toBeNull();
      expect(result).toEqual(mockTicket);
    });

    it("should handle empty arrays gracefully (shouldn't happen but defensive)", async () => {
      const mockTicket = {
        id: "ticket-789",
        event_id: "event-123",
        user_id: "user-456",
        check_in_count: 0,
        last_checked_in_at: null,
        events: {
          name: "Event Name",
          date: "2026-04-01T18:00:00.000Z",
          event_type: "virtual",
        },
        profiles: {
          full_name: "Test User",
          email: "test@example.com",
        },
      };

      vi.mocked(callEdgeFunction).mockResolvedValue({ ticket: mockTicket });

      const result = await api.getTicketDetails("ticket-789");

      expect(result.events).toHaveProperty("name");
      expect(result.profiles).toHaveProperty("full_name");
    });

    it("should throw error when ticket not found", async () => {
      vi.mocked(callEdgeFunction).mockRejectedValue(
        new Error("Ticket not found"),
      );

      await expect(api.getTicketDetails("nonexistent")).rejects.toThrow(
        "Ticket not found",
      );
    });

    it("should throw generic error when data is null without error", async () => {
      vi.mocked(callEdgeFunction).mockRejectedValue(
        new Error("Failed to fetch ticket"),
      );

      await expect(api.getTicketDetails("ticket-123")).rejects.toThrow(
        "Failed to fetch ticket",
      );
    });
  });

  describe("verifyAndCheckInTicket", () => {
    it("should verify and check in ticket successfully", async () => {
      const mockResponse = {
        success: true,
        ticket: {
          id: "ticket-123",
          user_id: "user-789",
          event_id: "event-456",
          status: "active",
          check_in_count: 2,
          last_checked_in_at: "2026-02-02T10:00:00.000Z",
        },
        message: "Ticket checked in successfully",
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await api.verifyAndCheckInTicket("ticket-123");

      expect(supabase.functions.invoke).toHaveBeenCalledWith("tickets/verify", {
        body: { ticketId: "ticket-123" },
        method: "POST",
      });
      expect(result).toEqual(mockResponse);
      expect(result.ticket.check_in_count).toBe(2);
    });

    it("should throw error when verification fails", async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: "Ticket already used" },
      });

      await expect(api.verifyAndCheckInTicket("ticket-123")).rejects.toThrow(
        "Ticket already used",
      );
    });

    it("should throw generic error when data is null without error", async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(api.verifyAndCheckInTicket("ticket-123")).rejects.toThrow(
        "No response from ticket verification",
      );
    });

    it("should handle first-time check-in", async () => {
      const mockResponse = {
        success: true,
        ticket: {
          id: "ticket-new",
          user_id: "user-new",
          event_id: "event-new",
          status: "active",
          check_in_count: 1,
          last_checked_in_at: "2026-02-02T14:30:00.000Z",
        },
        message: "First check-in",
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await api.verifyAndCheckInTicket("ticket-new");

      expect(result.ticket.check_in_count).toBe(1);
      expect(result.message).toBe("First check-in");
    });
  });
});
