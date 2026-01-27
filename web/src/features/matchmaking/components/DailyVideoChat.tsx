import { useEffect, useRef } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

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

      // Handle errors
      callFrame.on("error", (event: { errorMsg?: string; error?: Error }) => {
        console.error("❌ Daily.co error:", event);
        hasJoinedRef.current = false;
      });

      // Join the room
      try {
        await callFrame.join({
          url: roomUrl,
          userName: userName,
          videoSource: true,
          audioSource: true,
          startVideoOff: false,
          startAudioOff: true,
        });

        console.log("✅ Joined Daily.co room");
        hasJoinedRef.current = true;

        // Now allow leave events to trigger navigation
        shouldIgnoreLeaveRef.current = false;
      } catch (error) {
        console.error("❌ Error joining Daily.co room:", error);
        hasJoinedRef.current = false;
        shouldIgnoreLeaveRef.current = false;
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
  }, [roomUrl, userName, onLeave]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px]"
    />
  );
}
