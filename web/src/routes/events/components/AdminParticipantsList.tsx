import { format } from "date-fns";
import { Users, CheckCircle2 } from "lucide-react";
import { Badge } from "@/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import { EventParticipant } from "@/features/events/hooks";

interface AdminParticipantsListProps {
  participants: EventParticipant[];
  loading: boolean;
  eventType?: "virtual" | "in-person";
}

export function AdminParticipantsList({
  participants,
  loading,
  eventType,
}: AdminParticipantsListProps) {
  const isInPerson = eventType === "in-person";

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5" />
          Event Participants ({participants.length})
        </CardTitle>
        <CardDescription>Users who have purchased tickets</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-500">Loading participants...</p>
        ) : participants.length === 0 ? (
          <p className="text-sm text-gray-500">No participants yet</p>
        ) : (
          <div className="space-y-3">
            {participants.map((participant) => {
              const isCheckedIn = isInPerson && participant.check_in_count > 0;

              return (
                <div
                  key={participant.user_id}
                  className={`p-3 border rounded-lg transition-colors ${
                    isCheckedIn
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {participant.profiles?.full_name || "Unknown User"}
                        </p>
                        {isCheckedIn && (
                          <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {participant.profiles?.email || "No email"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-xs">
                        ${participant.payment_amount}
                      </Badge>
                      {isCheckedIn && (
                        <Badge
                          variant="default"
                          className="text-xs bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800"
                        >
                          Checked In
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Purchased:{" "}
                      {format(new Date(participant.purchased_at), "PPp")}
                    </p>
                    {isInPerson && participant.last_checked_in_at && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Last check-in:{" "}
                        {format(
                          new Date(participant.last_checked_in_at),
                          "PPp",
                        )}
                        {participant.check_in_count > 1 &&
                          ` (${participant.check_in_count} times)`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
