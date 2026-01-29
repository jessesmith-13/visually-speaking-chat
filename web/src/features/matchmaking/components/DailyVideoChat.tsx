import { useEffect, useRef, useState } from "react";
import DailyIframe, {
  DailyCall,
  DailyEventObjectCameraError,
  DailyCallOptions,
} from "@daily-co/daily-js";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/ui/dialog";
import { Camera, CameraOff, Video, AlertCircle, RefreshCw } from "lucide-react";

interface DailyVideoChatProps {
  roomUrl: string;
  userName: string;
  onLeave: () => void;
  onNext: () => void;
}

export function DailyVideoChat({
  roomUrl,
  userName,
  onLeave,
}: DailyVideoChatProps) {
  const callFrameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasJoinedRef = useRef(false);
  const isInitializingRef = useRef(false); // MUST be a ref, not local variable!
  const onLeaveRef = useRef(onLeave); // Store onLeave in ref to avoid dependency changes

  // Keep onLeave ref up to date
  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  // Permission flow state
  const [showPermissionDialog, setShowPermissionDialog] = useState(true);
  const [showCameraError, setShowCameraError] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [useCameraChoice, setUseCameraChoice] = useState<boolean | null>(null);
  const [debugError, setDebugError] = useState<string>(""); // VISIBLE ERROR FOR DEBUGGING
  const [debugLogs, setDebugLogs] = useState<string[]>([]); // VISIBLE LOGS FOR MOBILE DEBUGGING!

  // Helper to add visible logs
  const addDebugLog = (...args: unknown[]) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg),
      )
      .join(" ");
    const logMessage = `[${timestamp}] ${message}`;
    console.log(...args); // Still log to console with original formatting
    setDebugLogs((prev) => [...prev.slice(-20), logMessage]); // Keep last 20 logs
  };

  // Handle user choosing to join with camera
  const handleJoinWithCamera = async () => {
    addDebugLog("═══════════════════════════════════════════════════════");
    addDebugLog("✅ USER ACTION: Join WITH Camera");
    addDebugLog("📱 User agent:", navigator.userAgent);
    addDebugLog("📱 Platform:", navigator.platform);
    addDebugLog(
      "📱 Is mobile:",
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    );
    addDebugLog("═══════════════════════════════════════════════════════");

    // DON'T pre-check camera - just let Daily handle it!
    // The pre-check was causing a race condition where the browser
    // wouldn't update permission state in time for Daily
    addDebugLog("📹 Skipping pre-check, letting Daily handle camera directly");
    setDebugError("Step 1: Starting Daily with camera enabled..."); // VISIBLE DEBUG

    setUseCameraChoice(true);
    setShowPermissionDialog(false);
    setIsJoining(true);

    addDebugLog(
      "🎬 STATE UPDATE: useCameraChoice=true, showPermissionDialog=false, isJoining=true",
    );
  };

  // Handle retry after camera error
  const handleRetryCamera = async () => {
    addDebugLog("🔄 Retrying camera permission...");

    // Close error dialog immediately
    setShowCameraError(false);
    setIsJoining(true);

    // Try to enable camera on existing call frame
    if (callFrameRef.current) {
      addDebugLog("📹 Attempting to enable camera on existing call...");
      try {
        await callFrameRef.current.setLocalVideo(true);
        addDebugLog("✅ Camera enabled successfully!");
        setIsJoining(false);
      } catch (err) {
        addDebugLog("❌ Failed to enable camera:", err);
        setDebugError(`Failed to enable camera: ${err}`);
        setIsJoining(false);
        setShowCameraError(true);
      }
    } else {
      addDebugLog("⚠️ No call frame exists, re-initializing...");
      // Reset and re-initialize
      isInitializingRef.current = false;
      hasJoinedRef.current = false;

      // Toggle state to trigger re-init
      setUseCameraChoice(null);
      setTimeout(() => {
        setUseCameraChoice(true);
        setIsJoining(true);
      }, 100);
    }
  };

  // Handle user choosing to join without camera
  const handleJoinWithoutCamera = () => {
    addDebugLog("✅ User chose: Join WITHOUT Camera");
    setUseCameraChoice(false);
    setShowPermissionDialog(false);
    setShowCameraError(false);
    setIsJoining(true);
  };

  // Initialize Daily when user makes their choice
  useEffect(() => {
    if (!isJoining || useCameraChoice === null || !containerRef.current) {
      return;
    }

    // WAIT FOR ROOM URL TO ARRIVE!
    if (!roomUrl) {
      addDebugLog("⏳ Waiting for room URL to arrive...");
      return;
    }

    // Use ref to prevent double initialization across effect runs
    if (isInitializingRef.current) {
      addDebugLog("⚠️ Already initializing (via ref), skipping...");
      return;
    }
    isInitializingRef.current = true;

    let isMounted = true;
    const shouldIgnoreLeaveRef = { current: false };

    const initializeCall = async () => {
      addDebugLog("🎥 Initializing Daily.co...");
      addDebugLog("📹 Use camera:", useCameraChoice);

      // Destroy any existing instance
      const existingCall = DailyIframe.getCallInstance();
      if (existingCall) {
        addDebugLog("🧹 Destroying existing Daily instance");
        await existingCall.destroy();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (!isMounted || !containerRef.current) {
        return;
      }

      // Create Daily call frame
      const callFrame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "0.5rem",
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      });

      callFrameRef.current = callFrame;

      // COMPREHENSIVE LOGGING FOR ALL DAILY EVENTS
      addDebugLog("🎯 Setting up Daily event listeners...");

      // Track if we've seen critical events (fallback for hung joined-meeting)
      let hasSeenStartedCamera = false;
      let hasSeenPlayableVideo = false;
      let hasSeenLocalParticipant = false; // NEW: Track if we've seen our own participant

      // IGNORE camera errors for the first 5 seconds (user needs time to respond to prompt!)
      const joinStartTime = Date.now();
      const CAMERA_ERROR_GRACE_PERIOD = 5000; // 5 seconds

      // Fallback timeout to force join if Daily hangs
      const fallbackTimeout = setTimeout(() => {
        if (
          !hasJoinedRef.current &&
          (hasSeenStartedCamera ||
            hasSeenPlayableVideo ||
            hasSeenLocalParticipant)
        ) {
          addDebugLog(
            "⚠️ FALLBACK: joined-meeting never fired, but we have participant/camera/video!",
          );
          addDebugLog("⚠️ FALLBACK: Forcing join state...");
          hasJoinedRef.current = true;
          if (isMounted) {
            setIsJoining(false);
          }

          // Enable camera now if user wanted it
          if (useCameraChoice && callFrameRef.current) {
            addDebugLog("📹 FALLBACK: Enabling camera now...");
            setTimeout(async () => {
              if (callFrameRef.current && isMounted) {
                try {
                  await callFrameRef.current.setLocalVideo(true);
                  addDebugLog("✅ FALLBACK: Camera enabled!");
                } catch (err) {
                  addDebugLog("❌ FALLBACK: Failed to enable camera:", err);
                  if (isMounted) {
                    setShowCameraError(true);
                    setDebugError(`Failed to enable camera: ${err}`);
                  }
                }
              }
            }, 500);
          }
        } else if (!hasJoinedRef.current) {
          addDebugLog("❌ TIMEOUT: No join indicators fired after 10s");
          addDebugLog(
            "❌ TIMEOUT: hasSeenLocalParticipant:",
            hasSeenLocalParticipant,
          );
          addDebugLog(
            "❌ TIMEOUT: hasSeenStartedCamera:",
            hasSeenStartedCamera,
          );
          addDebugLog(
            "❌ TIMEOUT: hasSeenPlayableVideo:",
            hasSeenPlayableVideo,
          );
        }
      }, 3000); // REDUCED to 3 seconds since we have better fallback

      // Handle successful join
      callFrame.on("joined-meeting", () => {
        addDebugLog("✅ ========== JOINED-MEETING EVENT FIRED ==========");
        addDebugLog("✅ Successfully joined meeting!");
        clearTimeout(fallbackTimeout);
        hasJoinedRef.current = true;

        // Hide joining state
        if (isMounted) {
          setIsJoining(false);
        }

        // NOW enable camera if user wanted it (after we're already in the call)
        if (useCameraChoice && callFrameRef.current) {
          addDebugLog("📹 Now enabling camera AFTER join...");
          setTimeout(async () => {
            if (callFrameRef.current && isMounted) {
              try {
                await callFrameRef.current.setLocalVideo(true);
                addDebugLog("✅ Camera enabled successfully after join!");
              } catch (err) {
                addDebugLog("❌ Failed to enable camera after join:", err);
                // Show error if camera enable fails
                if (isMounted) {
                  setShowCameraError(true);
                  setDebugError(
                    `Failed to enable camera after joining: ${err}`,
                  );
                }
              }
            }
          }, 500); // Small delay to ensure join is fully complete
        } else if (!useCameraChoice && callFrameRef.current) {
          addDebugLog("📹 Ensuring camera stays off...");
          try {
            callFrameRef.current.setLocalVideo(false);
            addDebugLog("✅ Camera disabled");
          } catch (err) {
            addDebugLog("ℹ️ Could not disable camera (already off):", err);
          }
        }
      });

      // Handle leave button
      callFrame.on("left-meeting", () => {
        addDebugLog("👋 LEFT-MEETING event fired");
        if (!shouldIgnoreLeaveRef.current && hasJoinedRef.current) {
          addDebugLog("👋 User left meeting");
          onLeaveRef.current();
        }
      });

      // ADDITIONAL DAILY EVENTS FOR DEBUGGING
      callFrame.on("loading", (event) => {
        addDebugLog("⏳ LOADING event:", event);
      });

      callFrame.on("loaded", (event) => {
        addDebugLog("📦 LOADED event:", event);
      });

      callFrame.on("started-camera", (event) => {
        addDebugLog("📹 STARTED-CAMERA event:", event);
        hasSeenStartedCamera = true;
      });

      callFrame.on("camera-error", (event: DailyEventObjectCameraError) => {
        addDebugLog("📷 CAMERA-ERROR event:", event);

        const timeSinceJoin = Date.now() - joinStartTime;
        addDebugLog(`⏱️ Time since join started: ${timeSinceJoin}ms`);

        // IGNORE camera errors during the grace period (user needs time to respond!)
        if (timeSinceJoin < CAMERA_ERROR_GRACE_PERIOD) {
          addDebugLog(
            `⏱️ IGNORING camera error (still in ${CAMERA_ERROR_GRACE_PERIOD}ms grace period)`,
          );
          return;
        }

        // Only show error if user actually wanted to use camera
        if (useCameraChoice) {
          addDebugLog("❌ Camera error for user who wanted camera");
          setDebugError(
            `Daily camera-error event: ${JSON.stringify(event.errorMsg)}`,
          ); // ADD DEBUG
          setIsJoining(false);
          setShowCameraError(true);
        } else {
          // User didn't want camera anyway - this error is expected and harmless
          addDebugLog("ℹ️ Camera error ignored (user chose no camera)");
        }
      });

      callFrame.on("joining-meeting", (event) => {
        addDebugLog("🚪 JOINING-MEETING event:", event);
      });

      callFrame.on("error", (event) => {
        addDebugLog("❌ ERROR event:", event);
      });

      callFrame.on("nonfatal-error", (event) => {
        addDebugLog("⚠️ NONFATAL-ERROR event:", event);
      });

      // ADD MORE EVENTS TO CATCH WHAT'S BLOCKING
      callFrame.on("participant-joined", (event) => {
        addDebugLog("👤 PARTICIPANT-JOINED event:", event);
      });

      callFrame.on("participant-updated", (event) => {
        addDebugLog("👤 PARTICIPANT-UPDATED event:", event);
        addDebugLog(
          "👤 PARTICIPANT DATA:",
          JSON.stringify(event.participant, null, 2),
        );

        // Check if this is our own participant
        if (event.participant.user_name === userName) {
          hasSeenLocalParticipant = true;
        }
      });

      callFrame.on("access-state-updated", (event) => {
        addDebugLog("🔐 ACCESS-STATE-UPDATED event:", event);
        addDebugLog("🔐 ACCESS STATE:", JSON.stringify(event.access, null, 2));
      });

      callFrame.on("meeting-session-state-updated", (event) => {
        addDebugLog("🏢 MEETING-SESSION-STATE-UPDATED event:", event);
      });

      callFrame.on("track-started", (event) => {
        addDebugLog("🎵 TRACK-STARTED event:", event);
        if (event.track.kind === "video") {
          hasSeenPlayableVideo = true;
        }
      });

      callFrame.on("track-stopped", (event) => {
        addDebugLog("🛑 TRACK-STOPPED event:", event);
      });

      addDebugLog("✅ All Daily event listeners attached");

      try {
        addDebugLog("🚀 Joining Daily room...");
        addDebugLog("📹 Camera setting:", useCameraChoice);
        addDebugLog("🔗 Room URL:", roomUrl);
        addDebugLog("👤 User name:", userName);

        // NEW APPROACH: Always join with video OFF first, then enable it after joined
        // ALSO disable audio since these are DEAF EVENTS (no mic needed!)
        const joinConfig: DailyCallOptions = {
          url: roomUrl,
          userName: userName,
          startVideoOff: true, // ALWAYS start with video off
          startAudioOff: true, // DISABLE AUDIO - these are deaf events!
        };

        addDebugLog("⚙️ Join config:", joinConfig);
        addDebugLog("📹 Will enable camera AFTER joining if user wants it");
        addDebugLog("🔇 Audio is DISABLED (deaf events don't need mic!)");

        // Call join - don't wait for the promise, rely on 'joined-meeting' event instead
        // This prevents hanging when there are camera permission issues
        callFrame.join(joinConfig).catch((error) => {
          addDebugLog("❌ Join promise rejected:", error);
          addDebugLog("❌ Error type:", typeof error);
          addDebugLog("❌ Error constructor:", error?.constructor?.name);
          addDebugLog(
            "❌ Error stack:",
            error instanceof Error ? error.stack : "N/A",
          );

          // For join errors, just show an alert
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (isMounted) {
            setDebugError(`Join error: ${errorMessage}`); // ADD DEBUG
            setIsJoining(false);
            alert(`Failed to join video chat: ${errorMessage}`);
          }
        });

        addDebugLog("📡 Join called, waiting for 'joined-meeting' event...");
      } catch (error) {
        addDebugLog("❌ Exception calling join():", error);
        if (isMounted) {
          setIsJoining(false);
          alert(
            `Failed to join video chat: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    };

    initializeCall();

    // Cleanup - only run on unmount
    return () => {
      addDebugLog("🧹 useEffect cleanup triggered");
      isMounted = false;
      shouldIgnoreLeaveRef.current = true;
      hasJoinedRef.current = false;
      isInitializingRef.current = false; // Reset for next time

      if (callFrameRef.current) {
        addDebugLog("🧹 Cleaning up Daily instance");
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
    // REMOVED onLeave from dependencies - using ref instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCameraChoice, roomUrl, userName]);

  return (
    <>
      {/* Daily iframe container */}
      <div className="relative w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
        <div
          ref={containerRef}
          className="absolute inset-0 bg-gray-900 rounded-lg"
        />

        {/* VISIBLE DEBUG LOGS FOR MOBILE - SHOWS ON SCREEN! */}
        {debugLogs.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 max-h-[40vh] overflow-y-auto bg-black/90 text-white text-xs font-mono p-3 z-50 border-t-2 border-cyan-500">
            <div className="flex justify-between items-center mb-2 sticky top-0 bg-black/90 pb-2">
              <strong className="text-cyan-400">
                DEBUG LOGS (Mobile Visible)
              </strong>
              <button
                onClick={() => setDebugLogs([])}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Clear
              </button>
            </div>
            {debugLogs.map((log, i) => (
              <div
                key={i}
                className="py-1 border-b border-gray-800 break-words"
              >
                {log}
              </div>
            ))}
          </div>
        )}

        {/* Show loading overlay while joining */}
        {isJoining && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <div className="size-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-medium">
                Joining video chat...
              </p>
              {useCameraChoice && (
                <p className="text-gray-400 text-sm mt-2">
                  Setting up your camera...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Permission Dialog - Initial choice */}
      <Dialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
      >
        <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-cyan-500/20 p-6 rounded-full">
                <Video className="size-16 text-cyan-400" />
              </div>
            </div>

            <div className="space-y-3 text-center">
              <DialogTitle className="text-2xl font-semibold text-white">
                Ready to Connect?
              </DialogTitle>
              <DialogDescription className="text-base text-gray-300">
                Choose how you'd like to join this video chat
              </DialogDescription>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                onClick={handleJoinWithCamera}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white h-14 text-base font-medium"
                size="lg"
              >
                <Camera className="size-6 mr-3" />
                Join With Camera
              </Button>

              <Button
                onClick={handleJoinWithoutCamera}
                variant="outline"
                className="w-full border-gray-600 hover:bg-gray-700 text-white h-14 text-base font-medium bg-transparent"
                size="lg"
              >
                <CameraOff className="size-6 mr-3" />
                Join Without Camera
              </Button>

              <p className="text-xs text-gray-400 text-center mt-2">
                You can enable your camera later using the video controls
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Error Dialog - Shows when camera is blocked */}
      <Dialog open={showCameraError} onOpenChange={setShowCameraError}>
        <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-red-500/20 p-6 rounded-full">
                <AlertCircle className="size-16 text-red-400" />
              </div>
            </div>

            <div className="space-y-3 text-center">
              <DialogTitle className="text-xl font-semibold text-white">
                Camera Access Blocked
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-300">
                We can't access your camera. Please enable camera permissions
                and try again.
              </DialogDescription>
            </div>

            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3 text-sm text-gray-300">
              <p className="font-medium text-white">How to unblock camera:</p>
              <ol className="list-decimal list-inside space-y-2 text-xs">
                <li>Tap the lock icon or "AA" in your browser's address bar</li>
                <li>Find "Camera" in the permissions list</li>
                <li>Change it to "Allow"</li>
                <li>Come back here and tap "Try Again"</li>
              </ol>
              <p className="text-xs text-gray-400 mt-3">
                On iPhone Safari: Settings → Safari → Camera → Allow
              </p>

              {/* VISIBLE DEBUG ERROR */}
              {debugError && (
                <div className="mt-4 p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300 break-words">
                  <strong>Debug:</strong> {debugError}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleRetryCamera}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white h-14 text-base font-medium"
                size="lg"
              >
                <RefreshCw className="size-6 mr-3" />
                Try Again
              </Button>

              <Button
                onClick={handleJoinWithoutCamera}
                variant="outline"
                className="w-full border-gray-600 hover:bg-gray-700 text-white h-14 text-base font-medium bg-transparent"
                size="lg"
              >
                <CameraOff className="size-6 mr-3" />
                Join Without Camera Instead
              </Button>

              <p className="text-xs text-gray-400 text-center mt-1">
                You can still see others, they just won't see you
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
