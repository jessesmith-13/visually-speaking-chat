import { format } from "date-fns";
import { Users } from "lucide-react";
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
}

export function AdminParticipantsList({
  participants,
  loading,
}: AdminParticipantsListProps) {
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
            {participants.map((participant) => (
              <div
                key={participant.user_id}
                className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {participant.profiles?.full_name || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {participant.profiles?.email || "No email"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    ${participant.payment_amount}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Purchased: {format(new Date(participant.purchased_at), "PPp")}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
