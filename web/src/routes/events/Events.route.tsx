import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  Trash2,
  Filter,
  Edit,
  Video,
  MapPin,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog";
import { useApp } from "@/app/hooks";
import { Event } from "@/features/events/types";
import { format } from "date-fns";
import { toast } from "sonner";
import { EditEventDialog } from "./components/EditEventDialog";
import { Pagination } from "@/components/common/Pagination";
import { usePagination } from "@/features/events/hooks";

export function EventsRoute() {
  const navigate = useNavigate();
  const { events, user, setCurrentEvent, removeEvent, refreshEvents } =
    useApp();
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [eventToCancel, setEventToCancel] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "past" | "live" | "cancelled"
  >("upcoming");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  console.log("📋 [EVENTS ROUTE] Rendering with events:", events.length);
  console.log("📋 [EVENTS ROUTE] Events:", events);

  const handleEventClick = (event: Event) => {
    setCurrentEvent(event);
    navigate(`/events/${event.id}`);
  };

  const handleJoinEvent = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentEvent(event);
    navigate(`/room/${event.id}`);
  };

  const handleCancelEvent = async (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToCancel(event);
  };

  const confirmCancelEvent = async () => {
    if (!eventToCancel) return;

    setDeletingEventId(eventToCancel.id);

    try {
      await removeEvent(eventToCancel.id);
      toast.success("Event cancelled successfully");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to cancel event";
      console.error("Error cancelling event:", error);
      toast.error(errorMessage);
    } finally {
      setDeletingEventId(null);
      setEventToCancel(null);
    }
  };

  const handleEditEvent = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
  };

  const hasTicket = (eventId: string) => {
    return user?.purchasedTickets.includes(eventId);
  };

  const canJoinEvent = (eventId: string) => {
    return hasTicket(eventId) || user?.isAdmin || false;
  };

  // Helper functions for event status
  const isEventLive = (event: Event) => {
    const now = new Date();
    const eventStart = new Date(event.date);
    const eventEnd = new Date(eventStart.getTime() + event.duration * 60000);
    return now >= eventStart && now <= eventEnd;
  };

  const isEventPast = (event: Event) => {
    const now = new Date();
    const eventEnd = new Date(
      new Date(event.date).getTime() + event.duration * 60000,
    );
    return now > eventEnd;
  };

  const isEventUpcoming = (event: Event) => {
    const now = new Date();
    const eventStart = new Date(event.date);
    return now < eventStart;
  };

  const filteredEvents = events.filter((event) => {
    // "Live" shows only currently active events
    if (activeTab === "live")
      return isEventLive(event) && event.status !== "cancelled";
    // "Upcoming" includes both future events AND currently live events
    if (activeTab === "upcoming")
      return !isEventPast(event) && event.status !== "cancelled";
    // "Past" only includes events that have completely ended
    if (activeTab === "past") return isEventPast(event);
    // "Cancelled" only includes events that have been cancelled
    if (activeTab === "cancelled") return event.status === "cancelled";
    return false;
  });

  // Calculate pagination
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedEvents,
    handlePageChange,
    resetPage,
  } = usePagination(filteredEvents, 6);

  console.log("📊 [PAGINATION DEBUG] Filtered events:", filteredEvents.length);
  console.log("📊 [PAGINATION DEBUG] Current page:", currentPage);
  console.log("📊 [PAGINATION DEBUG] Total pages:", totalPages);
  console.log(
    "📊 [PAGINATION DEBUG] Paginated events:",
    paginatedEvents.length,
  );

  // Handle tab change and reset pagination
  const handleTabChange = (tab: "upcoming" | "past" | "live" | "cancelled") => {
    setActiveTab(tab);
    resetPage(); // Reset to first page when changing tabs
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Upcoming Events
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Join our video events and connect with the deaf community
            </p>
          </div>

          {!user && (
            <Card className="mb-8 bg-blue-50 border-blue-200 dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="pt-6">
                <p className="text-center dark:text-gray-300">
                  Please{" "}
                  <button
                    onClick={() => navigate("/auth")}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-semibold transition-colors"
                  >
                    sign in
                  </button>{" "}
                  to purchase tickets and join events
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between mb-6">
            <div className="flex items-center">
              <Filter className="size-4 text-gray-500 mr-2" />
              <select
                value={activeTab}
                onChange={(e) =>
                  handleTabChange(
                    e.target.value as
                      | "upcoming"
                      | "past"
                      | "live"
                      | "cancelled",
                  )
                }
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-md px-3 py-2"
              >
                <option value="upcoming">Upcoming Events</option>
                <option value="live">Live Events</option>
                <option value="past">Past Events</option>
                <option value="cancelled">Cancelled Events</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedEvents.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {activeTab === "past"
                    ? "No past events found."
                    : activeTab === "upcoming"
                      ? "No upcoming events found."
                      : activeTab === "live"
                        ? "No live events at the moment."
                        : activeTab === "cancelled"
                          ? "No cancelled events found."
                          : "No events found."}
                </p>
              </div>
            ) : (
              paginatedEvents.map((event) => (
                <Card
                  key={event.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleEventClick(event)}
                >
                  {event.imageUrl && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={event.imageUrl}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <CardTitle className="text-xl">{event.name}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        {/* Event Type Badge */}
                        <Badge
                          variant="secondary"
                          className={
                            event.eventType === "in-person"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 flex items-center gap-1"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 flex items-center gap-1"
                          }
                        >
                          {event.eventType === "in-person" ? (
                            <>
                              <MapPin className="size-3" />
                              In-Person
                            </>
                          ) : (
                            <>
                              <Video className="size-3" />
                              Virtual
                            </>
                          )}
                        </Badge>

                        {event.status === "cancelled" && (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                          >
                            Cancelled
                          </Badge>
                        )}
                        {isEventPast(event) && event.status !== "cancelled" && (
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                          >
                            Past Event
                          </Badge>
                        )}
                        {isEventLive(event) && event.status !== "cancelled" && (
                          <Badge
                            variant="destructive"
                            className="animate-pulse"
                          >
                            LIVE
                          </Badge>
                        )}
                        {hasTicket(event.id) && (
                          <Badge variant="default">Ticket Owned</Badge>
                        )}
                        {user?.isAdmin && !hasTicket(event.id) && (
                          <Badge
                            variant="default"
                            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          >
                            👑 Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription
                      className="line-clamp-2 prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="size-4 text-gray-500" />
                      <span>{format(new Date(event.date), "PPP")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="size-4 text-gray-500" />
                      <span>
                        {format(new Date(event.date), "p")} ({event.duration}{" "}
                        min)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="size-4 text-gray-500" />
                      <span>
                        {event.attendees} / {event.capacity} attendees
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <DollarSign className="size-4 text-gray-500" />
                      <span>${event.price}</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="w-full flex flex-col gap-2">
                      {canJoinEvent(event.id) ? (
                        <Button
                          className="w-full"
                          onClick={(e) => handleJoinEvent(event, e)}
                          disabled={
                            event.status === "cancelled" ||
                            isEventPast(event) ||
                            isEventUpcoming(event)
                          }
                        >
                          {isEventLive(event) ? "Join Now" : "Show Details"}
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant="outline"
                          disabled={!user}
                        >
                          View Details
                        </Button>
                      )}
                      {user?.isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleEditEvent(event, e)}
                          >
                            <Edit className="size-4 mr-2" />
                            Edit
                          </Button>
                          {event.status !== "cancelled" && (
                            <Button
                              className="flex-1"
                              variant="destructive"
                              size="sm"
                              onClick={(e) => handleCancelEvent(event, e)}
                              disabled={deletingEventId === event.id}
                            >
                              <Trash2 className="size-4 mr-2" />
                              {deletingEventId === event.id
                                ? "Cancelling..."
                                : "Cancel"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>

          <Pagination
            totalItems={filteredEvents.length}
            itemsPerPage={6}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* Edit Event Dialog */}
      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => {
            if (!open) setEditingEvent(null);
          }}
          onEventUpdated={() => {
            refreshEvents();
            setEditingEvent(null);
            toast.success("Event updated successfully!");
          }}
        />
      )}

      {/* Cancel Event Dialog */}
      <AlertDialog
        open={!!eventToCancel}
        onOpenChange={(open) => {
          if (!open) setEventToCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel "{eventToCancel?.name}"? This will
              delete the event and all associated tickets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelEvent}
              disabled={!!deletingEventId}
            >
              {deletingEventId ? "Cancelling..." : "Cancel Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
