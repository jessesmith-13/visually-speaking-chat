import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTickets, useHasTicket, useUserTickets } from "../hooks";
import * as appHooks from "@/app/hooks";
import type { User } from "@/features/profile/types";
import type { AppContextType } from "@/app/contexts/AppContext";

// Mock the app hooks
vi.mock("@/app/hooks", () => ({
  useApp: vi.fn(),
}));

describe("Tickets Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useTickets", () => {
    it("should return tickets and refresh function", () => {
      const mockRefreshUserTickets = vi.fn();
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: ["event-1", "event-2", "event-3"],
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
        user: mockUser,
        refreshUserTickets: mockRefreshUserTickets,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useTickets());

      expect(result.current.tickets).toEqual(["event-1", "event-2", "event-3"]);
      expect(result.current.refreshTickets).toBe(mockRefreshUserTickets);
      expect(result.current.loading).toBe(false);
    });

    it("should return empty array when user has no tickets", () => {
      const mockRefreshUserTickets = vi.fn();
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: [],
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
        user: mockUser,
        refreshUserTickets: mockRefreshUserTickets,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useTickets());

      expect(result.current.tickets).toEqual([]);
    });

    it("should return empty array when user is not authenticated", () => {
      const mockRefreshUserTickets = vi.fn();

      vi.mocked(appHooks.useApp).mockReturnValue({
        user: null,
        refreshUserTickets: mockRefreshUserTickets,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useTickets());

      expect(result.current.tickets).toEqual([]);
      expect(result.current.refreshTickets).toBe(mockRefreshUserTickets);
    });

    it("should allow calling refresh function", () => {
      const mockRefreshUserTickets = vi.fn();
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: ["event-1"],
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
        user: mockUser,
        refreshUserTickets: mockRefreshUserTickets,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useTickets());

      result.current.refreshTickets();

      expect(mockRefreshUserTickets).toHaveBeenCalledTimes(1);
    });
  });

  describe("useHasTicket", () => {
    it("should return true when user has ticket for event", () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: ["event-1", "event-2", "event-3"],
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
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

      const { result } = renderHook(() => useHasTicket("event-2"));

      expect(result.current).toBe(true);
    });

    it("should return false when user does not have ticket for event", () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: ["event-1", "event-3"],
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
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

      const { result } = renderHook(() => useHasTicket("event-2"));

      expect(result.current).toBe(false);
    });

    it("should return false when user is not authenticated", () => {
      vi.mocked(appHooks.useApp).mockReturnValue({
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

      const { result } = renderHook(() => useHasTicket("event-1"));

      expect(result.current).toBe(false);
    });

    it("should return false when user has no tickets", () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: [],
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
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

      const { result } = renderHook(() => useHasTicket("event-1"));

      expect(result.current).toBe(false);
    });

    it("should update when checking different events", () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: ["event-1", "event-3"],
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
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

      const { result: result1 } = renderHook(() => useHasTicket("event-1"));
      const { result: result2 } = renderHook(() => useHasTicket("event-2"));
      const { result: result3 } = renderHook(() => useHasTicket("event-3"));

      expect(result1.current).toBe(true);
      expect(result2.current).toBe(false);
      expect(result3.current).toBe(true);
    });
  });

  describe("useUserTickets", () => {
    it("should return user tickets array", () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: ["event-1", "event-2", "event-3"],
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
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

      const { result } = renderHook(() => useUserTickets());

      expect(result.current).toEqual(["event-1", "event-2", "event-3"]);
    });

    it("should return empty array when user is not authenticated", () => {
      vi.mocked(appHooks.useApp).mockReturnValue({
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

      const { result } = renderHook(() => useUserTickets());

      expect(result.current).toEqual([]);
    });

    it("should return empty array when user has no tickets", () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: [],
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
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

      const { result } = renderHook(() => useUserTickets());

      expect(result.current).toEqual([]);
    });

    it("should handle single ticket", () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: ["event-1"],
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
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

      const { result } = renderHook(() => useUserTickets());

      expect(result.current).toEqual(["event-1"]);
      expect(result.current.length).toBe(1);
    });

    it("should handle many tickets", () => {
      const mockTickets = Array.from({ length: 10 }, (_, i) => `event-${i}`);
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        purchasedTickets: mockTickets,
        isAdmin: false,
      };

      vi.mocked(appHooks.useApp).mockReturnValue({
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

      const { result } = renderHook(() => useUserTickets());

      expect(result.current).toEqual(mockTickets);
      expect(result.current.length).toBe(10);
    });
  });
});
