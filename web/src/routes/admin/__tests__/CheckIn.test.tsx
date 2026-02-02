import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CheckIn } from "../CheckIn.route";
import { getTicketDetails, verifyAndCheckInTicket } from "@/features/admin/api";

// Mock the admin API
vi.mock("@/features/admin/api", () => ({
  getTicketDetails: vi.fn(),
  verifyAndCheckInTicket: vi.fn(),
}));

// Mock html5-qrcode
vi.mock("html5-qrcode", () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    clear: vi.fn(),
    isScanning: false,
  })),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("CheckIn", () => {
  const mockTicketDetails = {
    id: "ticket-123",
    event_id: "event-456",
    user_id: "user-789",
    check_in_count: 0,
    last_checked_in_at: null,
    events: {
      name: "Test Event",
      date: "2026-02-15T18:00:00.000Z",
      event_type: "in-person" as const,
    },
    profiles: {
      full_name: "John Doe",
      email: "john@example.com",
    },
  };

  const mockVerificationResponse = {
    success: true,
    ticket: {
      id: "ticket-123",
      user_id: "user-789",
      event_id: "event-456",
      status: "active",
      check_in_count: 1,
      last_checked_in_at: "2026-02-02T10:00:00.000Z",
    },
    message: "Ticket checked in successfully",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (ticketId?: string) => {
    const path = ticketId ? `/admin/check-in/${ticketId}` : "/admin/check-in";
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/check-in" element={<CheckIn />} />
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it("should render check-in page", () => {
    renderComponent();

    expect(screen.getByText("🎟️ Ticket Check-In")).toBeInTheDocument();
    expect(
      screen.getByText("Scan QR codes to check in attendees"),
    ).toBeInTheDocument();
  });

  it("should show Start Scanning button initially", () => {
    renderComponent();

    expect(screen.getByText("Start Scanning")).toBeInTheDocument();
  });

  it("should navigate back to admin users", () => {
    renderComponent();

    const backButton = screen.getByText("Back to Admin");
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/users");
  });

  it("should verify ticket from URL parameter", async () => {
    vi.mocked(getTicketDetails).mockResolvedValue(mockTicketDetails);
    vi.mocked(verifyAndCheckInTicket).mockResolvedValue(
      mockVerificationResponse,
    );

    // Render with ticketId in URL
    render(
      <MemoryRouter initialEntries={["/admin/check-in/ticket-123"]}>
        <Routes>
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getTicketDetails).toHaveBeenCalledWith("ticket-123");
    });

    await waitFor(() => {
      expect(verifyAndCheckInTicket).toHaveBeenCalledWith("ticket-123");
    });

    await waitFor(() => {
      expect(screen.getByText("Valid Ticket!")).toBeInTheDocument();
    });
  });

  it("should display ticket details on successful verification", async () => {
    vi.mocked(getTicketDetails).mockResolvedValue(mockTicketDetails);
    vi.mocked(verifyAndCheckInTicket).mockResolvedValue(
      mockVerificationResponse,
    );

    render(
      <MemoryRouter initialEntries={["/admin/check-in/ticket-123"]}>
        <Routes>
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Valid Ticket!")).toBeInTheDocument();
    });

    expect(screen.getByText("Test Event")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Check-in count: 1/)).toBeInTheDocument();
  });

  it("should show error message on verification failure", async () => {
    vi.mocked(getTicketDetails).mockRejectedValue(
      new Error("Ticket not found"),
    );

    render(
      <MemoryRouter initialEntries={["/admin/check-in/invalid-ticket"]}>
        <Routes>
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Invalid Ticket")).toBeInTheDocument();
    });

    expect(screen.getByText("Ticket not found")).toBeInTheDocument();
  });

  it("should show warning for multiple check-ins", async () => {
    const multipleCheckInTicket = {
      ...mockTicketDetails,
      check_in_count: 3,
      last_checked_in_at: "2026-02-02T10:00:00.000Z",
    };

    const multipleCheckInResponse = {
      ...mockVerificationResponse,
      ticket: {
        ...mockVerificationResponse.ticket,
        check_in_count: 4,
      },
    };

    vi.mocked(getTicketDetails).mockResolvedValue(multipleCheckInTicket);
    vi.mocked(verifyAndCheckInTicket).mockResolvedValue(
      multipleCheckInResponse,
    );

    render(
      <MemoryRouter initialEntries={["/admin/check-in/ticket-123"]}>
        <Routes>
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/This ticket has been checked in 4 times/),
      ).toBeInTheDocument();
    });
  });

  it("should reset scanner and navigate to base check-in route", async () => {
    vi.mocked(getTicketDetails).mockResolvedValue(mockTicketDetails);
    vi.mocked(verifyAndCheckInTicket).mockResolvedValue(
      mockVerificationResponse,
    );

    render(
      <MemoryRouter initialEntries={["/admin/check-in/ticket-123"]}>
        <Routes>
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Valid Ticket!")).toBeInTheDocument();
    });

    const scanNextButton = screen.getByText("Scan Next Ticket");
    fireEvent.click(scanNextButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/check-in");
  });

  it("should display loading state during verification", async () => {
    vi.mocked(getTicketDetails).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <MemoryRouter initialEntries={["/admin/check-in/ticket-123"]}>
        <Routes>
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Verifying ticket...")).toBeInTheDocument();
    });
  });

  it("should show Try Again button on error", async () => {
    vi.mocked(getTicketDetails).mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter initialEntries={["/admin/check-in/invalid-ticket"]}>
        <Routes>
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    const tryAgainButton = screen.getByText("Try Again");
    fireEvent.click(tryAgainButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/check-in");
  });

  it("should display formatted check-in timestamp", async () => {
    const ticketWithCheckIn = {
      ...mockTicketDetails,
      check_in_count: 1,
      last_checked_in_at: "2026-02-02T10:30:00.000Z",
    };

    const verificationWithCheckIn = {
      ...mockVerificationResponse,
      ticket: {
        ...mockVerificationResponse.ticket,
        last_checked_in_at: "2026-02-02T10:30:00.000Z",
      },
    };

    vi.mocked(getTicketDetails).mockResolvedValue(ticketWithCheckIn);
    vi.mocked(verifyAndCheckInTicket).mockResolvedValue(
      verificationWithCheckIn,
    );

    render(
      <MemoryRouter initialEntries={["/admin/check-in/ticket-123"]}>
        <Routes>
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Last checked in:/)).toBeInTheDocument();
    });
  });

  it("should show Start Scanning button when no ticket ID in URL", () => {
    renderComponent();

    const startScanningButton = screen.getByText("Start Scanning");
    expect(startScanningButton).toBeInTheDocument();
  });

  it("should handle edge case with null event name gracefully", async () => {
    const ticketWithNoEventName = {
      ...mockTicketDetails,
      events: {
        ...mockTicketDetails.events,
        name: "" as string,
      },
    };

    vi.mocked(getTicketDetails).mockResolvedValue(ticketWithNoEventName);
    vi.mocked(verifyAndCheckInTicket).mockResolvedValue(
      mockVerificationResponse,
    );

    render(
      <MemoryRouter initialEntries={["/admin/check-in/ticket-123"]}>
        <Routes>
          <Route path="/admin/check-in/:ticketId" element={<CheckIn />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Valid Ticket!")).toBeInTheDocument();
    });
  });
});
