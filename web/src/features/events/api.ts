import { callEdgeFunction } from "@/lib/edge/client";
import { Event } from "./types";

/**
 * Database event response from Edge Functions
 */
interface DatabaseEvent {
  id: string;
  name: string;
  description: string;
  date: string;
  duration: number;
  price?: number;
  capacity: number;
  attendees?: number;
  image_url: string;
  status?: "upcoming" | "active" | "ended" | "cancelled";
  created_by: string;
  created_at: string;
  updated_at: string;
  event_type?: "virtual" | "in-person";
  venue_name?: string;
  venue_address?: string;
}

/**
 * Fetch all events via Edge Function
 */
export async function fetchEvents(): Promise<Event[]> {
  try {
    const result = await callEdgeFunction<{ events: DatabaseEvent[] }>(
      "events",
      "/",
      {
        method: "GET",
        requireAuth: false,
      },
    );

    console.log("✅ Events fetched via Edge Function:", result.events.length);

    // Map database events to frontend Event type
    return result.events.map((eventData) => ({
      id: eventData.id,
      name: eventData.name,
      description: eventData.description,
      date: new Date(eventData.date),
      duration: eventData.duration,
      price: eventData.price ?? 0,
      capacity: eventData.capacity,
      attendees: eventData.attendees || 0,
      imageUrl: eventData.image_url,
      status: eventData.status || "upcoming",
      createdBy: eventData.created_by,
      createdAt: new Date(eventData.created_at),
      updatedAt: new Date(eventData.updated_at),
      eventType: eventData.event_type || "virtual",
      venueName: eventData.venue_name,
      venueAddress: eventData.venue_address,
    }));
  } catch (error: unknown) {
    // Handle abort errors gracefully
    const err = error as { message?: string; name?: string; code?: number };
    if (
      err.message?.includes("AbortError") ||
      err.message?.includes("aborted") ||
      err.name === "AbortError" ||
      err.code === 20
    ) {
      console.log("⚠️ Events fetch aborted (component unmounted)");
      return [];
    }
    console.error("Error fetching events:", error);
    throw error;
  }
}

/**
 * Fetch a single event by ID via Edge Function
 */
export async function fetchEvent(eventId: string): Promise<Event | null> {
  try {
    const result = await callEdgeFunction<{ event: DatabaseEvent }>(
      "events",
      `/${eventId}`,
      {
        method: "GET",
        requireAuth: false,
      },
    );

    const eventData = result.event;
    console.log("✅ Event fetched via Edge Function:", eventData.name);
    return {
      id: eventData.id,
      name: eventData.name,
      description: eventData.description,
      date: new Date(eventData.date),
      duration: eventData.duration,
      price: eventData.price ?? 0,
      capacity: eventData.capacity,
      attendees: eventData.attendees || 0,
      imageUrl: eventData.image_url,
      status: eventData.status || "upcoming",
      createdBy: eventData.created_by,
      createdAt: new Date(eventData.created_at),
      updatedAt: new Date(eventData.updated_at),
      eventType: eventData.event_type || "virtual",
      venueName: eventData.venue_name,
      venueAddress: eventData.venue_address,
    };
  } catch (error: unknown) {
    // Ignore AbortError
    const err = error as { message?: string; name?: string; code?: number };
    if (
      err.message?.includes("AbortError") ||
      err.message?.includes("aborted") ||
      err.name === "AbortError" ||
      err.code === 20
    ) {
      console.log("⚠️ Event fetch aborted");
      return null;
    }
    // Event not found
    if (err.message?.includes("404") || err.message?.includes("not found")) {
      return null;
    }
    console.error("Error fetching event:", error);
    throw error;
  }
}

/**
 * Create a new event (admin only)
 */
