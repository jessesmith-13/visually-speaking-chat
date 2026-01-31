import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import * as api from "../api";
import { supabase } from "@/lib/supabase/client";
import { fetchUserTickets } from "@/features/tickets/api";
import type { User as AuthUser } from "@supabase/supabase-js";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

// Define types for our mocks
interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  is_admin: boolean | null;
  created_at?: string;
  updated_at?: string;
}

interface MockQueryBuilder {
  select: Mock;
  eq: Mock;
  single: Mock;
}

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/features/tickets/api", () => ({
  fetchUserTickets: vi.fn(),
}));

describe("Profile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe("fetchUserProfile", () => {
    it("should return null when no auth user is provided", async () => {
      const result = await api.fetchUserProfile(null as unknown as AuthUser);

      expect(result).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("should fetch profile and tickets for authenticated user", async () => {
      const mockAuthUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
      } as AuthUser;

      const mockProfile: ProfileRow = {
        id: "user-123",
        full_name: "Test User",
        email: "test@example.com",
        is_admin: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockTickets = ["event-1", "event-2"];

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      mockQuery.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      } as PostgrestSingleResponse<ProfileRow>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);
      vi.mocked(fetchUserTickets).mockResolvedValue(mockTickets);

      const result = await api.fetchUserProfile(mockAuthUser);

      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "user-123");
      expect(mockQuery.single).toHaveBeenCalled();
      expect(fetchUserTickets).toHaveBeenCalled();
      expect(result).toEqual({
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        purchasedTickets: mockTickets,
        isAdmin: false,
      });
    });

    it("should use email as name when full_name is null", async () => {
      const mockAuthUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
      } as AuthUser;

      const mockProfile: ProfileRow = {
        id: "user-123",
        full_name: null,
        email: "test@example.com",
        is_admin: false,
      };

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      mockQuery.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      } as PostgrestSingleResponse<ProfileRow>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);
      vi.mocked(fetchUserTickets).mockResolvedValue([]);

      const result = await api.fetchUserProfile(mockAuthUser);

      expect(result?.name).toBe("test@example.com");
    });

    it("should handle admin users correctly", async () => {
      const mockAuthUser: AuthUser = {
        id: "admin-123",
        email: "admin@example.com",
      } as AuthUser;

      const mockProfile: ProfileRow = {
        id: "admin-123",
        full_name: "Admin User",
        email: "admin@example.com",
        is_admin: true,
      };

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      mockQuery.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      } as PostgrestSingleResponse<ProfileRow>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);
      vi.mocked(fetchUserTickets).mockResolvedValue([]);

      const result = await api.fetchUserProfile(mockAuthUser);

      expect(result?.isAdmin).toBe(true);
    });

    it("should create basic user object when profile not found (PGRST116)", async () => {
      const mockAuthUser: AuthUser = {
        id: "user-123",
        email: "newuser@example.com",
      } as AuthUser;

      const mockTickets = ["event-1"];

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      } as PostgrestSingleResponse<ProfileRow>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);
      vi.mocked(fetchUserTickets).mockResolvedValue(mockTickets);

      const result = await api.fetchUserProfile(mockAuthUser);

      expect(result).toEqual({
        id: "user-123",
        name: "newuser",
        email: "newuser@example.com",
        purchasedTickets: mockTickets,
        isAdmin: false,
      });
    });

    it("should handle profile not found with empty tickets on ticket error", async () => {
      const mockAuthUser: AuthUser = {
        id: "user-123",
        email: "newuser@example.com",
      } as AuthUser;

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      } as PostgrestSingleResponse<ProfileRow>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);
      vi.mocked(fetchUserTickets).mockRejectedValue(
        new Error("Ticket fetch failed"),
      );

      const result = await api.fetchUserProfile(mockAuthUser);

      expect(result).toEqual({
        id: "user-123",
        name: "newuser",
        email: "newuser@example.com",
        purchasedTickets: [],
        isAdmin: false,
      });
    });

    it("should return null on database error (non-PGRST116)", async () => {
      const mockAuthUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
      } as AuthUser;

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST500", message: "Database error" },
      } as PostgrestSingleResponse<ProfileRow>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await api.fetchUserProfile(mockAuthUser);

      expect(result).toBeNull();
    });

    it("should handle ticket fetch errors gracefully", async () => {
      const mockAuthUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
      } as AuthUser;

      const mockProfile: ProfileRow = {
        id: "user-123",
        full_name: "Test User",
        email: "test@example.com",
        is_admin: false,
      };

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      mockQuery.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      } as PostgrestSingleResponse<ProfileRow>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);
      vi.mocked(fetchUserTickets).mockRejectedValue(
        new Error("Ticket fetch failed"),
      );

      const result = await api.fetchUserProfile(mockAuthUser);

      expect(result).toEqual({
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        purchasedTickets: [],
        isAdmin: false,
      });
    });

    it("should return null when profile is null despite no error", async () => {
      const mockAuthUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
      } as AuthUser;

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      // This is an edge case - TypeScript doesn't like both data and error being null
      // since PostgrestSingleResponse is a discriminated union, but we're testing
      // a defensive code path that guards against this unexpected state
      mockQuery.single.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as unknown as PostgrestSingleResponse<ProfileRow>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const result = await api.fetchUserProfile(mockAuthUser);

      expect(result).toBeNull();
    });

    it("should use fallback email from authUser when profile email is null", async () => {
      const mockAuthUser: AuthUser = {
        id: "user-123",
        email: "auth@example.com",
      } as AuthUser;

      const mockProfile: ProfileRow = {
        id: "user-123",
        full_name: "Test User",
        email: null,
        is_admin: false,
      };

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      mockQuery.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      } as PostgrestSingleResponse<ProfileRow>);

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);
      vi.mocked(fetchUserTickets).mockResolvedValue([]);

      const result = await api.fetchUserProfile(mockAuthUser);

      expect(result?.email).toBe("auth@example.com");
    });

    it("should handle timeout errors", async () => {
      vi.useFakeTimers();

      const mockAuthUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
      } as AuthUser;

      const mockQuery: MockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      // Create a promise that never resolves
      mockQuery.single.mockReturnValue(new Promise(() => {}));

      vi.mocked(supabase.from).mockReturnValue(mockQuery as never);

      const resultPromise = api.fetchUserProfile(mockAuthUser);

      // Fast-forward time by 10 seconds to trigger timeout
      await vi.advanceTimersByTimeAsync(10000);

      const result = await resultPromise;

      expect(result).toBeNull();

      vi.useRealTimers();
    });

    it("should return null on unexpected errors", async () => {
      const mockAuthUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
      } as AuthUser;

      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await api.fetchUserProfile(mockAuthUser);

      expect(result).toBeNull();
    });
  });
});
