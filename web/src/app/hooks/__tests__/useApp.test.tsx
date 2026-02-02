import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useApp } from "../useApp";
import { AppContextProvider } from "@/app/contexts/AppProvider";
import { ReactNode } from "react";

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

describe("useApp", () => {
  it("should return default values and warn when used outside AppProvider", () => {
    // Suppress console.warn for this test
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useApp());

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "useApp called without AppProvider (likely during hot-reload)",
    );
    expect(result.current.user).toBeNull();
    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(true);

    consoleWarnSpy.mockRestore();
  });

  it("should return context value when used inside AppProvider", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppContextProvider>{children}</AppContextProvider>
    );

    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("events");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("setUser");
    expect(result.current).toHaveProperty("addEvent");
    expect(result.current).toHaveProperty("removeEvent");
    expect(result.current).toHaveProperty("purchaseTicket");
    expect(result.current).toHaveProperty("currentEvent");
    expect(result.current).toHaveProperty("setCurrentEvent");
    expect(result.current).toHaveProperty("refreshUserTickets");
    expect(result.current).toHaveProperty("refreshEvents");
  });

  it("should provide function methods", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppContextProvider>{children}</AppContextProvider>
    );

    const { result } = renderHook(() => useApp(), { wrapper });

    expect(typeof result.current.setUser).toBe("function");
    expect(typeof result.current.addEvent).toBe("function");
    expect(typeof result.current.removeEvent).toBe("function");
    expect(typeof result.current.purchaseTicket).toBe("function");
    expect(typeof result.current.setCurrentEvent).toBe("function");
    expect(typeof result.current.refreshUserTickets).toBe("function");
    expect(typeof result.current.refreshEvents).toBe("function");
  });
});
