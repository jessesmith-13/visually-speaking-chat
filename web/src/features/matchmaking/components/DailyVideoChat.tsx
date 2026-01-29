import { useEffect, useRef, useState } from "react";
import DailyIframe, {
  DailyCall,
  DailyEventObjectCameraError,
} from "@daily-co/daily-js";
import { Button } from "@/ui/button";
import { Camera, CameraOff, Video } from "lucide-react";

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
  const [permissionState, setPermissionState] = useState<"prompt" | "joining">(
    "prompt",
  );
  const [useCameraChoice, setUseCameraChoice] = useState<boolean | null>(null);

  // Handle user choosing to join with camera
  const handleJoinWithCamera = async () => {
    console.log("✅ User chose: Join WITH Camera");
    setUseCameraChoice(true);
    setPermissionState("joining");
  };

  // Handle user choosing to join without camera
  const handleJoinWithoutCamera = () => {
    console.log("✅ User chose: Join WITHOUT Camera");
    setUseCameraChoice(false);
    setPermissionState("joining");
  };

  // Initialize Daily when user makes their choice
  useEffect(() => {
    if (
      permissionState !== "joining" ||
      useCameraChoice === null ||
      !containerRef.current
    ) {
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

      // Handle errors
      callFrame.on("camera-error", (event: DailyEventObjectCameraError) => {
        console.error("📷 Camera error:", event);
      });

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
      } catch (error) {
        console.error("❌ Failed to join Daily room:", error);
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
  }, [permissionState, useCameraChoice, roomUrl, userName, onLeave]);

  return (
    <div className="relative w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
      {/* Daily iframe container */}
      <div
        ref={containerRef}
        className="absolute inset-0 bg-gray-900 rounded-lg"
      />

      {/* Permission Prompt Overlay - Show FIRST before joining */}
      {permissionState === "prompt" && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-50 rounded-lg">
          <div className="text-center max-w-md w-full px-6 space-y-6">
            <div className="flex justify-center">
              <div className="bg-cyan-500/20 p-6 rounded-full">
                <Video className="size-16 text-cyan-400" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-white">
                Ready to Connect?
              </h3>
              <p className="text-base text-gray-300">
                Choose how you'd like to join this video chat
              </p>
            </div>

            <div className="flex flex-col gap-4 pt-4">
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
                className="w-full border-gray-600 hover:bg-gray-800 text-white h-14 text-base font-medium"
                size="lg"
              >
                <CameraOff className="size-6 mr-3" />
                Join Without Camera
              </Button>

              <p className="text-xs text-gray-400 mt-2">
                {useCameraChoice === true && "Camera access will be requested"}
                {useCameraChoice === false &&
                  "You'll join audio-only (you can see others, they can't see you)"}
                {useCameraChoice === null &&
                  "You can change this later in the video controls"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
