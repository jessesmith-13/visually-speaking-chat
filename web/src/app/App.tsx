import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AppProviders } from "@/app/AppProviders";
import { useApp } from "@/app/hooks";
import { Header } from "@/components/layout/Header";
import { Loading } from "@/components/common/Loading";
import { validateEnv } from "@/lib/env";

// Route imports
import { LandingRoute } from "@/routes/landing/Landing.route";
import { AuthRoute } from "@/routes/auth/Auth.route";
import { EventsRoute } from "@/routes/events/Events.route";
import { EventDetailRoute } from "@/routes/events/EventDetail.route";
import { CreateEventRoute } from "@/routes/events/CreateEvent.route";
import { VideoRoomRoute } from "@/routes/video/VideoRoom.route";
import { AdminUsersRoute } from "@/routes/admin/AdminUsers.route";
import { AdminEmailRoute } from "@/routes/admin/AdminEmail.route";
import { PromoCodesRoute } from "@/routes/admin/PromoCodes.route";
import { CheckIn } from "@/routes/admin/CheckIn.route";
import { NotFoundRoute } from "@/routes/not-found/NotFound.route";

// Validate environment variables on app startup
if (!validateEnv()) {
  console.error(
    "⚠️ Application started with missing environment variables. Some features may not work correctly.",
  );
}

// Global error handler to suppress AbortErrors
if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const errorString = args.join(" ").toLowerCase();
    if (
      errorString.includes("aborterror") ||
      errorString.includes("signal is aborted") ||
      errorString.includes("aborted without reason")
    ) {
      return;
    }
    originalConsoleError(...args);
  };

  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;
    if (
      error?.name === "AbortError" ||
      error?.message?.includes("aborted") ||
      error?.message?.includes("AbortError")
    ) {
      event.preventDefault();
    }
  });
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, user } = useApp() || { loading: true, user: null };

  useEffect(() => {
    if (user && location.pathname === "/auth") {
      console.log("✅ User logged in, navigating to events page");
      navigate("/events");
    }
  }, [user, location.pathname, navigate]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {!location.pathname.startsWith("/room") && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/events" element={<EventsRoute />} />
          <Route path="/events/:eventId" element={<EventDetailRoute />} />
          <Route path="/room/:roomId" element={<VideoRoomRoute />} />
          <Route path="/create-event" element={<CreateEventRoute />} />
          <Route path="/admin/users" element={<AdminUsersRoute />} />
          <Route path="/admin/email" element={<AdminEmailRoute />} />
          <Route path="/admin/promo-codes" element={<PromoCodesRoute />} />
          <Route path="/admin/check-in" element={<CheckIn />} />
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
          <Route path="/404" element={<NotFoundRoute />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </BrowserRouter>
  );
}
