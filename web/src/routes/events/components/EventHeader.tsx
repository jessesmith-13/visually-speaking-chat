import { Badge } from "@/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Event } from "@/features/events/types";
import { Video, MapPin } from "lucide-react";

interface EventHeaderProps {
  event: Event;
  imageUrl?: string;
  hasTicket: boolean;
  isEventLive: boolean;
  isEventPast: boolean;
}

export function EventHeader({
  event,
  imageUrl,
  hasTicket,
  isEventLive,
  isEventPast,
}: EventHeaderProps) {
  return (
    <>
      {imageUrl && (
        <div className="h-96 overflow-hidden rounded-lg">
          <img
            src={imageUrl}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl mb-2">{event.name}</CardTitle>
              <CardDescription className="text-lg">
                {event.description}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {/* Event Type Badge */}
              <Badge
                variant="secondary"
                className={
                  event.eventType === "in-person"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 text-sm px-3 py-1 flex items-center gap-1"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-sm px-3 py-1 flex items-center gap-1"
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
                  className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-sm px-3 py-1"
                >
                  Event Cancelled
                </Badge>
              )}
              {isEventPast && event.status !== "cancelled" && (
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 text-sm px-3 py-1"
                >
                  Past Event
                </Badge>
              )}
              {isEventLive && event.status !== "cancelled" && (
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
      </Card>
    </>
  );
}
