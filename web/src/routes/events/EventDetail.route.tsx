import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { adminOperations, tickets } from "@/lib/edge/client";
import { purchaseTicketDemo } from "@/lib/stripe/client";
import { useApp } from "@/app/hooks";
import { Button } from "@/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  DollarSign,
  CreditCard,
  Trash2,
  Megaphone,
  Send,
  Edit,
} from "lucide-react";
import { Badge } from "@/ui/badge";
import { toast } from "sonner";
import { EditEventDialog } from "./components/EditEventDialog";

interface EventUpdate {
  id: string;
  event_id: string;
  title: string;
  message: string;
  created_by: string;
  created_at: string;
  creator_name?: string;
  creator_email?: string;
}

export function EventDetailRoute() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { events, user, refreshUserTickets, refreshEvents, removeEvent } =
    useApp();
  const currentEvent = events.find((e) => e.id === eventId);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [eventUpdates, setEventUpdates] = useState<EventUpdate[]>([]);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);

  // Edit event state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Helper functions for event status
  const isEventLive = (event: typeof currentEvent) => {
    if (!event) return false;
    const now = new Date();
    const eventStart = new Date(event.date);
    const eventEnd = new Date(eventStart.getTime() + event.duration * 60000);
    return now >= eventStart && now <= eventEnd;
  };

  const isEventPast = (event: typeof currentEvent) => {
    if (!event) return false;
    const now = new Date();
    const eventEnd = new Date(
      new Date(event.date).getTime() + event.duration * 60000,
    );
    return now > eventEnd;
  };

  const isEventUpcoming = (event: typeof currentEvent) => {
    if (!event) return false;
    const now = new Date();
    const eventStart = new Date(event.date);
    return now < eventStart;
  };

  // Check ticket status on mount and when event/user changes
  useEffect(() => {
    async function checkTicketStatus() {
      if (!currentEvent || !user) {
        setHasTicket(false);
        return;
      }

      try {
        // Check both local state and database
        const localHasTicket = user.purchasedTickets.includes(currentEvent.id);

        // Use Edge Function to get all tickets and check if we have one for this event
        const myTickets = await tickets.getMyTickets();
        const dbHasTicket = myTickets.some(
          (ticket) => ticket.event_id === currentEvent.id,
        );

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
      }
    }

    checkTicketStatus();
  }, [currentEvent, user, refreshUserTickets]);

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

  // Early return AFTER all hooks
  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Event not found</p>
            <Button onClick={() => navigate("/events")} className="mt-4">
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePurchase = async () => {
    if (!user || !currentEvent) return;

    // Double-check ticket status before purchase
    if (hasTicket) {
      toast.error("You already have a ticket for this event");
      return;
    }

    setIsPurchasing(true);

    try {
      console.log("🎫 Starting ticket purchase...");

      // Demo purchase (in production, this would integrate with real Stripe)
      await purchaseTicketDemo(currentEvent.id, currentEvent.price);

      console.log("✅ Ticket created, refreshing data...");

      // Refresh user tickets and events to get updated attendee count
      await Promise.all([
        refreshUserTickets().catch((err) => {
          console.error("❌ Error refreshing tickets:", err);
          // Don't throw - allow the process to continue
        }),
        refreshEvents().catch((err) => {
          console.error("❌ Error refreshing events:", err);
          // Don't throw - allow the process to continue
        }),
      ]);

      console.log("✅ Data refreshed successfully");

      // Update local hasTicket state
      setHasTicket(true);

      toast.success("Ticket purchased successfully!");

      // Check if event has started before allowing redirect
      const eventDate = new Date(currentEvent.date);
      const now = new Date();
      const eventHasStarted = now >= eventDate;

      if (eventHasStarted) {
        // Event has started - allow joining immediately
        setTimeout(() => {
          navigate(`/room/${currentEvent.id}`);
        }, 500);
      } else {
        // Event hasn't started - just show success message
        toast.info(
          "Event starts " +
            format(eventDate, "PPpp") +
            ". You can join from the events page when it begins.",
        );
      }
    } catch (error: unknown) {
      // Ignore AbortError (happens when component unmounts during request)
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted (component unmounted)");
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to purchase ticket. Please try again.";
      console.error("Purchase error:", error);
      toast.error(errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleJoinEvent = () => {
    navigate(`/room/${currentEvent.id}`);
  };

  const handleDeleteEvent = async () => {
    if (!currentEvent) return;

    setIsCancelling(true);

    try {
      console.log("🗑️ Starting event deletion...");

      // Demo deletion (in production, this would integrate with real backend)
      await removeEvent(currentEvent.id);

      console.log("✅ Event deleted, refreshing data...");

      // Refresh events to get updated list
      await refreshEvents().catch((err) => {
        console.error("❌ Error refreshing events:", err);
        // Don't throw - allow the process to continue
      });

      console.log("✅ Data refreshed successfully");

      toast.success("Event deleted successfully!");

      // Use a shorter delay and navigate immediately
      setTimeout(() => {
        navigate("/events");
      }, 500);
    } catch (error: unknown) {
      // Ignore AbortError (happens when component unmounts during request)
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted (component unmounted)");
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete event. Please try again.";
      console.error("Deletion error:", error);
      toast.error(errorMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  const spotsLeft = currentEvent.capacity - currentEvent.attendees;

  const handlePostUpdate = async () => {
    if (!user?.isAdmin || !currentEvent) return;

    if (!updateTitle.trim()) {
      toast.error("Please enter an update title");
      return;
    }

    if (!updateMessage.trim()) {
      toast.error("Please enter an update message");
      return;
    }

    setIsPostingUpdate(true);

    try {
      console.log("📢 Posting event update via Edge Function...");

      // Use Edge Function instead of direct fetch with service role keys
      await adminOperations.postEventUpdate(
        currentEvent.id,
        updateTitle.trim(),
        updateMessage.trim(),
      );

      console.log("✅ Update posted successfully");

      // Refresh updates list
      const updates = await adminOperations.getEventUpdates(currentEvent.id);
      setEventUpdates(updates as EventUpdate[]);

      toast.success("Update posted successfully!");

      // Clear form
      setUpdateTitle("");
      setUpdateMessage("");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to post update";
      console.error("Error posting update:", error);
      toast.error(errorMessage);
    } finally {
      setIsPostingUpdate(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/events")}
          className="mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Events
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {currentEvent.imageUrl && (
              <div className="h-96 overflow-hidden rounded-lg">
                <img
                  src={currentEvent.imageUrl}
                  alt={currentEvent.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">
                      {currentEvent.name}
                    </CardTitle>
                    <CardDescription className="text-lg">
                      {currentEvent.description}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {currentEvent.status === "cancelled" && (
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-sm px-3 py-1"
                      >
                        Event Cancelled
                      </Badge>
                    )}
                    {isEventPast(currentEvent) &&
                      currentEvent.status !== "cancelled" && (
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 text-sm px-3 py-1"
                        >
                          Past Event
                        </Badge>
                      )}
                    {isEventLive(currentEvent) &&
                      currentEvent.status !== "cancelled" && (
                        <Badge
                          variant="destructive"
                          className="animate-pulse text-sm px-3 py-1"
                        >
                          LIVE NOW
                        </Badge>
                      )}
                    {hasTicket && (
                      <Badge variant="default" className="text-sm px-3 py-1">
                        Ticket Owned
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Event Details</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-5 text-gray-500" />
                      <span>{format(new Date(currentEvent.date), "PPPP")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="size-5 text-gray-500" />
                      <span>
                        {format(new Date(currentEvent.date), "p")} - Duration:{" "}
                        {currentEvent.duration} minutes
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="size-5 text-gray-500" />
                      <span>
                        {currentEvent.attendees} / {currentEvent.capacity}{" "}
                        attendees
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">What to Expect</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Video-only communication (no audio)</li>
                    <li>Random pairing with other attendees</li>
                    <li>Ability to "next" and meet new people</li>
                    <li>Safe, moderated environment</li>
                    <li>
                      Chat duration: {currentEvent.duration} minutes total
                    </li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Guidelines</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Be respectful and kind to all participants</li>
                    <li>No recording or screenshots</li>
                    <li>Keep conversations appropriate</li>
                    <li>Report any issues to moderators</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="size-5" />${currentEvent.price}
                </CardTitle>
                <CardDescription>
                  {spotsLeft > 0 ? (
                    <span className="text-green-600">
                      {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                    </span>
                  ) : (
                    <span className="text-red-600">Event Full</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!user ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Please sign in to purchase a ticket
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => navigate("/auth")}
                    >
                      Sign In
                    </Button>
                  </>
                ) : hasTicket ? (
                  <>
                    {currentEvent.status === "cancelled" ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 font-medium">
                          ⚠️ This event has been cancelled
                        </p>
                      </div>
                    ) : isEventPast(currentEvent) ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-800 font-medium">
                          📅 This event has ended
                        </p>
                      </div>
                    ) : isEventUpcoming(currentEvent) ? (
                      <>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800 font-medium mb-1">
                            ✓ You have a ticket for this event
                          </p>
                          <p className="text-xs text-green-700">
                            Event starts at{" "}
                            {format(new Date(currentEvent.date), "p")}
                          </p>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium text-center">
                            🕐 Event hasn't started yet
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800 font-medium">
                            ✓ You have a ticket for this event
                          </p>
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleJoinEvent}
                          disabled={isEventPast(currentEvent)}
                        >
                          {isEventLive(currentEvent)
                            ? "Join Now"
                            : "Join Event"}
                        </Button>
                      </>
                    )}
                    {user?.isAdmin && (
                      <Button
                        className="w-full mt-2"
                        variant="destructive"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to cancel "${currentEvent.name}"? This will mark the event as cancelled.`,
                            )
                          ) {
                            handleDeleteEvent();
                          }
                        }}
                        disabled={
                          isCancelling || currentEvent.status === "cancelled"
                        }
                      >
                        <Trash2 className="size-4 mr-2" />
                        {isCancelling
                          ? "Cancelling Event..."
                          : currentEvent.status === "cancelled"
                            ? "Event Cancelled"
                            : "Cancel Event (Admin)"}
                      </Button>
                    )}
                    {user?.isAdmin && (
                      <Button
                        className="w-full mt-2"
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(true)}
                      >
                        <Edit className="size-4 mr-2" />
                        Edit Event
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {currentEvent.status === "cancelled" ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 font-medium text-center">
                          ⚠️ This event has been cancelled
                        </p>
                      </div>
                    ) : isEventPast(currentEvent) ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-800 font-medium text-center">
                          📅 This event has ended
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Ticket Price</span>
                            <span className="font-semibold">
                              ${currentEvent.price}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Service Fee</span>
                            <span className="font-semibold">$0</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-semibold">
                            <span>Total</span>
                            <span>${currentEvent.price}</span>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={handlePurchase}
                          disabled={
                            spotsLeft === 0 ||
                            isPurchasing ||
                            isEventPast(currentEvent)
                          }
                        >
                          <CreditCard className="size-4 mr-2" />
                          {isPurchasing ? "Purchasing..." : "Purchase Ticket"}
                        </Button>
                        <p className="text-xs text-gray-500 text-center">
                          Secure payment powered by Stripe
                        </p>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Event Updates */}
            {eventUpdates.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="size-5" />
                    Event Updates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {eventUpdates.map((update) => (
                    <div
                      key={update.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium">{update.title}</p>
                        <Badge variant="secondary" className="text-xs">
                          {update.creator_name || "Admin"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {format(new Date(update.created_at), "PPP p")}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {update.message}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Admin Update Form */}
            {user?.isAdmin && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="size-5" />
                    Post Event Update
                  </CardTitle>
                  <CardDescription>
                    Send an update to all ticket holders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Update Title
                    </label>
                    <Input
                      placeholder="e.g., Venue Change, Schedule Update"
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Message
                    </label>
                    <Textarea
                      placeholder="Your update message..."
                      value={updateMessage}
                      onChange={(e) => setUpdateMessage(e.target.value)}
                      rows={5}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handlePostUpdate}
                    disabled={
                      isPostingUpdate ||
                      !updateTitle.trim() ||
                      !updateMessage.trim()
                    }
                  >
                    <Send className="size-4 mr-2" />
                    {isPostingUpdate ? "Posting..." : "Post Update"}
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    This will notify all {currentEvent.attendees} ticket holder
                    {currentEvent.attendees !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Event Dialog */}
      <EditEventDialog
        event={{
          id: currentEvent.id,
          name: currentEvent.name,
          description: currentEvent.description,
          date: currentEvent.date,
          duration: currentEvent.duration,
          price: currentEvent.price,
          capacity: currentEvent.capacity,
          imageUrl: currentEvent.imageUrl,
        }}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onEventUpdated={refreshEvents}
      />
    </div>
  );
}
