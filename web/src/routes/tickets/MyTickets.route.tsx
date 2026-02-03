import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import QRCode from "qrcode";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import {
  ArrowLeft,
  Ticket as TicketIcon,
  Calendar,
  MapPin,
  Download,
  CheckCircle2,
} from "lucide-react";
import {
  getMyTicketsWithDetails,
  type TicketWithEvent,
} from "@/features/tickets/api";
import { useApp } from "@/app/hooks";
import { Loading } from "@/components/common/Loading";

type TabType = "upcoming" | "past";

export function MyTicketsRoute() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchTickets = async () => {
      setLoading(true);
      try {
        const ticketsData = await getMyTicketsWithDetails();
        setTickets(ticketsData);

        // Generate QR codes for all tickets
        const codes: Record<string, string> = {};
        const baseUrl = window.location.origin;

        for (const ticket of ticketsData) {
          const checkInUrl = `${baseUrl}/admin/check-in/${ticket.id}`;
          const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          codes[ticket.id] = qrDataUrl;
        }

        setQrCodes(codes);
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user, navigate]);

  const downloadQRCode = (ticketId: string, eventName: string) => {
    const qrDataUrl = qrCodes[ticketId];
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `ticket-${eventName.replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter tickets based on active tab
  const now = new Date();

  // An event is "past" only if it has completely ended (start time + duration)
  const upcomingTickets = tickets.filter((ticket) => {
    const eventStart = new Date(ticket.events.date);
    const eventEnd = new Date(
      eventStart.getTime() + ticket.events.duration * 60000,
    ); // duration is in minutes
    return eventEnd >= now; // Include events that haven't ended yet
  });

  const pastTickets = tickets.filter((ticket) => {
    const eventStart = new Date(ticket.events.date);
    const eventEnd = new Date(
      eventStart.getTime() + ticket.events.duration * 60000,
    );
    return eventEnd < now; // Only events that have completely ended
  });

  const displayedTickets =
    activeTab === "upcoming" ? upcomingTickets : pastTickets;

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/events")}
          className="mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Events
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Tickets</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your event tickets
          </p>
        </div>

        {/* Tabs */}
        {tickets.length > 0 && (
          <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  activeTab === "upcoming"
                    ? "text-primary"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Upcoming
                {upcomingTickets.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800">
                    {upcomingTickets.length}
                  </span>
                )}
                {activeTab === "upcoming" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  activeTab === "past"
                    ? "text-primary"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Past
                {pastTickets.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800">
                    {pastTickets.length}
                  </span>
                )}
                {activeTab === "past" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>
          </div>
        )}

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <TicketIcon className="size-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No tickets yet</p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Purchase tickets to upcoming events to see them here
              </p>
              <Button onClick={() => navigate("/events")}>Browse Events</Button>
            </CardContent>
          </Card>
        ) : displayedTickets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <TicketIcon className="size-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No {activeTab} tickets</p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {activeTab === "upcoming"
                  ? "You don't have any upcoming events. Browse events to purchase tickets."
                  : "You don't have any past events yet."}
              </p>
              {activeTab === "upcoming" && (
                <Button onClick={() => navigate("/events")}>
                  Browse Events
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {displayedTickets.map((ticket) => {
              const event = ticket.events;
              const isInPerson = event.event_type === "in-person";

              // Check if event is currently live
              const eventStart = new Date(event.date);
              const eventEnd = new Date(
                eventStart.getTime() + event.duration * 60000,
              );
              const isLive = now >= eventStart && now < eventEnd;

              return (
                <Card key={ticket.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {event.name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          {isLive && (
                            <Badge className="bg-red-500 hover:bg-red-600 text-white animate-pulse">
                              🔴 LIVE NOW
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {isInPerson ? "In-Person" : "Virtual"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-[1fr,auto] gap-6">
                      {/* Event Details */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="size-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="font-medium">
                              {format(eventStart, "EEEE, MMMM d, yyyy")}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {format(eventStart, "h:mm a")}
                            </p>
                          </div>
                        </div>

                        {isInPerson && event.venue_name && (
                          <div className="flex items-start gap-3">
                            <MapPin className="size-5 text-gray-500 mt-0.5" />
                            <div>
                              <p className="font-medium">{event.venue_name}</p>
                              {event.venue_address && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {event.venue_address}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                          {/* Check-in Status */}
                          {isInPerson &&
                            ticket.check_in_count !== undefined &&
                            ticket.check_in_count > 0 && (
                              <div className="mb-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="size-4" />
                                <span className="text-sm font-medium">
                                  Checked in {ticket.check_in_count} time
                                  {ticket.check_in_count !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}
                          {isInPerson && ticket.last_checked_in_at && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Last check-in:{" "}
                              {format(
                                new Date(ticket.last_checked_in_at),
                                "MMM d, yyyy 'at' h:mm a",
                              )}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Ticket ID: {ticket.id}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Purchased:{" "}
                            {format(
                              new Date(ticket.purchased_at),
                              "MMM d, yyyy 'at' h:mm a",
                            )}
                          </p>
                        </div>
                      </div>

                      {/* QR Code */}
                      {isInPerson && qrCodes[ticket.id] && (
                        <div className="flex flex-col items-center">
                          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <img
                              src={qrCodes[ticket.id]}
                              alt={`QR code for ${event.name}`}
                              className="w-48 h-48"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              downloadQRCode(ticket.id, event.name)
                            }
                            className="mt-3"
                          >
                            <Download className="size-4 mr-2" />
                            Download QR
                          </Button>
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2 max-w-[200px]">
                            Show this QR code at the venue for check-in
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="flex-1"
                      >
                        View Event Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
