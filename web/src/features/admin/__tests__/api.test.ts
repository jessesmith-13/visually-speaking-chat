import { describe, it, expect, vi, beforeEach } from "vitest";
import * as api from "../api";
import { callEdgeFunction } from "@/lib/edge/client";
import { UserProfile } from "../types";

// Mock the edge function client
vi.mock("@/lib/edge/client", () => ({
  callEdgeFunction: vi.fn(),
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
});
