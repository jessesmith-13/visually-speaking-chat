import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth, useSession, useUser } from "../hooks";
import { useApp } from "@/app/hooks";
import type { AppContextType } from "@/app/contexts/AppContext";
import type { User } from "@/features/profile/types";

// Mock dependencies
vi.mock("@/app/hooks", () => ({
  useApp: vi.fn(),
}));

const mockUser: User = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  purchasedTickets: ["event-1"],
  isAdmin: false,
};

describe("Auth Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useAuth", () => {
    it("should return authenticated user", () => {
      vi.mocked(useApp).mockReturnValue({
        user: mockUser,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it("should return null for unauthenticated user", () => {
      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it("should return loading state", () => {
      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: true,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should return setUser function", () => {
      const mockSetUser = vi.fn();

      vi.mocked(useApp).mockReturnValue({
        user: mockUser,
        setUser: mockSetUser,
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useAuth());

      expect(result.current.setUser).toBe(mockSetUser);
    });

    it("should handle admin users", () => {
      const adminUser: User = {
        ...mockUser,
        isAdmin: true,
      };

      vi.mocked(useApp).mockReturnValue({
        user: adminUser,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useAuth());

      expect(result.current.user?.isAdmin).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("useSession", () => {
    it("should return session for authenticated user", () => {
      vi.mocked(useApp).mockReturnValue({
        user: mockUser,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useSession());

      expect(result.current.session).toEqual({ user: mockUser });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it("should return null session for unauthenticated user", () => {
      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useSession());

      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it("should return loading state", () => {
      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: true,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useSession());

      expect(result.current.loading).toBe(true);
      expect(result.current.session).toBeNull();
    });

    it("should handle user with tickets", () => {
      const userWithTickets: User = {
        ...mockUser,
        purchasedTickets: ["event-1", "event-2", "event-3"],
      };

      vi.mocked(useApp).mockReturnValue({
        user: userWithTickets,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useSession());

      expect(result.current.session?.user.purchasedTickets).toHaveLength(3);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("useUser", () => {
    it("should return authenticated user", () => {
      vi.mocked(useApp).mockReturnValue({
        user: mockUser,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useUser());

      expect(result.current).toEqual(mockUser);
    });

    it("should return null for unauthenticated user", () => {
      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useUser());

      expect(result.current).toBeNull();
    });

    it("should return user with all properties", () => {
      const completeUser: User = {
        id: "user-2",
        email: "complete@example.com",
        name: "Complete User",
        purchasedTickets: ["event-1", "event-2"],
        isAdmin: true,
      };

      vi.mocked(useApp).mockReturnValue({
        user: completeUser,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useUser());

      expect(result.current?.id).toBe("user-2");
      expect(result.current?.email).toBe("complete@example.com");
      expect(result.current?.name).toBe("Complete User");
      expect(result.current?.purchasedTickets).toHaveLength(2);
      expect(result.current?.isAdmin).toBe(true);
    });

    it("should handle user state changes", () => {
      const { result, rerender } = renderHook(() => useUser());

      // Initially no user
      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      rerender();
      expect(result.current).toBeNull();

      // User logs in
      vi.mocked(useApp).mockReturnValue({
        user: mockUser,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      rerender();
      expect(result.current).toEqual(mockUser);
    });
  });
});
