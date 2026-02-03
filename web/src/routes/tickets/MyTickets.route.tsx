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
  CheckCircle2,
  Download,
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
  const upcomingTickets = tickets.filter(
    (ticket) => new Date(ticket.events.date) >= now,
  );
  const pastTickets = tickets.filter(
    (ticket) => new Date(ticket.events.date) < now,
  );
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
              const eventDate = new Date(event.date);
              const isPast = eventDate < new Date();
              const isInPerson = event.event_type === "in-person";
              const isCheckedIn =
                isInPerson && (ticket.check_in_count ?? 0) > 0;

              return (
                <Card key={ticket.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {event.name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={isPast ? "secondary" : "default"}>
                            {isPast ? "Past Event" : "Upcoming"}
                          </Badge>
                          <Badge variant="outline">
                            {isInPerson ? "In-Person" : "Virtual"}
                          </Badge>
                          {isCheckedIn && (
                            <Badge className="bg-green-600 dark:bg-green-700">
                              <CheckCircle2 className="size-3 mr-1" />
                              Checked In
                            </Badge>
                          )}
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
                              {format(eventDate, "EEEE, MMMM d, yyyy")}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {format(eventDate, "h:mm a")}
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

                        {isCheckedIn && ticket.last_checked_in_at && (
                          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-700 dark:text-green-300">
                              ✓ Checked in at{" "}
                              {format(
                                new Date(ticket.last_checked_in_at),
                                "h:mm a 'on' MMM d",
                              )}
                              {(ticket.check_in_count ?? 0) > 1 &&
                                ` (${ticket.check_in_count} times)`}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
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
                      {isInPerson &&
                        qrCodes[ticket.id] &&
                        (() => {
                          const baseUrl = window.location.origin;
                          const checkInUrl = `${baseUrl}/admin/check-in/${ticket.id}`;
                          const isDev = import.meta.env.DEV;

                          return (
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
                              {isDev && (
                                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-700 rounded text-xs max-w-[250px]">
                                  <p className="font-bold text-yellow-900 dark:text-yellow-100 mb-1">
                                    🔧 DEV: QR URL
                                  </p>
                                  <p className="font-mono text-yellow-800 dark:text-yellow-200 break-all">
                                    {checkInUrl}
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(checkInUrl);
                                      alert(
                                        "URL copied! Paste it in /admin/check-in debug box",
                                      );
                                    }}
                                    className="mt-2 w-full text-xs h-7"
                                  >
                                    Copy URL
                                  </Button>
                                </div>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2 max-w-[200px]">
                                Show this QR code at the venue for check-in
                              </p>
                            </div>
                          );
                        })()}
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
