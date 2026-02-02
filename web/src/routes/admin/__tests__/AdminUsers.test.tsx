import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AdminUsersRoute } from "../AdminUsers.route";
import { fetchAllUsers, toggleAdminStatus } from "@/features/admin/api";

// Mock the admin API
vi.mock("@/features/admin/api", () => ({
  fetchAllUsers: vi.fn(),
  toggleAdminStatus: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("AdminUsersRoute", () => {
  const mockUsers = [
    {
      id: "user-1",
      email: "user1@example.com",
      full_name: "User One",
      is_admin: false,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "user-2",
      email: "admin@example.com",
      full_name: "Admin User",
      is_admin: true,
      created_at: "2026-01-02T00:00:00.000Z",
    },
    {
      id: "user-3",
      email: "user3@example.com",
      full_name: null,
      is_admin: false,
      created_at: "2026-01-03T00:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AdminUsersRoute />
      </BrowserRouter>,
    );
  };

  it("should render user management page", async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });

    expect(
      screen.getByText("View and manage all registered users"),
    ).toBeInTheDocument();
  });

  it("should load and display all users", async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("should display user count badge", async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("3 Total Users")).toBeInTheDocument();
    });
  });

  it("should display admin badge for admin users", async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      const adminBadges = screen.getAllByText("Admin");
      expect(adminBadges.length).toBeGreaterThan(0);
    });
  });

  it("should filter users by search query", async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by email or name...",
    );
    fireEvent.change(searchInput, { target: { value: "user1" } });

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
      expect(screen.queryByText("Admin User")).not.toBeInTheDocument();
    });
  });

  it('should show "No users match your search" when no results', async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by email or name...",
    );
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(
        screen.getByText("No users match your search"),
      ).toBeInTheDocument();
    });
  });

  it("should toggle admin status successfully", async () => {
    const { toast } = await import("sonner");
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);
    vi.mocked(toggleAdminStatus).mockResolvedValue();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    const makeAdminButton = screen.getAllByText("Make Admin")[0];
    fireEvent.click(makeAdminButton);

    await waitFor(() => {
      expect(toggleAdminStatus).toHaveBeenCalledWith("user-1", true);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Admin status updated!");
    });
  });

  it("should revert UI on toggle admin error", async () => {
    const { toast } = await import("sonner");
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);
    vi.mocked(toggleAdminStatus).mockRejectedValue(
      new Error("Permission denied"),
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User One")).toBeInTheDocument();
    });

    const makeAdminButton = screen.getAllByText("Make Admin")[0];
    fireEvent.click(makeAdminButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to update admin status"),
      );
    });
  });

  it("should navigate to admin tools", async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });

    const emailButton = screen.getByText("Send Email");
    fireEvent.click(emailButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/email");
  });

  it("should navigate to promo codes", async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });

    const promoCodesButton = screen.getByText("Promo Codes");
    fireEvent.click(promoCodesButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/promo-codes");
  });

  it("should navigate to check-in", async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });

    const checkInButton = screen.getByText("Check-In");
    fireEvent.click(checkInButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/check-in");
  });

  it("should copy all emails to clipboard", async () => {
    const { toast } = await import("sonner");
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });

    const copyEmailsButton = screen.getByText("Copy All Emails");
    fireEvent.click(copyEmailsButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "user1@example.com, admin@example.com, user3@example.com",
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      "All emails copied to clipboard!",
    );
  });

  it("should export users as CSV", async () => {
    const { toast } = await import("sonner");
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    // Store original createElement
    const originalCreateElement = document.createElement.bind(document);

    // Mock URL and DOM manipulation
    const mockUrl = "blob:mock-url";
    global.URL.createObjectURL = vi.fn(() => mockUrl);
    const mockClick = vi.fn();
    const mockAnchor = {
      href: "",
      download: "",
      click: mockClick,
      style: {},
      setAttribute: vi.fn(),
      removeAttribute: vi.fn(),
    };

    // Mock createElement to return mock anchor only for 'a' tags
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "a") {
          return mockAnchor as unknown as HTMLElement;
        }
        return originalCreateElement(tagName);
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });

    const exportButton = screen.getByText("Export as CSV");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled();
    });

    expect(toast.success).toHaveBeenCalledWith("User data exported!");
    expect(mockAnchor.download).toBe("visuallyspeaking-users.csv");

    // Clean up the spy
    createElementSpy.mockRestore();
  });

  it("should display loading state", () => {
    vi.mocked(fetchAllUsers).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderComponent();

    expect(screen.getByText("Loading users...")).toBeInTheDocument();
  });

  it("should handle API errors gracefully", async () => {
    const { toast } = await import("sonner");
    vi.mocked(fetchAllUsers).mockRejectedValue(new Error("Network error"));

    renderComponent();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load users"),
      );
    });
  });

  it("should handle users with no name", async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("No Name")).toBeInTheDocument();
    });
  });

  it("should navigate back to events", async () => {
    vi.mocked(fetchAllUsers).mockResolvedValue(mockUsers);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });

    const backButton = screen.getByText("Back to Events");
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/events");
  });
});
