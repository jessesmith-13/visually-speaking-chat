import { format } from "date-fns";
import { Calendar, Clock, Users, MapPin } from "lucide-react";
import { Card, CardContent } from "@/ui/card";
import { Event } from "@/features/events/types";

interface EventDetailsCardProps {
  event: Event;
}

export function EventDetailsCard({ event }: EventDetailsCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Event Details</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-gray-500" />
              <span>{format(new Date(event.date), "PPPP")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-gray-500" />
              <span>
                {format(new Date(event.date), "p")} - Duration: {event.duration}{" "}
                minutes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-5 text-gray-500" />
              <span>
                {event.attendees} / {event.capacity} attendees
              </span>
            </div>
            {event.eventType === "in-person" && event.venueName && (
              <div className="flex items-start gap-2">
                <MapPin className="size-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium">{event.venueName}</div>
                  {event.venueAddress && (
                    <div className="text-sm text-gray-600">
                      {event.venueAddress}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">What to Expect</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            {event.eventType === "virtual" ? (
              <>
                <li>Video-only communication (no audio)</li>
                <li>Random pairing with other attendees</li>
                <li>Ability to "next" and meet new people</li>
                <li>Safe, moderated environment</li>
                <li>Chat duration: {event.duration} minutes total</li>
              </>
            ) : (
              <>
                <li>In-person gathering at the venue</li>
                <li>Meet and connect with other attendees</li>
                <li>Bring your ticket QR code for check-in</li>
                <li>Safe, moderated environment</li>
                <li>Event duration: {event.duration} minutes</li>
              </>
            )}
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Guidelines</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Be respectful and kind to all participants</li>
            {event.eventType === "virtual" && (
              <li>No recording or screenshots</li>
            )}
            <li>Keep conversations appropriate</li>
            <li>Report any issues to moderators</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
