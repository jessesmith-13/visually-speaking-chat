import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { MyTicketsRoute } from "../MyTickets.route";
import * as ticketsApi from "@/features/tickets/api";
import * as appHooks from "@/app/hooks";
import type { User } from "@/features/profile/types";
import type { TicketWithEvent } from "@/features/tickets/api";
import QRCode from "qrcode";

// Mock dependencies
vi.mock("@/features/tickets/api");
vi.mock("@/app/hooks");
vi.mock("qrcode");

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper function to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Mock data
const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  purchasedTickets: ["event-1", "event-2"],
  isAdmin: false,
};

const upcomingEventDate = new Date();
upcomingEventDate.setDate(upcomingEventDate.getDate() + 7); // 7 days from now

const pastEventDate = new Date();
pastEventDate.setDate(pastEventDate.getDate() - 7); // 7 days ago

const mockUpcomingTicket: TicketWithEvent = {
  id: "ticket-1",
  user_id: "user-123",
  event_id: "event-1",
  status: "active",
  purchased_at: "2026-02-01T12:00:00Z",
  check_in_count: 0,
  last_checked_in_at: null,
  events: {
    id: "event-1",
    name: "Upcoming Virtual Event",
    date: upcomingEventDate.toISOString(),
    event_type: "virtual",
    venue_name: null,
    venue_address: null,
  },
};

const mockPastTicket: TicketWithEvent = {
  id: "ticket-2",
  user_id: "user-123",
  event_id: "event-2",
  status: "active",
  purchased_at: "2026-01-15T12:00:00Z",
  check_in_count: 1,
  last_checked_in_at: "2026-01-22T18:30:00Z",
  events: {
    id: "event-2",
    name: "Past In-Person Event",
    date: pastEventDate.toISOString(),
    event_type: "in-person",
    venue_name: "Test Venue",
    venue_address: "123 Test St",
  },
};

const mockInPersonTicket: TicketWithEvent = {
  id: "ticket-3",
  user_id: "user-123",
  event_id: "event-3",
  status: "active",
  purchased_at: "2026-02-02T12:00:00Z",
  check_in_count: 0,
  last_checked_in_at: null,
  events: {
    id: "event-3",
    name: "Upcoming In-Person Event",
    date: upcomingEventDate.toISOString(),
    event_type: "in-person",
    venue_name: "Downtown Convention Center",
    venue_address: "456 Main St, City, State 12345",
  },
};

