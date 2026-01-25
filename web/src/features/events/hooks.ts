import { useApp } from "@/app/hooks";
import { Event } from "./types";
import { useState, useEffect } from "react";
import { tickets, adminOperations } from "@/lib/edge/client";
import { purchaseTicketWithStripe } from "@/lib/stripe/client";
import { User } from "@/features/profile/types";
import { toast } from "sonner";

export function useEvents() {
  const { events, refreshEvents } = useApp();
  return { events, refreshEvents, loading: false };
}

export function useEvent(eventId: string) {
  const { events } = useApp();
  const event = events.find((e) => e.id === eventId) || null;
  return { event, loading: false };
}

export function useCreateEvent() {
  const { addEvent } = useApp();
  return {
    createEvent: addEvent,
    loading: false,
  };
}

export function useDeleteEvent() {
  const { removeEvent } = useApp();
  return {
    deleteEvent: removeEvent,
    loading: false,
  };
}

export function useCurrentEvent() {
  const { currentEvent, setCurrentEvent } = useApp();
  return { currentEvent, setCurrentEvent };
}

// Event status helpers
export function useEventStatus(event: Event | null | undefined) {
  const isEventLive = () => {
    if (!event) return false;
    const now = new Date();
    const eventStart = new Date(event.date);
    const eventEnd = new Date(eventStart.getTime() + event.duration * 60000);
    return now >= eventStart && now <= eventEnd;
  };

  const isEventPast = () => {
    if (!event) return false;
    const now = new Date();
    const eventEnd = new Date(
      new Date(event.date).getTime() + event.duration * 60000,
    );
    return now > eventEnd;
  };

  const isEventUpcoming = () => {
    if (!event) return false;
    const now = new Date();
    const eventStart = new Date(event.date);
    return now < eventStart;
  };

  return {
    isEventLive: isEventLive(),
    isEventPast: isEventPast(),
    isEventUpcoming: isEventUpcoming(),
  };
}

// Pagination hook
export function usePagination<T>(items: T[], itemsPerPage: number) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages,
    paginatedItems,
    handlePageChange,
    resetPage,
  };
}

// Ticket management hook
export function useTicketManagement(
  currentEvent: Event | undefined,
  user: User | null,
  refreshUserTickets: () => Promise<void>,
) {
  const [hasTicket, setHasTicket] = useState(false);
  const [userTicketId, setUserTicketId] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  // Check ticket status on mount and when event/user changes
  useEffect(() => {
    async function checkTicketStatus() {
      if (!currentEvent || !user) {
        setHasTicket(false);
        setUserTicketId(null);
        return;
      }

      try {
        // Check both local state and database
        const localHasTicket = user.purchasedTickets.includes(currentEvent.id);

        // Use Edge Function to get all tickets and check if we have one for this event
        const myTickets = await tickets.getMyTickets();
        const userTicket = myTickets.find(
          (ticket) =>
            ticket.event_id === currentEvent.id && ticket.status === "active",
        );
        const dbHasTicket = !!userTicket;

        // Store the ticket ID for refund purposes
        setUserTicketId(userTicket?.id || null);

        // If database says we have a ticket but local state doesn't, refresh tickets
        if (dbHasTicket && !localHasTicket) {
          console.log(
            "🔄 Ticket found in DB but not in local state, refreshing...",
          );
          await refreshUserTickets();
        }

        setHasTicket(dbHasTicket);
      } catch (error) {
        console.error("Error checking ticket status:", error);
        // Fallback to local state
        setHasTicket(user.purchasedTickets.includes(currentEvent.id));
        setUserTicketId(null);
      }
    }

    checkTicketStatus();
  }, [currentEvent, user, refreshUserTickets]);

  return {
    hasTicket,
    userTicketId,
    isPurchasing,
    isRefunding,
    setHasTicket,
    setUserTicketId,
    setIsPurchasing,
    setIsRefunding,
  };
}

// Event updates hook
export interface EventUpdate {
  id: string;
  event_id: string;
  title: string;
  message: string;
  created_by: string;
  created_at: string;
  creator_name?: string;
  creator_email?: string;
}

export function useEventUpdates(currentEvent: Event | undefined) {
  const [eventUpdates, setEventUpdates] = useState<EventUpdate[]>([]);

  // Fetch event updates
  useEffect(() => {
    const fetchEventUpdates = async () => {
      if (!currentEvent) return;

      try {
        console.log("📢 Fetching event updates via Edge Function...");

        // Use Edge Function instead of direct fetch with service role keys
        const updates = await adminOperations.getEventUpdates(currentEvent.id);

        setEventUpdates(updates as EventUpdate[]);
        console.log("✅ Loaded", updates.length, "event updates");
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching event updates:", errorMessage);
      }
    };

    fetchEventUpdates();
  }, [currentEvent]);

  return { eventUpdates, setEventUpdates };
}

// Event participants hook
export interface EventParticipant {
  user_id: string;
  user_email: string;
  user_name: string;
  ticket_id: string;
  purchased_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  payment_amount?: number;
}

export function useEventParticipants(
  currentEvent: Event | undefined,
  isAdmin: boolean | undefined,
) {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Fetch event participants (admin only)
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!currentEvent || !isAdmin) return;

      setLoadingParticipants(true);
      try {
        console.log("👥 Fetching event participants...");
        const data = await adminOperations.getEventParticipants(
          currentEvent.id,
        );
        setParticipants(data);
        console.log("✅ Loaded", data.length, "participants");
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching participants:", errorMessage);
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [currentEvent, isAdmin]);

  return { participants, loadingParticipants };
}

// Stripe return hook
export function useStripeReturn(
  currentEvent: Event | undefined,
  refreshUserTickets: () => Promise<void>,
  refreshEvents: () => Promise<void>,
  setHasTicket: (hasTicket: boolean) => void,
) {
  // Handle Stripe redirect back
  useEffect(() => {
    const handleStripeReturn = async () => {
      if (!currentEvent) return;

      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get("payment");
      const sessionId = params.get("session_id");

      if (paymentStatus === "success" && sessionId) {
        console.log("✅ Payment successful, creating ticket...");

        try {
          // Call the purchase endpoint which will verify payment with Stripe
          await purchaseTicketWithStripe(
            currentEvent.id,
            Math.round(currentEvent.price * 100),
            sessionId,
          );

          toast.success("Ticket purchased successfully!");

          await Promise.all([refreshUserTickets(), refreshEvents()]);

          setHasTicket(true);

          window.history.replaceState({}, "", `/events/${currentEvent.id}`);
        } catch (error) {
          console.error("Error creating ticket:", error);
          toast.error(
            "Payment succeeded but ticket creation failed. Please contact support.",
          );
        }
      } else if (paymentStatus === "cancelled") {
        toast.error("Payment cancelled");
        if (currentEvent) {
          window.history.replaceState({}, "", `/events/${currentEvent.id}`);
        }
      }
    };

    handleStripeReturn();
  }, [currentEvent, refreshUserTickets, refreshEvents, setHasTicket]);
}
