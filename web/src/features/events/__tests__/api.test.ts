import { describe, it, expect, vi, beforeEach } from "vitest";
import * as api from "../api";
import { callEdgeFunction } from "@/lib/edge/client";

// Mock the edge client
vi.mock("@/lib/edge/client", () => ({
  callEdgeFunction: vi.fn(),
}));

describe("Events API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchEvents", () => {
    it("should fetch and transform events correctly", async () => {
      const mockDatabaseEvents = [
        {
          id: "event-1",
          name: "Test Event",
          description: "Test Description",
          date: "2026-02-15T18:00:00.000Z",
          duration: 120,
          price: 50,
          capacity: 100,
          attendees: 25,
          image_url: "https://example.com/image.jpg",
          status: "upcoming" as const,
          created_by: "user-1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          event_type: "virtual" as const,
        },
      ];

      const mockResponse = { events: mockDatabaseEvents };
      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.fetchEvents();

      expect(callEdgeFunction).toHaveBeenCalledWith("events", "/", {
        method: "GET",
        requireAuth: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
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
        createdBy: "user-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        eventType: "virtual",
        venueName: undefined,
        venueAddress: undefined,
      });
    });

    it("should handle in-person events with venue details", async () => {
      const mockDatabaseEvents = [
        {
          id: "event-2",
          name: "In-Person Event",
          description: "Test Description",
          date: "2026-03-20T18:00:00.000Z",
          duration: 180,
          price: 75,
          capacity: 50,
          attendees: 10,
          image_url: "https://example.com/image2.jpg",
          status: "upcoming" as const,
          created_by: "user-1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          event_type: "in-person" as const,
          venue_name: "Convention Center",
          venue_address: "123 Main St, City, State 12345",
        },
      ];

      const mockResponse = { events: mockDatabaseEvents };
      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.fetchEvents();

      expect(result[0].eventType).toBe("in-person");
      expect(result[0].venueName).toBe("Convention Center");
      expect(result[0].venueAddress).toBe("123 Main St, City, State 12345");
    });

    it("should handle events with default values", async () => {
      const mockDatabaseEvents = [
        {
          id: "event-3",
          name: "Minimal Event",
          description: "Test",
          date: "2026-04-01T18:00:00.000Z",
          duration: 60,
          capacity: 20,
          image_url: "https://example.com/image3.jpg",
          created_by: "user-1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ];

      const mockResponse = { events: mockDatabaseEvents };
      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.fetchEvents();

      expect(result[0].price).toBe(0);
      expect(result[0].attendees).toBe(0);
      expect(result[0].status).toBe("upcoming");
      expect(result[0].eventType).toBe("virtual");
    });

    it("should handle AbortError gracefully", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      const result = await api.fetchEvents();

      expect(result).toEqual([]);
    });

    it("should throw non-abort errors", async () => {
      const error = new Error("Network error");
      vi.mocked(callEdgeFunction).mockRejectedValue(error);

      await expect(api.fetchEvents()).rejects.toThrow("Network error");
    });
  });

  describe("fetchEvent", () => {
    it("should fetch and transform a single event", async () => {
      const mockDatabaseEvent = {
        id: "event-1",
        name: "Single Event",
        description: "Test Description",
        date: "2026-02-15T18:00:00.000Z",
        duration: 120,
        price: 50,
        capacity: 100,
        attendees: 25,
        image_url: "https://example.com/image.jpg",
        status: "upcoming" as const,
        created_by: "user-1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        event_type: "virtual" as const,
      };

      const mockResponse = { event: mockDatabaseEvent };
      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.fetchEvent("event-1");

      expect(callEdgeFunction).toHaveBeenCalledWith("events", "/event-1", {
        method: "GET",
        requireAuth: false,
      });
      expect(result).toEqual({
        id: "event-1",
        name: "Single Event",
        description: "Test Description",
        date: new Date("2026-02-15T18:00:00.000Z"),
        duration: 120,
        price: 50,
        capacity: 100,
        attendees: 25,
        imageUrl: "https://example.com/image.jpg",
        status: "upcoming",
        createdBy: "user-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        eventType: "virtual",
        venueName: undefined,
        venueAddress: undefined,
      });
    });

    it("should return null for 404 errors", async () => {
      const error = new Error("Event not found");
      vi.mocked(callEdgeFunction).mockRejectedValue(error);

      const result = await api.fetchEvent("nonexistent-event");

      expect(result).toBeNull();
    });

    it("should return null for AbortError", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      const result = await api.fetchEvent("event-1");

      expect(result).toBeNull();
    });

    it("should throw non-abort/non-404 errors", async () => {
      const error = new Error("Server error");
      vi.mocked(callEdgeFunction).mockRejectedValue(error);

      await expect(api.fetchEvent("event-1")).rejects.toThrow("Server error");
    });
  });

  describe("createEvent", () => {
    it("should create a virtual event", async () => {
      const newEvent = {
        name: "New Virtual Event",
        description: "Description",
        date: new Date("2026-05-01T18:00:00.000Z"),
        duration: 90,
        price: 30,
        capacity: 75,
        imageUrl: "https://example.com/image.jpg",
        status: "upcoming" as const,
        eventType: "virtual" as const,
        createdBy: "user-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      };

      const mockDatabaseEvent = {
        id: "new-event-id",
        name: newEvent.name,
        description: newEvent.description,
        date: newEvent.date.toISOString(),
        duration: newEvent.duration,
        price: newEvent.price,
        capacity: newEvent.capacity,
        attendees: 0,
        image_url: newEvent.imageUrl,
        status: "upcoming" as const,
        created_by: "user-1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        event_type: "virtual" as const,
      };

      const mockResponse = { event: mockDatabaseEvent };
      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.createEvent(newEvent);

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/events",
        {
          method: "POST",
          body: {
            name: newEvent.name,
            description: newEvent.description,
            date: newEvent.date.toISOString(),
            duration: newEvent.duration,
            price: newEvent.price,
            capacity: newEvent.capacity,
            imageUrl: newEvent.imageUrl,
            event_type: "virtual",
            venue_name: undefined,
            venue_address: undefined,
          },
        },
      );
      expect(result.id).toBe("new-event-id");
      expect(result.name).toBe(newEvent.name);
    });

    it("should create an in-person event with venue details", async () => {
      const newEvent = {
        name: "New In-Person Event",
        description: "Description",
        date: new Date("2026-05-01T18:00:00.000Z"),
        duration: 90,
        price: 30,
        capacity: 75,
        imageUrl: "https://example.com/image.jpg",
        status: "upcoming" as const,
        eventType: "in-person" as const,
        venueName: "Test Venue",
        venueAddress: "456 Test St",
        createdBy: "user-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      };

      const mockDatabaseEvent = {
        id: "new-event-id",
        name: newEvent.name,
        description: newEvent.description,
        date: newEvent.date.toISOString(),
        duration: newEvent.duration,
        price: newEvent.price,
        capacity: newEvent.capacity,
        attendees: 0,
        image_url: newEvent.imageUrl,
        status: "upcoming" as const,
        created_by: "user-1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        event_type: "in-person" as const,
        venue_name: "Test Venue",
        venue_address: "456 Test St",
      };

      const mockResponse = { event: mockDatabaseEvent };
      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.createEvent(newEvent);

      expect(result.eventType).toBe("in-person");
      expect(result.venueName).toBe("Test Venue");
      expect(result.venueAddress).toBe("456 Test St");
    });

    it("should handle AbortError", async () => {
      const newEvent = {
        name: "Event",
        description: "Description",
        date: new Date("2026-05-01T18:00:00.000Z"),
        duration: 90,
        price: 30,
        capacity: 75,
        imageUrl: "https://example.com/image.jpg",
        status: "upcoming" as const,
        eventType: "virtual" as const,
        createdBy: "user-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      };

      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      await expect(api.createEvent(newEvent)).rejects.toThrow(
        "Request aborted",
      );
    });

    it("should throw other errors", async () => {
      const newEvent = {
        name: "Event",
        description: "Description",
        date: new Date("2026-05-01T18:00:00.000Z"),
        duration: 90,
        price: 30,
        capacity: 75,
        imageUrl: "https://example.com/image.jpg",
        status: "upcoming" as const,
        eventType: "virtual" as const,
        createdBy: "user-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      };

      const error = new Error("Creation failed");
      vi.mocked(callEdgeFunction).mockRejectedValue(error);

      await expect(api.createEvent(newEvent)).rejects.toThrow(
        "Creation failed",
      );
    });
  });

  describe("deleteEvent", () => {
    it("should delete an event", async () => {
      vi.mocked(callEdgeFunction).mockResolvedValue(undefined);

      await api.deleteEvent("event-1");

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/events/event-1/cancel",
        {
          method: "DELETE",
        },
      );
    });

    it("should handle AbortError", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      await expect(api.deleteEvent("event-1")).rejects.toThrow(
        "Request aborted",
      );
    });

    it("should throw other errors", async () => {
      const error = new Error("Delete failed");
      vi.mocked(callEdgeFunction).mockRejectedValue(error);

      await expect(api.deleteEvent("event-1")).rejects.toThrow("Delete failed");
    });
  });

  describe("updateEvent", () => {
    it("should update event with all fields", async () => {
      const updates = {
        name: "Updated Event",
        description: "Updated Description",
        date: new Date("2026-06-01T18:00:00.000Z"),
        duration: 150,
        price: 60,
        capacity: 120,
        imageUrl: "https://example.com/new-image.jpg",
        event_type: "in-person" as const,
        venue_name: "New Venue",
        venue_address: "789 New St",
      };

      const mockDatabaseEvent = {
        id: "event-1",
        name: updates.name,
        description: updates.description,
        date: updates.date.toISOString(),
        duration: updates.duration,
        price: updates.price,
        capacity: updates.capacity,
        attendees: 30,
        image_url: updates.imageUrl,
        status: "upcoming" as const,
        created_by: "user-1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-15T00:00:00.000Z",
        event_type: updates.event_type,
        venue_name: updates.venue_name,
        venue_address: updates.venue_address,
      };

      const mockResponse = { event: mockDatabaseEvent };
      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.updateEvent("event-1", updates);

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/events/event-1",
        {
          method: "PUT",
          body: {
            name: updates.name,
            description: updates.description,
            date: updates.date.toISOString(),
            duration: updates.duration,
            price: updates.price,
            capacity: updates.capacity,
            imageUrl: updates.imageUrl,
            event_type: updates.event_type,
            venue_name: updates.venue_name,
            venue_address: updates.venue_address,
          },
        },
      );
      expect(result.name).toBe(updates.name);
      expect(result.eventType).toBe("in-person");
      expect(result.venueName).toBe(updates.venue_name);
    });

    it("should update event with partial fields", async () => {
      const updates = {
        name: "Partially Updated Event",
        price: 40,
      };

      const mockDatabaseEvent = {
        id: "event-1",
        name: updates.name,
        description: "Original Description",
        date: "2026-02-15T18:00:00.000Z",
        duration: 120,
        price: updates.price,
        capacity: 100,
        attendees: 25,
        image_url: "https://example.com/image.jpg",
        status: "upcoming" as const,
        created_by: "user-1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-15T00:00:00.000Z",
        event_type: "virtual" as const,
      };

      const mockResponse = { event: mockDatabaseEvent };
      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.updateEvent("event-1", updates);

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "admin-operations",
        "/events/event-1",
        {
          method: "PUT",
          body: {
            name: updates.name,
            price: updates.price,
          },
        },
      );
      expect(result.name).toBe(updates.name);
      expect(result.price).toBe(updates.price);
    });

    it("should handle AbortError", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      vi.mocked(callEdgeFunction).mockRejectedValue(abortError);

      await expect(
        api.updateEvent("event-1", { name: "Updated" }),
      ).rejects.toThrow("Request aborted");
    });

    it("should throw other errors", async () => {
      const error = new Error("Update failed");
      vi.mocked(callEdgeFunction).mockRejectedValue(error);

      await expect(
        api.updateEvent("event-1", { name: "Updated" }),
      ).rejects.toThrow("Update failed");
    });
  });
});