export async function createEvent(
  event: Omit<Event, "id" | "attendees">,
): Promise<Event> {
  try {
    console.log("📝 Creating event via Edge Function...");

    const result = await callEdgeFunction<{ event: DatabaseEvent }>(
      "admin-operations",
      "/events",
      {
        method: "POST",
        body: {
          name: event.name,
          description: event.description,
          date: event.date.toISOString(),
          duration: event.duration,
          price: event.price,
          capacity: event.capacity,
          imageUrl: event.imageUrl,
          event_type: event.eventType,
          venue_name: event.venueName,
          venue_address: event.venueAddress,
        },
      },
    );

    const data = result.event;
    console.log("✅ Event created successfully:", data);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      date: new Date(data.date),
      duration: data.duration,
      price: data.price ?? data.price ?? 0,
      capacity: data.capacity,
      attendees: data.attendees || 0,
      imageUrl: data.image_url,
      status: data.status || "upcoming",
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      eventType: data.event_type || "virtual",
      venueName: data.venue_name,
      venueAddress: data.venue_address,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; name?: string };
    if (
      err.message?.includes("AbortError") ||
      err.message?.includes("aborted") ||
      err.name === "AbortError"
    ) {
      console.log("⚠️ Create event aborted");
      throw new Error("Request aborted");
    }
    console.error("❌ Exception in createEvent:", error);
    throw error;
  }
}

/**
 * Cancel an event (soft delete - admin only)
 */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    console.log("🚫 Cancelling event:", eventId);

    await callEdgeFunction("admin-operations", `/events/${eventId}/cancel`, {
      method: "DELETE",
    });

    console.log("✅ Event cancelled successfully");
  } catch (error: unknown) {
    const err = error as { message?: string; name?: string };
    if (
      err.message?.includes("AbortError") ||
      err.message?.includes("aborted") ||
      err.name === "AbortError"
    ) {
      console.log("⚠️ Delete event aborted");
      throw new Error("Request aborted");
    }
    throw error;
  }
}

/**
 * Update an event (admin only)
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<{
    name: string;
    description: string;
    date: Date;
    duration: number;
    price: number;
    capacity: number;
    imageUrl: string;
    event_type: "virtual" | "in-person";
    venue_name: string;
    venue_address: string;
  }>,
): Promise<Event> {
  try {
    console.log("✏️ Updating event via Edge Function...");

    const body: Record<string, unknown> = {};

    if (updates.name !== undefined) body.name = updates.name;
    if (updates.description !== undefined)
      body.description = updates.description;
    if (updates.date !== undefined) body.date = updates.date.toISOString();
    if (updates.duration !== undefined) body.duration = updates.duration;
    if (updates.price !== undefined) body.price = updates.price;
    if (updates.capacity !== undefined) body.capacity = updates.capacity;
    if (updates.imageUrl !== undefined) body.imageUrl = updates.imageUrl;
    if (updates.event_type !== undefined) body.event_type = updates.event_type;
    if (updates.venue_name !== undefined) body.venue_name = updates.venue_name;
    if (updates.venue_address !== undefined)
      body.venue_address = updates.venue_address;

    const result = await callEdgeFunction<{ event: DatabaseEvent }>(
      "admin-operations",
      `/events/${eventId}`,
      {
        method: "PUT",
        body,
      },
    );

    const data = result.event;
    console.log("✅ Event updated successfully:", data);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      date: new Date(data.date),
      duration: data.duration,
      price: data.price ?? data.price ?? 0,
      capacity: data.capacity,
      attendees: data.attendees || 0,
      imageUrl: data.image_url,
      status: data.status || "upcoming",
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      eventType: data.event_type || "virtual",
      venueName: data.venue_name,
      venueAddress: data.venue_address,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; name?: string };
    if (
      err.message?.includes("AbortError") ||
      err.message?.includes("aborted") ||
      err.name === "AbortError"
    ) {
      console.log("⚠️ Update event aborted");
      throw new Error("Request aborted");
    }
    console.error("❌ Exception in updateEvent:", error);
    throw error;
  }
}
