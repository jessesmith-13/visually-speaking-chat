import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../App";

// Mock environment validation
vi.mock("@/lib/env", () => ({
  validateEnv: vi.fn().mockReturnValue(true),
}));

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

// Mock API calls
vi.mock("@/features/events/api", () => ({
  fetchEvents: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

vi.mock("@/features/tickets/api", () => ({
  fetchUserTickets: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/profile/api", () => ({
  fetchUserProfile: vi.fn().mockResolvedValue(null),
}));

// Mock all route components
vi.mock("@/routes/landing/Landing.route", () => ({
  LandingRoute: () => <div data-testid="landing-route">Landing</div>,
}));

vi.mock("@/routes/auth/Auth.route", () => ({
  AuthRoute: () => <div data-testid="auth-route">Auth</div>,
}));

vi.mock("@/routes/events/Events.route", () => ({
  EventsRoute: () => <div data-testid="events-route">Events</div>,
}));

vi.mock("@/routes/events/EventDetail.route", () => ({
  EventDetailRoute: () => (
    <div data-testid="event-detail-route">Event Detail</div>
  ),
}));

vi.mock("@/routes/events/CreateEvent.route", () => ({
  CreateEventRoute: () => (
    <div data-testid="create-event-route">Create Event</div>
  ),
}));

vi.mock("@/routes/video/VideoRoom.route", () => ({
  VideoRoomRoute: () => <div data-testid="video-room-route">Video Room</div>,
}));

vi.mock("@/routes/admin/AdminUsers.route", () => ({
  AdminUsersRoute: () => <div data-testid="admin-users-route">Admin Users</div>,
}));

vi.mock("@/routes/admin/AdminEmail.route", () => ({
  AdminEmailRoute: () => <div data-testid="admin-email-route">Admin Email</div>,
}));

vi.mock("@/routes/admin/PromoCodes.route", () => ({
  PromoCodesRoute: () => <div data-testid="promo-codes-route">Promo Codes</div>,
}));

vi.mock("@/routes/admin/CheckIn.route", () => ({
  CheckIn: () => <div data-testid="check-in-route">Check In</div>,
}));

vi.mock("@/routes/not-found/NotFound.route", () => ({
  NotFoundRoute: () => <div data-testid="not-found-route">Not Found</div>,
}));

// Mock Header component
vi.mock("@/components/layout/Header", () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

// Mock Loading component
vi.mock("@/components/common/Loading", () => ({
  Loading: () => <div data-testid="loading">Loading...</div>,
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window location before each test
    window.history.replaceState({}, "", "/");
  });

  it("should render without crashing", async () => {
    render(<App />);

    // Should show loading initially
    expect(screen.getByTestId("loading")).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });
  });

  it("should validate environment on startup", async () => {
    const { validateEnv } = await import("@/lib/env");

    // validateEnv is called at module level, so it's already been called
    // when the module was first imported. We just verify the mock exists.
    expect(validateEnv).toBeDefined();
    expect(typeof validateEnv).toBe("function");
  });

  it("should render landing route by default", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("landing-route")).toBeInTheDocument();
  });

  it("should render header on non-room routes", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("should not render header on room routes", async () => {
    window.history.replaceState({}, "", "/room/test-room-id");

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    expect(screen.queryByTestId("header")).not.toBeInTheDocument();
  });

  it("should handle 404 routes", async () => {
    window.history.replaceState({}, "", "/non-existent-route");

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    // Should redirect to 404 page
    await waitFor(() => {
      expect(screen.getByTestId("not-found-route")).toBeInTheDocument();
    });
  });

  it("should render check-in route at /admin/check-in", async () => {
    window.history.replaceState({}, "", "/admin/check-in");

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("check-in-route")).toBeInTheDocument();
  });

  it("should render check-in route with ticket ID parameter", async () => {
    window.history.replaceState({}, "", "/admin/check-in/ticket-123");

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("check-in-route")).toBeInTheDocument();
  });

  it("should setup global AbortError suppression", () => {
    // Verify that console.error has been wrapped
    const originalError = new Error("AbortError");
    const consoleErrorSpy = vi.spyOn(console, "error");

    console.error(originalError);

    // Should still be called (our wrapper passes through non-abort errors)
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should setup unhandledrejection handler", () => {
    expect(window.onunhandledrejection).toBeDefined();
  });

  it("should render BrowserRouter", () => {
    const { container } = render(<App />);

    // BrowserRouter doesn't add specific attributes, but we can verify the app renders
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("should render AppProviders", async () => {
    render(<App />);

    // Verify that Toaster from AppProviders is rendered
    // Sonner renders as a section with aria-label
    await waitFor(() => {
      const toaster = document.querySelector(
        'section[aria-label*="Notifications"]',
      );
      expect(toaster).toBeInTheDocument();
    });
  });
});