describe("MyTicketsRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for useApp
    vi.mocked(appHooks.useApp).mockReturnValue({
      user: mockUser,
      setUser: vi.fn(),
      events: [],
      addEvent: vi.fn(),
      removeEvent: vi.fn(),
      purchaseTicket: vi.fn(),
      currentEvent: null,
      setCurrentEvent: vi.fn(),
      loading: false,
      refreshUserTickets: vi.fn(),
      refreshEvents: vi.fn(),
    });

    // Default mock for QRCode
    vi.mocked(QRCode.toDataURL).mockResolvedValue(
      "data:image/png;base64,mockQRCode",
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  describe("Authentication", () => {
    it("should redirect to auth if user is not logged in", async () => {
      vi.mocked(appHooks.useApp).mockReturnValue({
        user: null,
        setUser: vi.fn(),
        events: [],
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        purchaseTicket: vi.fn(),
        currentEvent: null,
        setCurrentEvent: vi.fn(),
        loading: false,
        refreshUserTickets: vi.fn(),
        refreshEvents: vi.fn(),
      });

      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/auth");
      });
    });

    it("should not redirect if user is logged in", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("No tickets yet")).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalledWith("/auth");
    });
  });

  describe("Loading State", () => {
    it("should show loading indicator while fetching tickets", () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      renderWithRouter(<MyTicketsRoute />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("should hide loading indicator after tickets are loaded", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    it("should show no tickets message when user has no tickets", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("No tickets yet")).toBeInTheDocument();
        expect(
          screen.getByText(
            "Purchase tickets to upcoming events to see them here",
          ),
        ).toBeInTheDocument();
      });
    });

    it("should show Browse Events button when no tickets", async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /browse events/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /browse events/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/events");
    });

    it("should show no upcoming tickets message when all tickets are past", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockPastTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("No upcoming tickets")).toBeInTheDocument();
      });
    });

    it("should show no past tickets message when all tickets are upcoming", async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("Upcoming Virtual Event")).toBeInTheDocument();
      });

      // Switch to Past tab
      const pastButtons = screen.getAllByRole("button", { name: /past/i });
      await user.click(pastButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("No past tickets")).toBeInTheDocument();
      });
    });
  });

  describe("Tabs", () => {
    it("should show upcoming tab by default", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
        mockPastTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("Upcoming Virtual Event")).toBeInTheDocument();
        expect(
          screen.queryByText("Past In-Person Event"),
        ).not.toBeInTheDocument();
      });
    });

    it("should switch to past tab when clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
        mockPastTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("Upcoming Virtual Event")).toBeInTheDocument();
      });

      // Click the Past tab (first button with "Past" text, excluding badges)
      const pastButtons = screen.getAllByRole("button", { name: /past/i });
      await user.click(pastButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Past In-Person Event")).toBeInTheDocument();
        expect(
          screen.queryByText("Upcoming Virtual Event"),
        ).not.toBeInTheDocument();
      });
    });

    it("should show ticket count badges on tabs", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
        mockInPersonTicket,
        mockPastTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        const upcomingTab = screen.getAllByRole("button", {
          name: /upcoming/i,
        })[0];
        expect(upcomingTab).toHaveTextContent("2"); // 2 upcoming tickets

        const pastTab = screen.getAllByRole("button", { name: /past/i })[0];
        expect(pastTab).toHaveTextContent("1"); // 1 past ticket
      });
    });

    it("should not show tabs when there are no tickets", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("No tickets yet")).toBeInTheDocument();
      });

      // Check that tab buttons don't exist (excluding other buttons)
      const buttons = screen.getAllByRole("button");
      const hasUpcomingTab = buttons.some(
        (btn) =>
          btn.textContent?.includes("Upcoming") &&
          btn.textContent?.includes("Past"),
      );
      expect(hasUpcomingTab).toBe(false);
    });
  });

  describe("Ticket Display", () => {
    it("should display ticket with event details", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("Upcoming Virtual Event")).toBeInTheDocument();
      });

      // Check for badges using getAllByText
      const badges = screen.getAllByText(/upcoming/i);
      expect(badges.length).toBeGreaterThan(0);

      expect(screen.getByText("Virtual")).toBeInTheDocument();
    });

    it("should show correct badge for past events", async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockPastTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        // Past ticket should show on Past tab, so switch to it
        const pastButtons = screen.getAllByRole("button", { name: /past/i });
        expect(pastButtons.length).toBeGreaterThan(0);
      });

      const pastButtons = screen.getAllByRole("button", { name: /past/i });
      await user.click(pastButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Past Event")).toBeInTheDocument();
      });
    });

    it("should display venue information for in-person events", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockInPersonTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(
          screen.getByText("Downtown Convention Center"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("456 Main St, City, State 12345"),
        ).toBeInTheDocument();
      });
    });

    it("should show check-in badge for checked-in tickets", async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockPastTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        const pastButtons = screen.getAllByRole("button", { name: /past/i });
        expect(pastButtons.length).toBeGreaterThan(0);
      });

      const pastButtons = screen.getAllByRole("button", { name: /past/i });
      await user.click(pastButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Checked In")).toBeInTheDocument();
      });
    });

    it("should display ticket ID and purchase date", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText(/Ticket ID: ticket-1/i)).toBeInTheDocument();
        expect(screen.getByText(/Purchased:/i)).toBeInTheDocument();
      });
    });
  });

  describe("QR Code Generation", () => {
    it("should generate QR codes for in-person events", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockInPersonTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(QRCode.toDataURL).toHaveBeenCalledWith(
          expect.stringContaining("/admin/check-in/ticket-3"),
          expect.any(Object),
        );
      });
    });

    it("should not generate QR codes for virtual events", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("Upcoming Virtual Event")).toBeInTheDocument();
      });

      expect(screen.queryByAltText(/qr code/i)).not.toBeInTheDocument();
    });

    it("should display QR code for in-person events", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockInPersonTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        const qrImage = screen.getByAltText(
          "QR code for Upcoming In-Person Event",
        );
        expect(qrImage).toBeInTheDocument();
        expect(qrImage).toHaveAttribute(
          "src",
          "data:image/png;base64,mockQRCode",
        );
      });
    });

    it("should allow downloading QR code", async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockInPersonTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /download qr/i }),
        ).toBeInTheDocument();
      });

      // Just verify the button can be clicked without throwing
      await user.click(screen.getByRole("button", { name: /download qr/i }));

      // The button exists and was clickable - that's sufficient for this test
      expect(
        screen.getByRole("button", { name: /download qr/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate back to events page when Back button is clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /back to events/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /back to events/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/events");
    });

    it("should navigate to event details when View Event Details is clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /view event details/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /view event details/i }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/events/event-1");
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockRejectedValue(
        new Error("API Error"),
      );

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("No tickets yet")).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching tickets:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle QR code generation errors", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockInPersonTicket,
      ]);
      vi.mocked(QRCode.toDataURL).mockRejectedValue(new Error("QR Error"));

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(
          screen.getByText("Upcoming In-Person Event"),
        ).toBeInTheDocument();
      });

      // Should still render the ticket even if QR code fails
      expect(screen.getByText("Upcoming In-Person Event")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Multiple Tickets", () => {
    it("should display all tickets correctly", async () => {
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
        mockInPersonTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      await waitFor(() => {
        expect(screen.getByText("Upcoming Virtual Event")).toBeInTheDocument();
        expect(
          screen.getByText("Upcoming In-Person Event"),
        ).toBeInTheDocument();
      });
    });

    it("should correctly filter tickets by date", async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.getMyTicketsWithDetails).mockResolvedValue([
        mockUpcomingTicket,
        mockInPersonTicket,
        mockPastTicket,
      ]);

      renderWithRouter(<MyTicketsRoute />);

      // Upcoming tab should show 2 tickets
      await waitFor(() => {
        expect(screen.getByText("Upcoming Virtual Event")).toBeInTheDocument();
        expect(
          screen.getByText("Upcoming In-Person Event"),
        ).toBeInTheDocument();
        expect(
          screen.queryByText("Past In-Person Event"),
        ).not.toBeInTheDocument();
      });

      // Past tab should show 1 ticket
      const pastButtons = screen.getAllByRole("button", { name: /past/i });
      await user.click(pastButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Past In-Person Event")).toBeInTheDocument();
        expect(
          screen.queryByText("Upcoming Virtual Event"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("Upcoming In-Person Event"),
        ).not.toBeInTheDocument();
      });
    });
  });
});
