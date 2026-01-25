import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Badge } from "@/ui/badge";
import {
  ArrowLeft,
  Users,
  Clock,
  Loader2,
  SkipForward,
  PhoneOff,
} from "lucide-react";
import { useApp } from "@/app/hooks";
import { DailyVideoChat } from "@/features/matchmaking/components/DailyVideoChat";
import { matchmaking } from "@/lib/edge/client";
import { supabase } from "@/lib/supabase/client";

export function VideoRoomRoute() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { events, user } = useApp();
  const currentEvent = events.find((e) => e.id === roomId);
  const [matchStatus, setMatchStatus] = useState<
    "searching" | "matched" | "not_started"
  >("not_started");
  const [roomName, setRoomName] = useState<string>("");
  const [dailyUrl, setDailyUrl] = useState<string>("");
  const [connectionTime, setConnectionTime] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isJoining, setIsJoining] = useState(false);
  const [permissionError, setPermissionError] = useState<string>("");
  const timerRef = useRef<number | null>(null);
  const pollingRef = useRef<number | null>(null);

  const hasTicket =
    user?.purchasedTickets.includes(currentEvent?.id || "") || false;

  // Subscribe to matchmaking updates
  useEffect(() => {
    if (!currentEvent || !user || !hasTicket) return;

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        // Check initial status (silently fail if JWT issues)
        const status = await matchmaking.getStatus(currentEvent.id);

        if (status?.status === "matched" && status.roomId) {
          setMatchStatus("matched");
          setRoomName(status.roomId);
        } else if (status?.status === "waiting") {
          setMatchStatus("searching");
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        // Silently ignore JWT errors - user can still join queue via button
        console.warn(
          "⚠️ Could not fetch initial matchmaking status (will retry on join):",
          errorMessage,
        );
      }

      // Subscribe to changes
      unsubscribe = matchmaking.subscribeToMatchmaking(
        currentEvent.id,
        user.id,
        async (data) => {
          console.log("Matchmaking update received:", data);

          if (data.is_matched && data.current_room_id) {
            setMatchStatus("matched");
            setRoomName(data.current_room_id);
          } else if (!data.is_matched) {
            // ONLY set to searching if we're not already matched
            // This prevents unmounting DailyVideoChat when joinQueue resets our status
            setMatchStatus((prev) => {
              if (prev === "matched") {
                console.log(
                  "⏭️ Ignoring is_matched=false while in matched state",
                );
                return prev; // Stay matched
              }
              return "searching";
            });
          }
        },
      );
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentEvent, user, hasTicket]);

  // Fetch Daily.co URL when we get a room match
  useEffect(() => {
    if (!roomName) return;

    const fetchDailyUrl = async () => {
      console.log("🎥 Fetching Daily.co URL for room:", roomName);

      try {
        const { data, error } = await supabase
          .from("video_rooms")
          .select("daily_url")
          .eq("id", roomName)
          .single();

        if (error) {
          console.error("❌ Error fetching Daily URL:", error);
          return;
        }

        if (data?.daily_url) {
          console.log("✅ Daily.co URL found:", data.daily_url);
          setDailyUrl(data.daily_url);
        } else {
          console.warn("⚠️ No Daily URL yet, will retry...");
          // Retry after 2 seconds if URL not ready yet
          setTimeout(fetchDailyUrl, 2000);
        }
      } catch (error) {
        console.error("❌ Error fetching Daily URL:", error);
      }
    };

    fetchDailyUrl();
  }, [roomName]);

  // Polling for matches while searching
  useEffect(() => {
    if (!currentEvent || matchStatus !== "searching") {
      // Clear polling if not searching
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    console.log("🔄 Starting polling for matches...");

    // Poll every 3 seconds to check for matches
    pollingRef.current = window.setInterval(async () => {
      console.log("🔄 Polling for match...");

      try {
        // Just check our status - matching happens automatically on the backend
        const status = await matchmaking.getStatus(currentEvent.id);

        if (status?.status === "matched" && status.roomId) {
          console.log("✅ Match found via polling!");
          setMatchStatus("matched");
          setRoomName(status.roomId);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.warn("⚠️ Polling error:", errorMessage);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [currentEvent, matchStatus]);

  // Timer for connection duration
  useEffect(() => {
    if (matchStatus === "matched") {
      timerRef.current = window.setInterval(() => {
        setConnectionTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setConnectionTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [matchStatus]);

  // Simulate online users count
  useEffect(() => {
    const count = Math.floor(Math.random() * 20) + 15;
    setOnlineUsers(count);
  }, []);

  // Cleanup on unmount - use ref to track status
  const matchStatusRef = useRef(matchStatus);
  matchStatusRef.current = matchStatus;

  useEffect(() => {
    return () => {
      // Only leave if actually in queue or matched
      if (
        currentEvent &&
        (matchStatusRef.current === "searching" ||
          matchStatusRef.current === "matched")
      ) {
        matchmaking.leaveQueue(currentEvent.id).catch((err) => {
          console.warn("⚠️ Error leaving queue on unmount:", err);
        });
      }
    };
  }, [currentEvent]);

  // Memoize handler functions to prevent DailyVideoChat re-renders
  const handleLeave = useCallback(async () => {
    if (currentEvent) {
      await matchmaking.leaveQueue(currentEvent.id);
    }
    navigate("/events");
  }, [currentEvent, navigate]);

  const handleNext = useCallback(async () => {
    if (!currentEvent) return;

    setMatchStatus("searching");
    setConnectionTime(0);
    setDailyUrl("");

    // Leave current match and rejoin queue
    try {
      await matchmaking.leaveQueue(currentEvent.id);
      await matchmaking.joinQueue(currentEvent.id);
    } catch (error) {
      console.error("Error finding next partner:", error);
    }
  }, [currentEvent]);

  if (!currentEvent || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4">Please select an event first</p>
            <Button onClick={() => navigate("/events")}>Go to Events</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasTicket) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4">You need a ticket to join this event</p>
            <Button onClick={() => navigate(`/events/${currentEvent.id}`)}>
              Purchase Ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleStartMatching = async () => {
    if (!currentEvent) return;

    setIsJoining(true);
    setPermissionError("");

    try {
      console.log("📋 Joining matchmaking queue...");

      await matchmaking.joinQueue(currentEvent.id);
      setMatchStatus("searching");
    } catch (error: unknown) {
      console.error("❌ Error joining queue:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setPermissionError(`Failed to join queue: ${errorMessage}`);
    } finally {
      setIsJoining(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLeave}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div>
                <h2 className="font-semibold">{currentEvent.name}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                  <div className="flex items-center gap-1">
                    <Users className="size-4" />
                    <span>{onlineUsers} online</span>
                  </div>
                  {matchStatus === "matched" && (
                    <div className="flex items-center gap-1">
                      <Clock className="size-4" />
                      <span>{formatTime(connectionTime)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Badge variant="default" className="bg-green-600">
              Connected as {user.name}
            </Badge>
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="container mx-auto px-4 py-8">
        {matchStatus === "searching" && (
          <div className="mb-4 p-4 bg-blue-900/50 border border-blue-700 rounded-lg">
            <div className="flex items-start gap-3">
              <Loader2 className="size-5 text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />
              <div>
                <p className="text-blue-200 font-medium mb-1">
                  Searching for a partner...
                </p>
                <p className="text-blue-300 text-sm">
                  We're matching you with someone right now. This usually takes
                  just a few seconds!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Video Container */}
        <div className="mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {matchStatus === "not_started" ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center max-w-md px-4">
                      <Users className="size-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">
                        Ready to Connect?
                      </h3>
                      <p className="text-gray-400 mb-6">
                        Click the button below to start meeting other attendees
                        through random video chat pairings.
                      </p>
                      {permissionError && (
                        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-200">
                          {permissionError}
                        </div>
                      )}
                      <Button
                        size="lg"
                        onClick={handleStartMatching}
                        disabled={isJoining}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isJoining ? (
                          <>
                            <Loader2 className="size-5 mr-2 animate-spin" />
                            Joining Queue...
                          </>
                        ) : (
                          "Start Matching"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : matchStatus === "searching" ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="size-12 text-blue-500 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-400">Finding your match...</p>
                    </div>
                  </div>
                ) : matchStatus === "matched" ? (
                  dailyUrl ? (
                    <DailyVideoChat
                      roomUrl={dailyUrl}
                      userName={user.name}
                      onLeave={handleLeave}
                      onNext={handleNext}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="size-12 text-blue-500 mx-auto mb-4 animate-spin" />
                        <p className="text-gray-400">Creating video room...</p>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls - Only show when matched and in call */}
        {matchStatus === "matched" && dailyUrl && (
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              variant="default"
              onClick={handleNext}
              className="h-14 px-8"
            >
              <SkipForward className="size-6 mr-2" />
              Next Partner
            </Button>

            <Button
              size="lg"
              variant="destructive"
              onClick={handleLeave}
              className="h-14 w-14 rounded-full"
            >
              <PhoneOff className="size-6" />
            </Button>
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-gray-800 border-gray-700 max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">How it works:</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Click "Start Matching" to join the queue</li>
                  <li>
                    • You'll be randomly paired with another event attendee
                  </li>
                  <li>
                    • Both participants join the same video room automatically
                  </li>
                  <li>• Click "Next Partner" to be matched with someone new</li>
                  <li>
                    • Use the controls in the video window to toggle camera/mic
                  </li>
                  <li>• Click the red phone icon to leave the event</li>
                </ul>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <p className="text-sm text-gray-400">
                  <strong>Note:</strong> Video calls are powered by Daily.co for
                  reliable, high-quality connections. The matchmaking system
                  pairs you randomly with other attendees who have purchased
                  tickets to this event.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
