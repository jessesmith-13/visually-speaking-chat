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
  const [connectionTime, setConnectionTime] = useState(300); // Start at 300 seconds (5 minutes)
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isJoining, setIsJoining] = useState(false);
  const [permissionError, setPermissionError] = useState<string>("");
  const [showTimeWarning, setShowTimeWarning] = useState(false); // For 30-second flash
  const timerRef = useRef<number | null>(null);
  const pollingRef = useRef<number | null>(null);
  const handleNextRef = useRef<(() => Promise<void>) | null>(null); // Store handleNext reference

  const hasTicket =
    user?.purchasedTickets.includes(currentEvent?.id || "") || false;
  const isAdmin = user?.isAdmin || false;
  const canJoinEvent = hasTicket || isAdmin;

  // Subscribe to matchmaking updates
  useEffect(() => {
    if (!currentEvent || !user || !canJoinEvent) return;

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
            // Partner left or match was broken - go back to searching
            console.log(
              "🔄 Partner left or match ended, returning to queue...",
            );
            setMatchStatus("searching");
            setRoomName("");
            setDailyUrl("");
            setConnectionTime(300); // Reset timer
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
  }, [currentEvent, user, canJoinEvent]);

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
        setConnectionTime((prev) => {
          const newTime = prev - 1; // Count DOWN

          // Trigger 30-second warning flash
          if (newTime === 30) {
            setShowTimeWarning(true);
            // Flash for 3 seconds then hide
            setTimeout(() => setShowTimeWarning(false), 3000);
          }

          // Auto-next when timer hits 0
          if (newTime === 0) {
            console.log(
              "⏰ Timer reached 0:00 - automatically finding next partner...",
            );
            // Use ref to avoid closure issues
            handleNextRef.current?.();
          }

          // Stop at 0
          return Math.max(0, newTime);
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setConnectionTime(300); // Reset to 5 minutes (300 seconds)
      setShowTimeWarning(false);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [matchStatus]);

  // Memoize handler functions to prevent DailyVideoChat re-renders
  const handleNext = useCallback(async () => {
    if (!currentEvent) return;

    setMatchStatus("searching");
    setConnectionTime(300); // Reset to 5 minutes
    setDailyUrl("");

    // Leave current match and rejoin queue
    try {
      await matchmaking.leaveQueue(currentEvent.id);
      await matchmaking.joinQueue(currentEvent.id);
    } catch (error) {
      console.error("Error finding next partner:", error);
    }
  }, [currentEvent]);

  // Store handleNext in ref so timer can call it
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  // Track actual online users in the matchmaking queue
  useEffect(() => {
    if (!currentEvent) return;

    // Fetch initial count
    const fetchOnlineCount = async () => {
      try {
        const { count, error } = await supabase
          .from("matchmaking_queue")
          .select("*", { count: "exact", head: true })
          .eq("event_id", currentEvent.id);

        if (!error && count !== null) {
          setOnlineUsers(count);
        }
      } catch (error) {
        console.error("Error fetching online users count:", error);
      }
    };

    fetchOnlineCount();

    // Subscribe to real-time changes in the queue
    const channel = supabase
      .channel(`online-users-${currentEvent.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matchmaking_queue",
          filter: `event_id=eq.${currentEvent.id}`,
        },
        () => {
          // Refetch count when queue changes
          fetchOnlineCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentEvent]);

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

  // Handle cases where user is not logged in or does not have a ticket
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

  if (!canJoinEvent) {
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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="w-full px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLeave}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <ArrowLeft className="size-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm sm:text-base truncate">
                  {currentEvent.name}
                </h2>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 mt-1">
                  <div className="flex items-center gap-1">
                    <Users className="size-3 sm:size-4" />
                    <span>{onlineUsers} online</span>
                  </div>
                  {matchStatus === "matched" && (
                    <div className="flex items-center gap-1">
                      <Clock className="size-3 sm:size-4" />
                      <span>{formatTime(connectionTime)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Badge
              variant="default"
              className="bg-green-600 text-xs sm:text-sm flex-shrink-0"
            >
              {user.name}
            </Badge>
          </div>
        </div>
      </div>

      {/* Video Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-2 sm:px-4 py-4 sm:py-8 max-w-6xl mx-auto">
          {matchStatus === "searching" && (
            <div className="mb-4 p-4 bg-blue-900/50 border border-blue-700 rounded-lg">
              <div className="flex items-start gap-3">
                <Loader2 className="size-5 text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />
                <div>
                  <p className="text-blue-200 font-medium mb-1">
                    Searching for a partner...
                  </p>
                  <p className="text-blue-300 text-sm">
                    We're matching you with someone right now. This usually
                    takes just a few seconds!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Video Container */}
          <div className="mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div
                  className={`relative aspect-video bg-gray-900 rounded-lg overflow-hidden ${
                    showTimeWarning
                      ? "ring-8 ring-yellow-500 animate-pulse"
                      : ""
                  }`}
                >
                  {/* 30-Second Warning Overlay */}
                  {showTimeWarning && (
                    <div className="absolute inset-0 z-50 pointer-events-none">
                      <div className="absolute inset-0 bg-yellow-500/20 animate-pulse" />
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="bg-yellow-500 text-black px-8 py-4 rounded-lg shadow-2xl animate-bounce">
                          <p className="text-2xl font-bold text-center">
                            ⏰ 30 SECONDS LEFT!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {matchStatus === "not_started" ? (
                    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
                      <div className="text-center max-w-md w-full space-y-4 sm:space-y-6">
                        <Users className="size-16 sm:size-20 text-gray-600 mx-auto" />
                        <div className="space-y-2 sm:space-y-3">
                          <h3 className="text-xl sm:text-2xl font-semibold">
                            Ready to Connect?
                          </h3>
                          <p className="text-sm sm:text-base text-gray-400 px-2">
                            Click the button below to start meeting other
                            attendees through random video chat pairings.
                          </p>
                        </div>
                        {permissionError && (
                          <div className="p-3 sm:p-4 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-200">
                            {permissionError}
                          </div>
                        )}
                        <Button
                          size="lg"
                          onClick={handleStartMatching}
                          disabled={isJoining}
                          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-12 sm:h-14 text-base sm:text-lg px-8"
                        >
                          {isJoining ? (
                            <>
                              <Loader2 className="size-5 sm:size-6 mr-2 animate-spin" />
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
                    // ALWAYS render DailyVideoChat when matched - don't wait for dailyUrl
                    // This prevents remounting when dailyUrl arrives
                    <DailyVideoChat
                      roomUrl={dailyUrl}
                      userName={user.name}
                      onLeave={handleLeave}
                      onNext={handleNext}
                    />
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls - Only show when matched and in call */}
          {matchStatus === "matched" && dailyUrl && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
              <Button
                size="lg"
                variant="default"
                onClick={handleNext}
                className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8"
              >
                <SkipForward className="size-5 sm:size-6 mr-2" />
                Next Partner
              </Button>

              <Button
                size="lg"
                variant="destructive"
                onClick={handleLeave}
                className="w-full sm:w-auto h-12 sm:h-14 sm:w-14 sm:rounded-full"
              >
                <PhoneOff className="size-5 sm:size-6" />
                <span className="sm:hidden ml-2">Leave Event</span>
              </Button>
            </div>
          )}

          {/* Info Card */}
          <Card className="mt-8 bg-gray-800 border-gray-700 max-w-2xl mx-auto">
            <CardContent className="pt-6 px-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">
                    How it works:
                  </h3>
                  <ul className="text-xs sm:text-sm text-gray-300 space-y-1">
                    <li>• Click "Start Matching" to join the queue</li>
                    <li>
                      • You'll be randomly paired with another event attendee
                    </li>
                    <li>
                      • Both participants join the same video room automatically
                    </li>
                    <li>
                      • Click "Next Partner" to be matched with someone new
                    </li>
                    <li>
                      • Use the controls in the video window to toggle
                      camera/mic
                    </li>
                    <li>• Click the red phone icon to leave the event</li>
                  </ul>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-xs sm:text-sm text-gray-400">
                    <strong>Note:</strong> Video calls are powered by Daily.co
                    for reliable, high-quality connections. The matchmaking
                    system pairs you randomly with other attendees who have
                    purchased tickets to this event.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
