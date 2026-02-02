import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AdminEmailRoute } from "../AdminEmail.route";
import { adminOperations, email } from "@/lib/edge/client";
import * as appHooks from "@/app/hooks";

// Mock the edge client
vi.mock("@/lib/edge/client", () => ({
  adminOperations: {
    getAllUsers: vi.fn(),
  },
  email: {
    sendEmail: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

// Mock app hooks
vi.mock("@/app/hooks", () => ({
  useApp: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("AdminEmailRoute", () => {
  const mockUsers = [
    {
      id: "user-1",
      email: "user1@example.com",
      full_name: "User One",
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "user-2",
      email: "user2@example.com",
      full_name: "User Two",
      created_at: "2026-01-02T00:00:00.000Z",
    },
    {
      id: "user-3",
      email: "user3@example.com",
      full_name: null,
      created_at: "2026-01-03T00:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(appHooks.useApp).mockReturnValue({
      user: { id: "admin-1", email: "admin@example.com", isAdmin: true },
      events: [],
      tickets: [],
      loading: false,
      refreshData: vi.fn(),
    } as ReturnType<typeof appHooks.useApp>);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AdminEmailRoute />
      </BrowserRouter>,
    );
  };

  it("should render admin email page for admin users", async () => {
    vi.mocked(adminOperations.getAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Email Users")).toBeInTheDocument();
    });

    expect(screen.getByText("Select Recipients")).toBeInTheDocument();
    expect(screen.getByText("Compose Email")).toBeInTheDocument();
  });

  it("should redirect non-admin users", () => {
    vi.mocked(appHooks.useApp).mockReturnValue({
      user: { id: "user-1", email: "user@example.com", isAdmin: false },
      events: [],
      tickets: [],
      loading: false,
      refreshData: vi.fn(),
    } as ReturnType<typeof appHooks.useApp>);

    renderComponent();

    expect(screen.getByText("Admin access required")).toBeInTheDocument();
  });

  it("should load and display users", async () => {
    vi.mocked(adminOperations.getAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    expect(screen.getByText("User Two")).toBeInTheDocument();
    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
    expect(screen.getByText("user2@example.com")).toBeInTheDocument();
  });

  it("should handle user selection", async () => {
    vi.mocked(adminOperations.getAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    // Initially 0 selected
    expect(screen.getByText("0 Selected")).toBeInTheDocument();

    // Click on first user
    const firstUserCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(firstUserCheckbox);

    await waitFor(() => {
      expect(screen.getByText("1 Selected")).toBeInTheDocument();
    });
  });

  it('should select all users when clicking "Select All"', async () => {
    vi.mocked(adminOperations.getAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    await waitFor(() => {
      expect(screen.getByText("3 Selected")).toBeInTheDocument();
    });
  });

  it('should deselect all users when clicking "Deselect All"', async () => {
    vi.mocked(adminOperations.getAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    // Select all first
    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    await waitFor(() => {
      expect(screen.getByText("3 Selected")).toBeInTheDocument();
    });

    // Then deselect all
    const deselectAllButton = screen.getByText("Deselect All");
    fireEvent.click(deselectAllButton);

    await waitFor(() => {
      expect(screen.getByText("0 Selected")).toBeInTheDocument();
    });
  });

  it("should send email successfully", async () => {
    vi.mocked(adminOperations.getAllUsers).mockResolvedValue(mockUsers);
    vi.mocked(email.sendEmail).mockResolvedValue({ emailsSent: 2 });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    // Select users
    const firstUserCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(firstUserCheckbox);
    const secondUserCheckbox = screen.getAllByRole("checkbox")[1];
    fireEvent.click(secondUserCheckbox);

    // Fill in email form
    const subjectInput = screen.getByPlaceholderText("Enter email subject");
    const messageInput = screen.getByPlaceholderText(
      "Enter your message here...",
    );

    fireEvent.change(subjectInput, { target: { value: "Test Subject" } });
    fireEvent.change(messageInput, {
      target: { value: "Test message content" },
    });

    // Send email
    const sendButton = screen.getByText(/Send to 2 User/);
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(email.sendEmail).toHaveBeenCalledWith(
        ["user1@example.com", "user2@example.com"],
        "Test Subject",
        "Test message content",
      );
    });
  });

  it("should display error when no users selected", async () => {
    vi.mocked(adminOperations.getAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    // Fill in subject and message but don't select users
    const subjectInput = screen.getByPlaceholderText("Enter email subject");
    const messageInput = screen.getByPlaceholderText(
      "Enter your message here...",
    );

    fireEvent.change(subjectInput, { target: { value: "Test Subject" } });
    fireEvent.change(messageInput, { target: { value: "Test message" } });

    // Try to send (button should be disabled, but test the handler logic)
    const sendButton = screen.getByText(/Send to 0 User/);
    expect(sendButton).toBeDisabled();
  });

  it("should handle users with no name gracefully", async () => {
    vi.mocked(adminOperations.getAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("No Name")).toBeInTheDocument();
    });
  });

  it("should display loading state", () => {
    vi.mocked(adminOperations.getAllUsers).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderComponent();

    expect(screen.getByText("Loading users...")).toBeInTheDocument();
  });

  it("should handle API errors gracefully", async () => {
    const { toast } = await import("sonner");
    vi.mocked(adminOperations.getAllUsers).mockRejectedValue(
      new Error("Network error"),
    );

    renderComponent();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load users"),
      );
    });
  });
});
