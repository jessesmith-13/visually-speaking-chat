import { Megaphone, Send } from "lucide-react";
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

interface AdminUpdateFormProps {
  updateTitle: string;
  updateMessage: string;
  isPostingUpdate: boolean;
  attendeeCount: number;
  onTitleChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
}

export function AdminUpdateForm({
  updateTitle,
  updateMessage,
  isPostingUpdate,
  attendeeCount,
  onTitleChange,
  onMessageChange,
  onSubmit,
}: AdminUpdateFormProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-5" />
          Post Event Update
        </CardTitle>
        <CardDescription>Send an update to all ticket holders</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Update Title</label>
          <Input
            placeholder="e.g., Venue Change, Schedule Update"
            value={updateTitle}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Message</label>
          <Textarea
            placeholder="Your update message..."
            value={updateMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            rows={5}
          />
        </div>
        <Button
          className="w-full"
          onClick={onSubmit}
          disabled={
            isPostingUpdate || !updateTitle.trim() || !updateMessage.trim()
          }
        >
          <Send className="size-4 mr-2" />
          {isPostingUpdate ? "Posting..." : "Post Update"}
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          This will notify all {attendeeCount} ticket holder
          {attendeeCount !== 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
