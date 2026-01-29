import { useEffect, useRef, useState } from "react";
import DailyIframe, {
  DailyCall,
  DailyEventObjectCameraError,
} from "@daily-co/daily-js";
import { Button } from "@/ui/button";
import { Camera, CameraOff, RefreshCw, Loader2 } from "lucide-react";

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
  const isDestroyingRef = useRef(false);
  const hasJoinedRef = useRef(false);
  const shouldIgnoreLeaveRef = useRef(false);
  const [cameraError, setCameraError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [joinWithoutCamera, setJoinWithoutCamera] = useState(false);
  const [isJoining, setIsJoining] = useState(true); // Track joining state

  useEffect(() => {
    if (!roomUrl || !containerRef.current) return;

    let isMounted = true;

    const initializeCall = async () => {
      // Mark that we're about to destroy/recreate - ignore any leave events
      shouldIgnoreLeaveRef.current = true;
      isDestroyingRef.current = true;

      // Destroy any existing instance
      const existingCall = DailyIframe.getCallInstance();
      if (existingCall) {
        console.log("🧹 Destroying existing Daily instance");
        await existingCall.destroy();
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!isMounted || !containerRef.current) return;

      isDestroyingRef.current = false;
      setCameraError(false);

      console.log("🎥 Initializing Daily.co with URL:", roomUrl);

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
        // Hide Daily's pre-join UI and auto-join immediately
        showLocalVideo: false,
        showParticipantsBar: true,
      });

      callFrameRef.current = callFrame;

      // Handle leave button click
      callFrame.on("left-meeting", () => {
        console.log("👋 Left meeting event fired");

        // ONLY navigate if this is a real user-initiated leave
        if (shouldIgnoreLeaveRef.current) {
          console.log("⏭️ Ignoring left-meeting (programmatic destroy)");
          return;
        }

        if (isMounted && hasJoinedRef.current) {
          console.log("✅ User intentionally left - navigating");
          onLeave();
        }
      });

      // Handle camera errors - FIXED TypeScript types
      callFrame.on("camera-error", (event: DailyEventObjectCameraError) => {
        console.error("📷 Camera error:", event);
        console.log("❌ Camera permission denied - showing custom overlay");
        setCameraError(true);
      });

      // Monitor participant updates to detect camera state
      callFrame.on("participant-updated", (event) => {
        console.log("👤 Participant updated:", event);

        // Check if it's the local participant
        if (event.participant.local) {
          // Check if video track failed
          const videoTrack = event.participant.tracks?.video;
          if (videoTrack?.state === "blocked" || videoTrack?.blocked) {
            console.log("❌ Camera blocked detected via participant state");
            setCameraError(true);
          }
        }
      });

      // Handle general errors
      callFrame.on("error", (event) => {
        console.error("❌ Daily.co error:", event);

        // Check if it's a camera-related error
        const errorMessage =
          typeof event.errorMsg === "string" ? event.errorMsg : "";

        if (
          errorMessage.toLowerCase().includes("camera") ||
          errorMessage.toLowerCase().includes("video") ||
          errorMessage.toLowerCase().includes("permission")
        ) {
          console.log("❌ Camera-related error detected");
          setCameraError(true);
        }

        hasJoinedRef.current = false;
      });

      // Join the room
      try {
        await callFrame.join({
          url: roomUrl,
          userName: userName,
          videoSource: joinWithoutCamera ? false : true, // Allow joining without camera
          audioSource: false, // Disable microphone for deaf/HOH events
          startVideoOff: joinWithoutCamera, // Start with video off if no camera
          startAudioOff: true,
        });

        console.log("✅ Joined Daily.co room");
        hasJoinedRef.current = true;

        // Check camera state after joining
        setTimeout(async () => {
          if (!callFrame) return;

          try {
            const participants = callFrame.participants();
            const localParticipant = participants.local;

            if (localParticipant) {
              const videoTrack = localParticipant.tracks?.video;

              // Detect if camera is blocked/unavailable
              // blocked is an object with byPermissions, byDeviceMissing, etc.
              if (
                videoTrack?.state === "blocked" ||
                videoTrack?.blocked?.byPermissions ||
                videoTrack?.blocked?.byDeviceMissing ||
                videoTrack?.state === "off"
              ) {
                console.log("❌ Camera not available after join");
                setCameraError(true);
              }
            }
          } catch (error) {
            console.warn("Could not check camera state:", error);
          }
        }, 1000);

        // Now allow leave events to trigger navigation
        shouldIgnoreLeaveRef.current = false;
        setIsJoining(false); // Set joining state to false
      } catch (error) {
        console.error("❌ Error joining Daily.co room:", error);

        // Check if it's a camera permission error
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.toLowerCase().includes("camera") ||
          errorMessage.toLowerCase().includes("video") ||
          errorMessage.toLowerCase().includes("permission")
        ) {
          console.log("❌ Camera permission error during join");
          setCameraError(true);
        }

        hasJoinedRef.current = false;
        shouldIgnoreLeaveRef.current = false;
        setIsJoining(false); // Set joining state to false
      }
    };

    initializeCall();

    // Cleanup
    return () => {
      isMounted = false;
      hasJoinedRef.current = false;
      shouldIgnoreLeaveRef.current = true; // Ignore leave events during cleanup

      console.log("🧹 Cleaning up Daily.co instance");
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [roomUrl, userName, onLeave, joinWithoutCamera]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setCameraError(false);
    setJoinWithoutCamera(false);

    // Trigger re-join by destroying and recreating
    if (callFrameRef.current) {
      await callFrameRef.current.destroy();
      callFrameRef.current = null;
    }

    // The useEffect will reinitialize
    setTimeout(() => {
      setIsRetrying(false);
    }, 1000);
  };

  const handleJoinWithoutCamera = () => {
    setJoinWithoutCamera(true);
    setCameraError(false);
  };

  return (
    <div className="relative w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
      <div ref={containerRef} className="relative w-full h-full" />

      {/* Joining Loading Overlay - Hides Daily's awkward pre-join UI */}
      {isJoining && !cameraError && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-[9998]">
          <div className="text-center">
            <Loader2 className="size-12 text-cyan-500 mx-auto mb-4 animate-spin" />
            <p className="text-white text-lg font-medium">
              Joining video chat...
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Please allow camera access when prompted
            </p>
          </div>
        </div>
      )}

      {/* Camera Error Overlay - ALWAYS on top with higher z-index */}
      {cameraError && (
        <div
          className="fixed inset-0 bg-gray-900/98 flex items-center justify-center p-4 z-[9999]"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
          }}
        >
          <div className="text-center max-w-md w-full space-y-4">
            <div className="flex justify-center">
              <div className="bg-red-500/20 p-4 rounded-full">
                <CameraOff className="size-12 text-red-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">
                Camera Access Blocked
              </h3>
              <p className="text-sm text-gray-300">
                We couldn't access your camera. Please allow camera access in
                your browser settings, then try again.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                On mobile: Check your browser's site permissions or system
                settings to enable camera access.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white h-12"
                size="lg"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="size-5 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-5 mr-2" />
                    Try Again
                  </>
                )}
              </Button>

              <Button
                onClick={handleJoinWithoutCamera}
                variant="outline"
                className="w-full border-gray-600 hover:bg-gray-800 text-white h-12"
                size="lg"
              >
                <Camera className="size-5 mr-2" />
                Join Without Camera
              </Button>

              <p className="text-xs text-gray-500 mt-1">
                You can still see others, they just won't see you
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
