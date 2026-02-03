import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { CheckCircle, XCircle, Camera, Loader2, ArrowLeft } from "lucide-react";
import {
  getTicketDetails,
  verifyAndCheckInTicket,
  type TicketDetails,
} from "@/features/admin/api";

export function CheckIn() {
  const { ticketId } = useParams<{ ticketId?: string }>();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [manualTicketId, setManualTicketId] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  // DEBUG MODE
  const [debugQrUrl, setDebugQrUrl] = useState("");
  const [debugResult, setDebugResult] = useState<string>("");
  const isDev = import.meta.env.DEV;

  const testQrExtraction = () => {
    const match = debugQrUrl.match(/\/admin\/check-in\/([a-fA-F0-9-]+)/);
    if (match) {
      setDebugResult(`✅ MATCH! Extracted ID: ${match[1]}`);
    } else {
      setDebugResult(`❌ NO MATCH! URL doesn't match pattern`);
    }
  };

  // Function declarations BEFORE useEffect hooks
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        const html5QrCode = html5QrCodeRef.current;
        if (html5QrCode.isScanning) {
          await html5QrCode.stop();
        }
        html5QrCode.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setScannerReady(false);
  };

  const verifyTicket = async (ticketId: string) => {
    setVerificationStatus("loading");
    setErrorMessage("");

    try {
      // First, get ticket details with event and user info
      const ticketData = await getTicketDetails(ticketId);
      setTicketDetails(ticketData);

      // Call the verify endpoint
      const result = await verifyAndCheckInTicket(ticketId);

      // Update ticket details with new check-in info
      setTicketDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          check_in_count: result.ticket.check_in_count,
          last_checked_in_at: result.ticket.last_checked_in_at,
        };
      });

      setVerificationStatus("success");
    } catch (error) {
      console.error("Error verifying ticket:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "An error occurred",
      );
      setVerificationStatus("error");
    }
  };

  const resetScanner = () => {
    setVerificationStatus("idle");
    setTicketDetails(null);
    setErrorMessage("");
    navigate("/admin/check-in");
  };

  // If ticketId is in URL, verify immediately
  useEffect(() => {
    if (!ticketId) return;

    const verify = async () => {
      setVerificationStatus("loading");
      setErrorMessage("");

      try {
        // First, get ticket details with event and user info
        const ticketData = await getTicketDetails(ticketId);
        setTicketDetails(ticketData);

        // Call the verify endpoint
        const result = await verifyAndCheckInTicket(ticketId);

        // Update ticket details with new check-in info
        setTicketDetails((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            check_in_count: result.ticket.check_in_count,
            last_checked_in_at: result.ticket.last_checked_in_at,
          };
        });

        setVerificationStatus("success");
      } catch (error) {
        console.error("Error verifying ticket:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "An error occurred",
        );
        setVerificationStatus("error");
      }
    };

    verify();
  }, [ticketId]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      // First, set state to render the scanner div
      setIsScanning(true);
      setVerificationStatus("idle");
      setErrorMessage("");

      // Wait for next tick to ensure DOM is updated
      await new Promise((resolve) => setTimeout(resolve, 100));

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText: string) => {
          // Stop scanner immediately
          await stopScanner();

          // DEBUG: Log what we scanned
          console.log("🔍 QR Code Scanned:", decodedText);

          // Extract ticket ID from URL (handle both full URLs and paths)
          // Use [a-fA-F0-9] to match UUIDs with uppercase/lowercase hex digits
          const ticketIdMatch = decodedText.match(
            /\/admin\/check-in\/([a-fA-F0-9-]+)/,
          );
          console.log("🎯 Ticket ID Match:", ticketIdMatch);

          if (ticketIdMatch) {
            console.log("✅ Navigating to ticket:", ticketIdMatch[1]);
            // Navigate to the ticket URL so the useEffect handles verification
            navigate(`/admin/check-in/${ticketIdMatch[1]}`);
          } else {
            console.error(
              "❌ QR pattern didn't match. Full text:",
              decodedText,
            );
            setErrorMessage(
              `Invalid QR code format. Got: ${decodedText.substring(0, 50)}...`,
            );
            setVerificationStatus("error");
          }
        },
        () => {
          // Ignore scan errors (they happen constantly)
        },
      );

      setScannerReady(true);
    } catch (error) {
      console.error("Error starting scanner:", error);
      let errorMsg = "Failed to start camera. ";

      if (error instanceof Error) {
        if (error.message.includes("Permission")) {
          errorMsg += "Please allow camera access in your browser settings.";
        } else if (error.message.includes("NotFound")) {
          errorMsg += "No camera found on this device.";
        } else if (error.message.includes("secure")) {
          errorMsg += "Camera access requires HTTPS or localhost.";
        } else {
          errorMsg += error.message;
        }
      } else {
        errorMsg +=
          "Please check camera permissions and ensure you're using HTTPS.";
      }

      setErrorMessage(errorMsg);
      setVerificationStatus("error");
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/users")}
          >
            <ArrowLeft className="size-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        <Card className="p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-2">
            🎟️ Ticket Check-In
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Scan QR codes to check in attendees
          </p>

          {verificationStatus === "idle" && !isScanning && (
            <div className="space-y-6">
              <div className="text-center">
                <Button
                  size="lg"
                  onClick={startScanner}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Camera className="size-5 mr-2" />
                  Start Scanning
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">
                    Or enter manually
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Paste ticket ID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
                  value={manualTicketId}
                  onChange={(e) => setManualTicketId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                />
                <Button
                  onClick={() => {
                    if (manualTicketId.trim()) {
                      verifyTicket(manualTicketId.trim());
                      setManualTicketId("");
                    }
                  }}
                  disabled={!manualTicketId.trim()}
                  className="w-full"
                  variant="outline"
                >
                  Verify Ticket
                </Button>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4">
              <div
                id="qr-reader"
                ref={scannerRef}
                className="border-2 border-indigo-600 rounded-lg overflow-hidden"
              />
              {!scannerReady && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Initializing camera...</span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={stopScanner}
                className="w-full"
              >
                Stop Scanning
              </Button>
            </div>
          )}

          {verificationStatus === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="size-12 animate-spin text-indigo-600" />
              <p className="text-lg text-muted-foreground">
                Verifying ticket...
              </p>
            </div>
          )}

          {verificationStatus === "success" && ticketDetails && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3 text-green-600 dark:text-green-400">
                <CheckCircle className="size-16" />
                <div>
                  <h2 className="text-2xl font-bold">Valid Ticket!</h2>
                  <p className="text-sm text-muted-foreground">
                    Checked in successfully
                  </p>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Event</p>
                  <p className="font-semibold text-lg">
                    {ticketDetails.events?.name || "Unknown Event"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Attendee</p>
                  <p className="font-semibold">
                    {ticketDetails.profiles?.full_name || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {ticketDetails.profiles?.email || "No email"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Check-in Info</p>
                  <p className="text-sm">
                    Check-in count: {ticketDetails.check_in_count}
                  </p>
                  {ticketDetails.last_checked_in_at && (
                    <p className="text-sm">
                      Last checked in:{" "}
                      {new Date(
                        ticketDetails.last_checked_in_at,
                      ).toLocaleString()}
                    </p>
                  )}
                </div>

                {ticketDetails.check_in_count > 1 && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ This ticket has been checked in{" "}
                      {ticketDetails.check_in_count} times
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={resetScanner} className="w-full">
                Scan Next Ticket
              </Button>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3 text-red-600 dark:text-red-400">
                <XCircle className="size-16" />
                <div>
                  <h2 className="text-2xl font-bold">Invalid Ticket</h2>
                  <p className="text-sm text-muted-foreground">
                    Could not verify ticket
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
              </div>

              <Button onClick={resetScanner} className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Ticket check-in system for in-person events</p>
          <p className="mt-2">
            Attendees should present their QR code from their email
          </p>
        </div>

        {/* DEBUG MODE */}
        {isDev && (
          <Card className="mt-6 p-6 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-700">
            <h3 className="text-xl font-bold mb-4 text-yellow-900 dark:text-yellow-100">
              🔧 DEBUG MODE (DEV ONLY)
            </h3>
            <p className="mb-4 text-sm text-yellow-800 dark:text-yellow-200">
              Paste the QR code URL from your email to test if it extracts
              correctly
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Paste full QR URL (e.g., https://yourapp.com/admin/check-in/abc-123)"
                value={debugQrUrl}
                onChange={(e) => setDebugQrUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <Button
                onClick={testQrExtraction}
                disabled={!debugQrUrl}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                Test URL Extraction
              </Button>
              {debugResult && (
                <div
                  className={`p-4 rounded-lg ${debugResult.startsWith("✅") ? "bg-green-100 dark:bg-green-950/30 text-green-900 dark:text-green-100" : "bg-red-100 dark:bg-red-950/30 text-red-900 dark:text-red-100"}`}
                >
                  <p className="font-mono text-sm whitespace-pre-wrap">
                    {debugResult}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
