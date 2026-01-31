import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAdminUsers, useAdminEmail } from "../hooks";
import * as api from "../api";
import { UserProfile } from "../types";

// Mock the API functions
vi.mock("../api", () => ({
  fetchAllUsers: vi.fn(),
  sendEmail: vi.fn(),
}));

describe("Admin Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useAdminUsers", () => {
    it("should initialize with empty state", () => {
      const { result } = renderHook(() => useAdminUsers());

      expect(result.current.users).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it("should load users successfully", async () => {
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

      vi.mocked(api.fetchAllUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useAdminUsers());

      // Should start not loading
      expect(result.current.loading).toBe(false);

      // Call loadUsers and wait for it to complete
      await result.current.loadUsers();

      // Should have users and not be loading
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.users).toEqual(mockUsers);
      });

      expect(api.fetchAllUsers).toHaveBeenCalledTimes(1);
    });

    it("should handle loading errors gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      vi.mocked(api.fetchAllUsers).mockRejectedValue(
        new Error("Failed to fetch"),
      );

      const { result } = renderHook(() => useAdminUsers());

      // Wait for load to complete (should throw)
      await expect(result.current.loadUsers()).rejects.toThrow(
        "Failed to fetch",
      );

      // Should not be loading anymore (finally block)
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Users should still be empty
      expect(result.current.users).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it("should refresh users using refreshUsers method", async () => {
      const mockUsers: UserProfile[] = [
        {
          id: "user-1",
          email: "user1@example.com",
          full_name: "User One",
          is_admin: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ];

      vi.mocked(api.fetchAllUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useAdminUsers());

      // Use refreshUsers instead of loadUsers
      await result.current.refreshUsers();

      await waitFor(() => {
        expect(result.current.users).toEqual(mockUsers);
        expect(result.current.loading).toBe(false);
      });

      expect(api.fetchAllUsers).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple consecutive load calls", async () => {
      const mockUsers1: UserProfile[] = [
        {
          id: "user-1",
          email: "user1@example.com",
          full_name: "User One",
          is_admin: false,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ];

      const mockUsers2: UserProfile[] = [
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

      vi.mocked(api.fetchAllUsers)
        .mockResolvedValueOnce(mockUsers1)
        .mockResolvedValueOnce(mockUsers2);

      const { result } = renderHook(() => useAdminUsers());

      // First load
      await result.current.loadUsers();

      await waitFor(() => {
        expect(result.current.users).toEqual(mockUsers1);
      });

      // Second load
      await result.current.loadUsers();

      await waitFor(() => {
        expect(result.current.users).toEqual(mockUsers2);
      });

      expect(api.fetchAllUsers).toHaveBeenCalledTimes(2);
    });

    it("should set loading to false even when fetch returns empty array", async () => {
      vi.mocked(api.fetchAllUsers).mockResolvedValue([]);

      const { result } = renderHook(() => useAdminUsers());

      await result.current.loadUsers();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.users).toEqual([]);
      });
    });
  });

  describe("useAdminEmail", () => {
    it("should initialize with not sending state", () => {
      const { result } = renderHook(() => useAdminEmail());

      expect(result.current.sending).toBe(false);
    });

    it("should send email successfully", async () => {
      const mockResponse = { emailsSent: 1 };
      vi.mocked(api.sendEmail).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAdminEmail());

      // Should start not sending
      expect(result.current.sending).toBe(false);

      // Send email and wait for completion
      const response = await result.current.sendEmail(
        "Test Subject",
        "Test Body",
        ["user@example.com"],
      );

      // Should not be sending anymore
      await waitFor(() => {
        expect(result.current.sending).toBe(false);
      });

      expect(response).toEqual(mockResponse);
      expect(api.sendEmail).toHaveBeenCalledWith(
        ["user@example.com"],
        "Test Subject",
        "Test Body",
      );
    });

    it("should send email to multiple recipients", async () => {
      const recipients = [
        "user1@example.com",
        "user2@example.com",
        "user3@example.com",
      ];
      const mockResponse = { emailsSent: 3 };

      vi.mocked(api.sendEmail).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAdminEmail());

      const response = await result.current.sendEmail(
        "Bulk Subject",
        "Bulk Body",
        recipients,
      );

      await waitFor(() => {
        expect(result.current.sending).toBe(false);
      });

      expect(response?.emailsSent).toBe(3);
      expect(api.sendEmail).toHaveBeenCalledWith(
        recipients,
        "Bulk Subject",
        "Bulk Body",
      );
    });

    it("should handle email sending errors", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      vi.mocked(api.sendEmail).mockRejectedValue(
        new Error("Email service unavailable"),
      );

      const { result } = renderHook(() => useAdminEmail());

      // Wait for error to occur
      await expect(
        result.current.sendEmail("Subject", "Body", ["user@example.com"]),
      ).rejects.toThrow("Email service unavailable");

      // Should not be sending anymore (finally block)
      await waitFor(() => {
        expect(result.current.sending).toBe(false);
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle multiple consecutive sends", async () => {
      vi.mocked(api.sendEmail)
        .mockResolvedValueOnce({ emailsSent: 1 })
        .mockResolvedValueOnce({ emailsSent: 2 });

      const { result } = renderHook(() => useAdminEmail());

      // First send
      const response1 = await result.current.sendEmail("Subject 1", "Body 1", [
        "user1@example.com",
      ]);

      await waitFor(() => {
        expect(result.current.sending).toBe(false);
      });

      expect(response1?.emailsSent).toBe(1);

      // Second send
      const response2 = await result.current.sendEmail("Subject 2", "Body 2", [
        "user1@example.com",
        "user2@example.com",
      ]);

      await waitFor(() => {
        expect(result.current.sending).toBe(false);
      });

      expect(response2?.emailsSent).toBe(2);
      expect(api.sendEmail).toHaveBeenCalledTimes(2);
    });

    it("should set sending to false even when no emails are sent", async () => {
      vi.mocked(api.sendEmail).mockResolvedValue({ emailsSent: 0 });

      const { result } = renderHook(() => useAdminEmail());

      const response = await result.current.sendEmail("Subject", "Body", []);

      await waitFor(() => {
        expect(result.current.sending).toBe(false);
      });

      expect(response?.emailsSent).toBe(0);
    });
  });
});
