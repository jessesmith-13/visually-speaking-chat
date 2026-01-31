import { describe, it, expect, vi, beforeEach } from "vitest";
import * as api from "../api";
import { supabase } from "@/lib/supabase/client";
import type {
  AuthTokenResponsePassword,
  Session,
  User,
  AuthError,
  OAuthResponse,
  UserResponse,
} from "@supabase/supabase-js";

// Mock the supabase client
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

// Helper function to create mock auth errors
const createAuthError = (message: string, status: number = 400): AuthError => {
  const error = new Error(message) as AuthError;
  error.name = "AuthError";
  error.status = status;
  return error;
};

describe("Auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("should sign in with email and password", async () => {
      const mockCredentials = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser: User = {
        id: "user-1",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2026-01-01T00:00:00.000Z",
      };

      const mockSession: Session = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      };

      const mockResponse: AuthTokenResponsePassword = {
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue(
        mockResponse,
      );

      const result = await api.signIn(mockCredentials);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(
        mockCredentials,
      );
      expect(result).toEqual(mockResponse);
      expect(result.data.user?.email).toBe("test@example.com");
    });

    it("should handle sign in errors", async () => {
      const mockCredentials = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const mockResponse: AuthTokenResponsePassword = {
        data: {
          user: null,
          session: null,
        },
        error: createAuthError("Invalid credentials"),
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue(
        mockResponse,
      );

      const result = await api.signIn(mockCredentials);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe("Invalid credentials");
    });
  });

  describe("signUp", () => {
    it("should sign up with email and password", async () => {
      const mockCredentials = {
        email: "newuser@example.com",
        password: "password123",
      };

      const mockUser: User = {
        id: "user-2",
        email: "newuser@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2026-01-01T00:00:00.000Z",
      };

      const mockSession: Session = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      };

      const mockResponse: AuthTokenResponsePassword = {
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValue(mockResponse);

      const result = await api.signUp(mockCredentials);

      expect(supabase.auth.signUp).toHaveBeenCalledWith(mockCredentials);
      expect(result).toEqual(mockResponse);
      expect(result.data.user?.email).toBe("newuser@example.com");
    });

    it("should sign up with additional options", async () => {
      const mockCredentials = {
        email: "newuser@example.com",
        password: "password123",
        options: {
          data: {
            full_name: "New User",
          },
          emailRedirectTo: "https://example.com/welcome",
        },
      };

      const mockUser: User = {
        id: "user-3",
        email: "newuser@example.com",
        app_metadata: {},
        user_metadata: {
          full_name: "New User",
        },
        aud: "authenticated",
        created_at: "2026-01-01T00:00:00.000Z",
      };

      const mockSession: Session = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      };

      const mockResponse: AuthTokenResponsePassword = {
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValue(mockResponse);

      const result = await api.signUp(mockCredentials);

      expect(supabase.auth.signUp).toHaveBeenCalledWith(mockCredentials);
      expect(result.data.user?.user_metadata?.full_name).toBe("New User");
    });

    it("should handle sign up errors", async () => {
      const mockCredentials = {
        email: "existing@example.com",
        password: "password123",
      };

      const mockResponse: AuthTokenResponsePassword = {
        data: {
          user: null,
          session: null,
        },
        error: createAuthError("User already registered"),
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValue(mockResponse);

      const result = await api.signUp(mockCredentials);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe("User already registered");
    });
  });

  describe("signInWithGoogle", () => {
    it("should initiate Google OAuth sign in", async () => {
      const mockOptions = {
        provider: "google" as const,
        options: {
          redirectTo: "https://example.com/auth/callback",
        },
      };

      const mockResponse: OAuthResponse = {
        data: {
          provider: "google",
          url: "https://accounts.google.com/oauth/authorize?...",
        },
        error: null,
      };

      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue(mockResponse);

      const result = await api.signInWithGoogle(mockOptions);

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(mockOptions);
      expect(result).toEqual(mockResponse);
      expect(result.data.url).toBeTruthy();
    });

    it("should handle OAuth errors", async () => {
      const mockOptions = {
        provider: "google" as const,
      };

      const mockResponse: OAuthResponse = {
        data: {
          provider: "google",
          url: null,
        },
        error: createAuthError("OAuth provider not configured"),
      };

      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue(mockResponse);

      const result = await api.signInWithGoogle(mockOptions);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe("OAuth provider not configured");
    });
  });

  describe("signOut", () => {
    it("should sign out successfully", async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      await expect(api.signOut()).resolves.toBeUndefined();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe("getSession", () => {
    it("should get current session", async () => {
      const mockUser: User = {
        id: "user-1",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2026-01-01T00:00:00.000Z",
      };

      const mockSession: Session = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await api.getSession();

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
      expect(result?.user.email).toBe("test@example.com");
    });

    it("should return null when no session exists", async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await api.getSession();

      expect(result).toBeNull();
    });

    it("should throw error when get session fails", async () => {
      const mockError = createAuthError("Failed to get session", 500);

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      await expect(api.getSession()).rejects.toEqual(mockError);
    });
  });

  describe("getUser", () => {
    it("should get current user", async () => {
      const mockUser: User = {
        id: "user-1",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {
          full_name: "Test User",
        },
        aud: "authenticated",
        created_at: "2026-01-01T00:00:00.000Z",
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await api.getUser();

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
      expect(result?.email).toBe("test@example.com");
    });

    it("should return null when no user is authenticated", async () => {
      // Type assertion for test mock - Supabase's type doesn't allow null user with no error,
      // but this can occur in practice when no user is logged in
      const mockResponse = {
        data: { user: null },
        error: null,
      } as unknown as UserResponse;

      vi.mocked(supabase.auth.getUser).mockResolvedValue(mockResponse);

      const result = await api.getUser();

      expect(result).toBeNull();
    });

    it("should throw error when get user fails", async () => {
      const mockError = createAuthError("Failed to get user", 500);

      const mockResponse = {
        data: { user: null },
        error: mockError,
      } as unknown as UserResponse;

      vi.mocked(supabase.auth.getUser).mockResolvedValue(mockResponse);

      await expect(api.getUser()).rejects.toEqual(mockError);
    });
  });
});
