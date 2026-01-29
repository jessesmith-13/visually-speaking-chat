import { useEffect, useRef, useState } from "react";
import DailyIframe, {
  DailyCall,
  DailyEventObjectCameraError,
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

  // Permission flow state
  const [showPermissionDialog, setShowPermissionDialog] = useState(true);
  const [showCameraError, setShowCameraError] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [useCameraChoice, setUseCameraChoice] = useState<boolean | null>(null);

  // Handle user choosing to join with camera
  const handleJoinWithCamera = async () => {
    console.log("✅ User chose: Join WITH Camera");

    // First, try to request camera permission using browser API
    try {
      console.log("📹 Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      // Permission granted! Clean up the test stream
      stream.getTracks().forEach((track) => track.stop());
      console.log("✅ Camera permission granted!");

      // Now join with camera
      setUseCameraChoice(true);
      setShowPermissionDialog(false);
      setIsJoining(true);
    } catch (error) {
      console.error("❌ Camera permission denied:", error);

      // Show error dialog with instructions
      setShowPermissionDialog(false);
      setShowCameraError(true);
    }
  };

  // Handle retry after camera error
  const handleRetryCamera = async () => {
    console.log("🔄 Retrying camera permission...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      console.log("✅ Camera permission granted on retry!");

      // Permission granted! Join with camera
      setShowCameraError(false);
      setUseCameraChoice(true);
      setIsJoining(true);
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

      if (!isMounted || !containerRef.current) return;

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

      // Handle leave button
      callFrame.on("left-meeting", () => {
        if (!shouldIgnoreLeaveRef.current && hasJoinedRef.current) {
          console.log("👋 User left meeting");
          onLeave();
        }
      });

      // Handle camera errors from Daily
      callFrame.on("camera-error", (event: DailyEventObjectCameraError) => {
        console.error("📷 Camera error from Daily:", event);
        if (useCameraChoice) {
          // Only show error if user wanted to use camera
          setIsJoining(false);
          setShowCameraError(true);
        }
      });

      // Handle general errors
      callFrame.on("error", (event) => {
        console.error("❌ Daily error:", event);
      });

      try {
        console.log("🚀 Joining Daily room...");

        // Join with or without camera based on user choice
        await callFrame.join({
          url: roomUrl,
          userName: userName,
          videoSource: useCameraChoice ? true : false, // true = use camera, false = no camera
          audioSource: false, // No audio for deaf/HOH
          startVideoOff: !useCameraChoice, // Start with video off if no camera chosen
          startAudioOff: true,
        });

        console.log("✅ Joined Daily room successfully!");
        hasJoinedRef.current = true;
        setIsJoining(false);
      } catch (error) {
        console.error("❌ Failed to join Daily room:", error);
        setIsJoining(false);

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
          setShowCameraError(true);
        }
      }
    };

    initializeCall();

    // Cleanup
    return () => {
      isMounted = false;
      shouldIgnoreLeaveRef.current = true;
      hasJoinedRef.current = false;

      if (callFrameRef.current) {
        console.log("🧹 Cleaning up Daily instance");
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [isJoining, useCameraChoice, roomUrl, userName, onLeave]);

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
