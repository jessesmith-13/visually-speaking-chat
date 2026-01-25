import { format } from "date-fns";
import { Megaphone } from "lucide-react";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { EventUpdate } from "@/features/events/hooks";

interface EventUpdatesCardProps {
  updates: EventUpdate[];
}

export function EventUpdatesCard({ updates }: EventUpdatesCardProps) {
  if (updates.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-5" />
          Event Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {updates.map((update) => (
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
  );
}
