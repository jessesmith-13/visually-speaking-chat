import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useEvents,
  useEvent,
  useCreateEvent,
  useDeleteEvent,
  useCurrentEvent,
  useEventStatus,
  usePagination,
  useTicketManagement,
  useEventUpdates,
  useEventParticipants,
} from "../hooks";
import { useApp } from "@/app/hooks";
import { tickets, adminOperations } from "@/lib/edge/client";
import { Event } from "../types";
import { User } from "@/features/profile/types";
import type { AppContextType } from "@/app/contexts/AppContext";

// Mock dependencies
vi.mock("@/app/hooks", () => ({
  useApp: vi.fn(),
}));

vi.mock("@/lib/edge/client", () => ({
  tickets: {
    getMyTickets: vi.fn(),
  },
  adminOperations: {
    getEventUpdates: vi.fn(),
    getEventParticipants: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockEvent: Event = {
  id: "event-1",
  name: "Test Event",
  description: "Test Description",
  date: new Date("2026-02-15T18:00:00.000Z"),
  duration: 120,
  price: 50,
  capacity: 100,
  attendees: 25,
  imageUrl: "https://example.com/image.jpg",
  status: "upcoming",
  eventType: "virtual",
  createdBy: "user-1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("Events Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useEvents", () => {
    it("should return events and refresh function", () => {
      const mockEvents = [mockEvent];
      const mockRefreshEvents = vi.fn();

      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: mockEvents,
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: mockRefreshEvents,
      } as AppContextType);

      const { result } = renderHook(() => useEvents());

      expect(result.current.events).toEqual(mockEvents);
      expect(result.current.refreshEvents).toBe(mockRefreshEvents);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("useEvent", () => {
    it("should return event by id", () => {
      const mockEvents = [mockEvent];

      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: mockEvents,
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useEvent("event-1"));

      expect(result.current.event).toEqual(mockEvent);
      expect(result.current.loading).toBe(false);
    });

    it("should return null for non-existent event", () => {
      const mockEvents = [mockEvent];

      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: mockEvents,
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useEvent("nonexistent"));

      expect(result.current.event).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe("useCreateEvent", () => {
    it("should return createEvent function", () => {
      const mockAddEvent = vi.fn();

      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: [],
        addEvent: mockAddEvent,
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useCreateEvent());

      expect(result.current.createEvent).toBe(mockAddEvent);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("useDeleteEvent", () => {
    it("should return deleteEvent function", () => {
      const mockRemoveEvent = vi.fn();

      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: mockRemoveEvent,
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useDeleteEvent());

      expect(result.current.deleteEvent).toBe(mockRemoveEvent);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("useCurrentEvent", () => {
    it("should return current event and setter", () => {
      const mockSetCurrentEvent = vi.fn();

      vi.mocked(useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: mockEvent,
        setCurrentEvent: mockSetCurrentEvent,
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      } as AppContextType);

      const { result } = renderHook(() => useCurrentEvent());

      expect(result.current.currentEvent).toEqual(mockEvent);
      expect(result.current.setCurrentEvent).toBe(mockSetCurrentEvent);
    });
  });

  describe("useEventStatus", () => {
    it("should return upcoming status for future events", () => {
      const futureEvent: Event = {
        ...mockEvent,
        date: new Date(Date.now() + 86400000), // Tomorrow
      };

      const { result } = renderHook(() => useEventStatus(futureEvent));

      expect(result.current.isEventUpcoming).toBe(true);
      expect(result.current.isEventLive).toBe(false);
      expect(result.current.isEventPast).toBe(false);
    });

    it("should return live status for ongoing events", () => {
      const liveEvent: Event = {
        ...mockEvent,
        date: new Date(Date.now() - 3600000), // Started 1 hour ago
        duration: 120, // 2 hours duration
      };

      const { result } = renderHook(() => useEventStatus(liveEvent));

      expect(result.current.isEventUpcoming).toBe(false);
      expect(result.current.isEventLive).toBe(true);
      expect(result.current.isEventPast).toBe(false);
    });

    it("should return past status for ended events", () => {
      const pastEvent: Event = {
        ...mockEvent,
        date: new Date(Date.now() - 86400000), // Yesterday
        duration: 120,
      };

      const { result } = renderHook(() => useEventStatus(pastEvent));

      expect(result.current.isEventUpcoming).toBe(false);
      expect(result.current.isEventLive).toBe(false);
      expect(result.current.isEventPast).toBe(true);
    });

    it("should handle null event", () => {
      const { result } = renderHook(() => useEventStatus(null));

      expect(result.current.isEventUpcoming).toBe(false);
      expect(result.current.isEventLive).toBe(false);
      expect(result.current.isEventPast).toBe(false);
    });

    it("should handle undefined event", () => {
      const { result } = renderHook(() => useEventStatus(undefined));

      expect(result.current.isEventUpcoming).toBe(false);
      expect(result.current.isEventLive).toBe(false);
      expect(result.current.isEventPast).toBe(false);
    });
  });

  describe("usePagination", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    it("should paginate items correctly", () => {
      const { result } = renderHook(() => usePagination(items, 10));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalPages).toBe(3);
      expect(result.current.paginatedItems).toHaveLength(10);
      expect(result.current.paginatedItems[0].id).toBe("item-0");
    });

    it("should handle page changes", () => {
      const { result } = renderHook(() => usePagination(items, 10));

      act(() => {
        result.current.handlePageChange(2);
      });

      expect(result.current.currentPage).toBe(2);
      expect(result.current.paginatedItems[0].id).toBe("item-10");
    });

    it("should reset page to 1", () => {
      const { result } = renderHook(() => usePagination(items, 10));

      act(() => {
        result.current.handlePageChange(3);
      });
      expect(result.current.currentPage).toBe(3);

      act(() => {
        result.current.resetPage();
      });
      expect(result.current.currentPage).toBe(1);
    });

    it("should handle last page with fewer items", () => {
      const { result } = renderHook(() => usePagination(items, 10));

      act(() => {
        result.current.handlePageChange(3);
      });

      expect(result.current.currentPage).toBe(3);
      expect(result.current.paginatedItems).toHaveLength(5);
    });
  });

  describe("useTicketManagement", () => {
    const mockUser: User = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      purchasedTickets: [],
      isAdmin: false,
    };

    const mockRefreshUserTickets = vi.fn().mockResolvedValue(undefined);

    it("should initialize with no ticket", () => {
      const { result } = renderHook(() =>
        useTicketManagement(mockEvent, mockUser, mockRefreshUserTickets),
      );

      expect(result.current.hasTicket).toBe(false);
      expect(result.current.userTicketId).toBeNull();
      expect(result.current.isPurchasing).toBe(false);
      expect(result.current.isRefunding).toBe(false);
    });

    it("should check ticket status and find active ticket", async () => {
      const userWithTicket: User = {
        ...mockUser,
        purchasedTickets: ["event-1"],
      };

      const mockTickets = [
        {
          id: "ticket-1",
          event_id: "event-1",
          user_id: "user-1",
          status: "active" as const,
          purchased_at: "2026-01-01T00:00:00.000Z",
        },
      ];

      vi.mocked(tickets.getMyTickets).mockResolvedValue(mockTickets);

      const { result } = renderHook(() =>
        useTicketManagement(mockEvent, userWithTicket, mockRefreshUserTickets),
      );

      await waitFor(() => {
        expect(result.current.hasTicket).toBe(true);
      });

      expect(result.current.userTicketId).toBe("ticket-1");
    });

    it("should handle missing ticket in local state but present in DB", async () => {
      const mockTickets = [
        {
          id: "ticket-2",
          event_id: "event-1",
          user_id: "user-1",
          status: "active" as const,
          purchased_at: "2026-01-01T00:00:00.000Z",
        },
      ];

      vi.mocked(tickets.getMyTickets).mockResolvedValue(mockTickets);

      const { result } = renderHook(() =>
        useTicketManagement(mockEvent, mockUser, mockRefreshUserTickets),
      );

      await waitFor(() => {
        expect(mockRefreshUserTickets).toHaveBeenCalled();
      });

      expect(result.current.hasTicket).toBe(true);
    });

    it("should handle error when checking ticket status", async () => {
      const userWithTicket: User = {
        ...mockUser,
        purchasedTickets: ["event-1"],
      };

      vi.mocked(tickets.getMyTickets).mockRejectedValue(
        new Error("Network error"),
      );

      const { result } = renderHook(() =>
        useTicketManagement(mockEvent, userWithTicket, mockRefreshUserTickets),
      );

      await waitFor(() => {
        expect(result.current.hasTicket).toBe(true);
      });

      expect(result.current.userTicketId).toBeNull();
    });

    it("should handle null user", () => {
      const { result } = renderHook(() =>
        useTicketManagement(mockEvent, null, mockRefreshUserTickets),
      );

      expect(result.current.hasTicket).toBe(false);
      expect(result.current.userTicketId).toBeNull();
    });

    it("should handle undefined event", () => {
      const { result } = renderHook(() =>
        useTicketManagement(undefined, mockUser, mockRefreshUserTickets),
      );

      expect(result.current.hasTicket).toBe(false);
      expect(result.current.userTicketId).toBeNull();
    });
  });

  describe("useEventUpdates", () => {
    it("should fetch event updates", async () => {
      const mockUpdates = [
        {
          id: "update-1",
          event_id: "event-1",
          title: "Update Title",
          message: "Update Message",
          created_by: "user-1",
          created_at: "2026-01-10T00:00:00.000Z",
        },
      ];

      vi.mocked(adminOperations.getEventUpdates).mockResolvedValue(mockUpdates);

      const { result } = renderHook(() => useEventUpdates(mockEvent));

      await waitFor(() => {
        expect(result.current.eventUpdates).toHaveLength(1);
      });

      expect(result.current.eventUpdates[0].title).toBe("Update Title");
    });

    it("should handle fetch errors", async () => {
      vi.mocked(adminOperations.getEventUpdates).mockRejectedValue(
        new Error("Fetch failed"),
      );

      const { result } = renderHook(() => useEventUpdates(mockEvent));

      await waitFor(() => {
        expect(result.current.eventUpdates).toHaveLength(0);
      });
    });

    it("should not fetch when event is undefined", () => {
      const { result } = renderHook(() => useEventUpdates(undefined));

      expect(result.current.eventUpdates).toHaveLength(0);
      expect(adminOperations.getEventUpdates).not.toHaveBeenCalled();
    });
  });

  describe("useEventParticipants", () => {
    it("should fetch participants for admin users", async () => {
      const mockParticipants = [
        {
          user_id: "user-2",
          user_email: "participant@example.com",
          user_name: "Participant",
          ticket_id: "ticket-1",
          purchased_at: "2026-01-05T00:00:00.000Z",
          profiles: {
            full_name: "Participant Name",
            email: "participant@example.com",
          },
        },
      ];

      vi.mocked(adminOperations.getEventParticipants).mockResolvedValue(
        mockParticipants,
      );

      const { result } = renderHook(() =>
        useEventParticipants(mockEvent, true),
      );

      expect(result.current.loadingParticipants).toBe(true);

      await waitFor(() => {
        expect(result.current.loadingParticipants).toBe(false);
      });

      expect(result.current.participants).toHaveLength(1);
      expect(result.current.participants[0].user_email).toBe(
        "participant@example.com",
      );
    });

    it("should not fetch participants for non-admin users", () => {
      const { result } = renderHook(() =>
        useEventParticipants(mockEvent, false),
      );

      expect(result.current.participants).toHaveLength(0);
      expect(adminOperations.getEventParticipants).not.toHaveBeenCalled();
    });

    it("should handle fetch errors", async () => {
      vi.mocked(adminOperations.getEventParticipants).mockRejectedValue(
        new Error("Fetch failed"),
      );

      const { result } = renderHook(() =>
        useEventParticipants(mockEvent, true),
      );

      await waitFor(() => {
        expect(result.current.loadingParticipants).toBe(false);
      });

      expect(result.current.participants).toHaveLength(0);
    });

    it("should not fetch when event is undefined", () => {
      const { result } = renderHook(() =>
        useEventParticipants(undefined, true),
      );

      expect(result.current.participants).toHaveLength(0);
      expect(adminOperations.getEventParticipants).not.toHaveBeenCalled();
    });
  });
});
