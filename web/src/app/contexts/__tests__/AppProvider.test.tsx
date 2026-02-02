import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppContextProvider } from "../AppProvider";
import { useApp } from "@/app/hooks/useApp";

// Create mock functions using vi.hoisted() so they're available during hoisting
const { mockUnsubscribe, mockGetSession, mockOnAuthStateChange } = vi.hoisted(
  () => ({
    mockUnsubscribe: vi.fn(),
    mockGetSession: vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    mockOnAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  }),
);

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

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

// Test component that uses the context
function TestComponent() {
  const { user, events, loading } = useApp();
  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "loaded"}</div>
      <div data-testid="user">{user ? user.email : "no user"}</div>
      <div data-testid="events">{events.length}</div>
    </div>
  );
}

describe("AppProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default state
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render children", () => {
    render(
      <AppContextProvider>
        <div data-testid="child">Test Child</div>
      </AppContextProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("should provide context values", async () => {
    render(
      <AppContextProvider>
        <TestComponent />
      </AppContextProvider>,
    );

    // Initially loading
    expect(screen.getByTestId("loading")).toHaveTextContent("loading");

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    // Check initial values
    expect(screen.getByTestId("user")).toHaveTextContent("no user");
    expect(screen.getByTestId("events")).toHaveTextContent("0");
  });

  it("should initialize with loading state", () => {
    render(
      <AppContextProvider>
        <TestComponent />
      </AppContextProvider>,
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("loading");
  });

  it("should call fetchEvents on mount", async () => {
    const { fetchEvents } = await import("@/features/events/api");

    render(
      <AppContextProvider>
        <TestComponent />
      </AppContextProvider>,
    );

    await waitFor(() => {
      expect(fetchEvents).toHaveBeenCalled();
    });
  });

  it("should set loading to false after initialization", async () => {
    render(
      <AppContextProvider>
        <TestComponent />
      </AppContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });
  });

  it("should unsubscribe from auth changes on unmount", async () => {
    const { unmount } = render(
      <AppContextProvider>
        <TestComponent />
      </AppContextProvider>,
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
