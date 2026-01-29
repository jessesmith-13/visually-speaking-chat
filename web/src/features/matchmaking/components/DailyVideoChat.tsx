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

  // Handle user choosing to join with camera
  const handleJoinWithCamera = async () => {
    console.log("✅ User chose: Join WITH Camera");

    // First, try to request camera permission using browser API
    try {
      console.log("📹 Requesting camera permission...");
      setDebugError("Step 1: Requesting camera..."); // VISIBLE DEBUG
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      // Permission granted! Clean up the test stream
      stream.getTracks().forEach((track) => track.stop());
      console.log("✅ Camera permission granted!");
      setDebugError("Step 2: Camera permission granted!"); // VISIBLE DEBUG

      // Now join with camera
      setUseCameraChoice(true);
      setShowPermissionDialog(false);
      setIsJoining(true);
    } catch (error) {
      console.error("❌ Camera error:", error);

      // Check the specific error type
      const err = error as { name?: string; message?: string };
      console.log("❌ Error name:", err.name);
      console.log("❌ Error message:", err.message);

      // SET VISIBLE ERROR MESSAGE
      setDebugError(
        `ERROR: ${err.name || "Unknown"} - ${err.message || "No message"}`,
      );

      // Only show the "blocked" dialog for actual permission denials
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        console.log("🚫 Permission specifically denied");
        setShowPermissionDialog(false);
        setShowCameraError(true);
      } else {
        // For other errors (camera in use, hardware issues, etc), just join without camera
        console.log(
          "⚠️ Camera error but not permission issue - joining without camera",
        );
        console.log(
          "ℹ️ User can still enable camera in Daily controls if they want",
        );
        setUseCameraChoice(true); // Still try to join with camera enabled - Daily will handle it
        setShowPermissionDialog(false);
        setIsJoining(true);
      }
    }
  };

  // Handle retry after camera error
  const handleRetryCamera = async () => {
    console.log("🔄 Retrying camera permission...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      console.log("✅ Camera permission granted on retry!");

      // Permission granted! FORCE re-initialization by resetting the ref
      console.log("🔄 Resetting initialization ref to allow retry...");
      isInitializingRef.current = false;

      // Destroy existing instance first
      if (callFrameRef.current) {
        console.log("🧹 Destroying existing Daily instance before retry...");
        await callFrameRef.current.destroy();
        callFrameRef.current = null;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Close error dialog and trigger re-initialization
      setShowCameraError(false);
      setUseCameraChoice(true);
      setIsJoining(true);

      // Force a state change to trigger useEffect re-run
      // We'll toggle useCameraChoice to null and back to true
      setUseCameraChoice(null);
      setTimeout(() => {
        setUseCameraChoice(true);
      }, 100);
    } catch (error) {
      console.error("❌ Camera still blocked:", error);
      // Keep the error dialog open - user needs to manually unblock
      alert(
        "Camera is still blocked. Please go to your browser settings and allow camera access for this site, then tap 'Try Again'.",
      );
    }
  };

  // Handle user choosing to join without camera
  const handleJoinWithoutCamera = () => {
    console.log("✅ User chose: Join WITHOUT Camera");
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
      console.log("⏳ Waiting for room URL to arrive...");
      return;
    }

    // Use ref to prevent double initialization across effect runs
    if (isInitializingRef.current) {
      console.log("⚠️ Already initializing (via ref), skipping...");
      return;
    }
    isInitializingRef.current = true;

    let isMounted = true;
    const shouldIgnoreLeaveRef = { current: false };

    const initializeCall = async () => {
      console.log("🎥 Initializing Daily.co...");
      console.log("📹 Use camera:", useCameraChoice);

      // Destroy any existing instance
      const existingCall = DailyIframe.getCallInstance();
      if (existingCall) {
        console.log("🧹 Destroying existing Daily instance");
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
      console.log("🎯 Setting up Daily event listeners...");

      // Track if we've seen critical events (fallback for hung joined-meeting)
      let hasSeenStartedCamera = false;
      let hasSeenPlayableVideo = false;

      // Fallback timeout to force join if Daily hangs
      const fallbackTimeout = setTimeout(() => {
        if (
          !hasJoinedRef.current &&
          (hasSeenStartedCamera || hasSeenPlayableVideo)
        ) {
          console.warn(
            "⚠️ FALLBACK: joined-meeting never fired, but we have camera/video!",
          );
          console.warn("⚠️ FALLBACK: Forcing join state...");
          hasJoinedRef.current = true;
          if (isMounted) {
            setIsJoining(false);
          }
        } else if (!hasJoinedRef.current) {
          console.error(
            "❌ TIMEOUT: Neither joined-meeting nor started-camera fired after 10s",
          );
        }
      }, 10000); // 10 second timeout

      // Handle successful join
      callFrame.on("joined-meeting", () => {
        console.log("✅ ========== JOINED-MEETING EVENT FIRED ==========");
        console.log("✅ Successfully joined meeting!");
        clearTimeout(fallbackTimeout);
        hasJoinedRef.current = true;

        // If user chose no camera, explicitly disable it
        if (!useCameraChoice && callFrameRef.current) {
          console.log("📹 Ensuring camera is off...");
          try {
            callFrameRef.current.setLocalVideo(false);
            console.log("✅ Camera disabled");
          } catch (err) {
            console.log("ℹ️ Could not disable camera (already off):", err);
          }
        }

        // Hide joining state
        if (isMounted) {
          setIsJoining(false);
        }
      });

      // Handle leave button
      callFrame.on("left-meeting", () => {
        console.log("👋 LEFT-MEETING event fired");
        if (!shouldIgnoreLeaveRef.current && hasJoinedRef.current) {
          console.log("👋 User left meeting");
          onLeaveRef.current();
        }
      });

      // ADDITIONAL DAILY EVENTS FOR DEBUGGING
      callFrame.on("loading", (event) => {
        console.log("⏳ LOADING event:", event);
      });

      callFrame.on("loaded", (event) => {
        console.log("📦 LOADED event:", event);
      });

      callFrame.on("started-camera", (event) => {
        console.log("📹 STARTED-CAMERA event:", event);
        hasSeenStartedCamera = true;
      });

      callFrame.on("camera-error", (event: DailyEventObjectCameraError) => {
        console.log("📷 CAMERA-ERROR event:", event);
        // Only show error if user actually wanted to use camera
        if (useCameraChoice) {
          console.error("❌ Camera error for user who wanted camera");
          setIsJoining(false);
          setShowCameraError(true);
        } else {
          // User didn't want camera anyway - this error is expected and harmless
          console.log("ℹ️ Camera error ignored (user chose no camera)");
        }
      });

      callFrame.on("joining-meeting", (event) => {
        console.log("🚪 JOINING-MEETING event:", event);
      });

      callFrame.on("error", (event) => {
        console.error("❌ ERROR event:", event);
      });

      callFrame.on("nonfatal-error", (event) => {
        console.warn("⚠️ NONFATAL-ERROR event:", event);
      });

      // ADD MORE EVENTS TO CATCH WHAT'S BLOCKING
      callFrame.on("participant-joined", (event) => {
        console.log("👤 PARTICIPANT-JOINED event:", event);
      });

      callFrame.on("participant-updated", (event) => {
        console.log("👤 PARTICIPANT-UPDATED event:", event);
        console.log(
          "👤 PARTICIPANT DATA:",
          JSON.stringify(event.participant, null, 2),
        );
      });

      callFrame.on("access-state-updated", (event) => {
        console.log("🔐 ACCESS-STATE-UPDATED event:", event);
        console.log("🔐 ACCESS STATE:", JSON.stringify(event.access, null, 2));
      });

      callFrame.on("meeting-session-state-updated", (event) => {
        console.log("🏢 MEETING-SESSION-STATE-UPDATED event:", event);
      });

      callFrame.on("track-started", (event) => {
        console.log("🎵 TRACK-STARTED event:", event);
        if (event.track.kind === "video") {
          hasSeenPlayableVideo = true;
        }
      });

      callFrame.on("track-stopped", (event) => {
        console.log("🛑 TRACK-STOPPED event:", event);
      });

      console.log("✅ All Daily event listeners attached");

      try {
        console.log("🚀 Joining Daily room...");
        console.log("📹 Camera setting:", useCameraChoice);
        console.log("🔗 Room URL:", roomUrl);
        console.log("👤 User name:", userName);

        // Join configuration - Different approach based on camera choice
        let joinConfig: DailyCallOptions;

        if (useCameraChoice) {
          // User wants camera - request it explicitly
          joinConfig = {
            url: roomUrl,
            userName: userName,
            startVideoOff: false,
            startAudioOff: true,
          };
        } else {
          // User doesn't want camera - DON'T mention video at all
          joinConfig = {
            url: roomUrl,
            userName: userName,
            startAudioOff: true,
          };
        }

        console.log("⚙️ Join config:", joinConfig);

        // Call join - don't wait for the promise, rely on 'joined-meeting' event instead
        // This prevents hanging when there are camera permission issues
        callFrame.join(joinConfig).catch((error) => {
          console.error("❌ Join promise rejected:", error);

          // Check if it's a camera-related error
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (
            useCameraChoice &&
            (errorMessage.toLowerCase().includes("camera") ||
              errorMessage.toLowerCase().includes("video") ||
              errorMessage.toLowerCase().includes("permission") ||
              errorMessage.toLowerCase().includes("notfound"))
          ) {
            if (isMounted) {
              setIsJoining(false);
              setShowCameraError(true);
            }
          } else {
            // For non-camera errors that truly prevent joining, show alert
            if (isMounted) {
              setIsJoining(false);
              alert(`Failed to join video chat: ${errorMessage}`);
            }
          }
        });

        console.log("📡 Join called, waiting for 'joined-meeting' event...");
      } catch (error) {
        console.error("❌ Exception calling join():", error);
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
      console.log("🧹 useEffect cleanup triggered");
      isMounted = false;
      shouldIgnoreLeaveRef.current = true;
      hasJoinedRef.current = false;
      isInitializingRef.current = false; // Reset for next time

      if (callFrameRef.current) {
        console.log("🧹 Cleaning up Daily instance");
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
