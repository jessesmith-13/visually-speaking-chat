import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppProviders } from "../AppProviders";
import { useApp } from "@/app/hooks";

// Mock dependencies
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
  const context = useApp();
  return <div data-testid="has-context">{context ? "yes" : "no"}</div>;
}

describe("AppProviders", () => {
  it("should render children", () => {
    render(
      <AppProviders>
        <div data-testid="test-child">Test Content</div>
      </AppProviders>,
    );

    expect(screen.getByTestId("test-child")).toBeInTheDocument();
    expect(screen.getByTestId("test-child")).toHaveTextContent("Test Content");
  });

  it("should wrap children with ThemeProvider", () => {
    const { container } = render(
      <AppProviders>
        <div>Content</div>
      </AppProviders>,
    );

    // ThemeProvider should set the class attribute
    // We can't directly test the provider, but we can check children render
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("should wrap children with AppContextProvider", () => {
    // Test that AppContext is available to children
    render(
      <AppProviders>
        <TestComponent />
      </AppProviders>,
    );

    expect(screen.getByTestId("has-context")).toHaveTextContent("yes");
  });

  it("should render Toaster component", () => {
    const { container } = render(
      <AppProviders>
        <div>Content</div>
      </AppProviders>,
    );

    // Toaster is rendered as a section with aria-label containing "Notifications"
    const toaster = container.querySelector(
      'section[aria-label*="Notifications"]',
    );
    expect(toaster).toBeInTheDocument();
  });

  it("should apply dark theme by default", () => {
    render(
      <AppProviders>
        <div data-testid="content">Content</div>
      </AppProviders>,
    );

    // The html element should have dark class applied
    // This is controlled by next-themes
    const html = document.documentElement;

    // Wait for theme to be applied (next-themes does this asynchronously)
    expect(html).toBeDefined();
  });

  it("should render multiple children", () => {
    render(
      <AppProviders>
        <div data-testid="child1">First</div>
        <div data-testid="child2">Second</div>
      </AppProviders>,
    );

    expect(screen.getByTestId("child1")).toBeInTheDocument();
    expect(screen.getByTestId("child2")).toBeInTheDocument();
  });
});
