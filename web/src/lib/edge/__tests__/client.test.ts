import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { adminOperations, tickets, matchmaking, email } from "../client";

// Mock the supabase client
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
  supabaseUrl: "https://test.supabase.co",
}));

describe("edge/client", () => {
  const mockSession = {
    access_token: "mock-token-123",
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default session mock
    const { supabase } = await import("@/lib/supabase/client");
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Setup default fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("adminOperations", () => {
    describe("getAllUsers", () => {
      it("should fetch all users", async () => {
        const mockUsers = [
          { id: "1", email: "user1@test.com", full_name: "User 1" },
          { id: "2", email: "user2@test.com", full_name: "User 2" },
        ];

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers }),
        } as Response);

        const users = await adminOperations.getAllUsers();

        expect(users).toEqual(mockUsers);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/admin-operations/users",
          expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
              Authorization: "Bearer mock-token-123",
              "Content-Type": "application/json",
            }),
          }),
        );
      });

      it("should throw error when not authenticated", async () => {
        const { supabase } = await import("@/lib/supabase/client");
        vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
          data: { session: null },
          error: null,
        });

        await expect(adminOperations.getAllUsers()).rejects.toThrow(
          "No authentication token found",
        );
      });
    });

    describe("updateAdminStatus", () => {
      it("should update user admin status", async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);

        await adminOperations.updateAdminStatus("user-123", true);

        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/admin-operations/users/user-123/admin",
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify({ isAdmin: true }),
          }),
        );
      });
    });

    describe("createEvent", () => {
      it("should create a new event", async () => {
        const eventData = {
          name: "Test Event",
          description: "A test event",
          date: "2024-12-31T20:00:00Z",
          duration: 120,
          price: 2500,
          capacity: 50,
          imageUrl: "https://example.com/image.jpg",
        };

        const mockEvent = {
          id: "event-123",
          ...eventData,
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ event: mockEvent }),
        } as Response);

        const event = await adminOperations.createEvent(eventData);

        expect(event).toEqual(mockEvent);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/admin-operations/events",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify(eventData),
          }),
        );
      });
    });

    describe("updateEvent", () => {
      it("should update an event", async () => {
        const updateData = {
          name: "Updated Event Name",
          price: 3000,
        };

        const mockEvent = {
          id: "event-123",
          ...updateData,
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ event: mockEvent }),
        } as Response);

        const event = await adminOperations.updateEvent(
          "event-123",
          updateData,
        );

        expect(event).toEqual(mockEvent);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/admin-operations/events/event-123",
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify(updateData),
          }),
        );
      });
    });

    describe("cancelEvent", () => {
      it("should cancel an event", async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);

        await adminOperations.cancelEvent("event-123");

        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/admin-operations/events/event-123/cancel",
          expect.objectContaining({
            method: "DELETE",
          }),
        );
      });
    });

    describe("postEventUpdate", () => {
      it("should post an event update", async () => {
        const mockUpdate = {
          id: "update-123",
          event_id: "event-123",
          title: "Important Update",
          message: "Event time changed",
          created_at: "2024-01-01T10:00:00Z",
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ update: mockUpdate }),
        } as Response);

        const update = await adminOperations.postEventUpdate(
          "event-123",
          "Important Update",
          "Event time changed",
        );

        expect(update).toEqual(mockUpdate);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/admin-operations/events/event-123/updates",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              title: "Important Update",
              message: "Event time changed",
            }),
          }),
        );
      });
    });

    describe("getEventUpdates", () => {
      it("should get event updates without authentication", async () => {
        const mockUpdates = [
          {
            id: "update-1",
            event_id: "event-123",
            title: "Update 1",
            message: "Message 1",
            created_at: "2024-01-01T10:00:00Z",
          },
        ];

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ updates: mockUpdates }),
        } as Response);

        const updates = await adminOperations.getEventUpdates("event-123");

        expect(updates).toEqual(mockUpdates);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/admin-operations/events/event-123/updates",
          expect.objectContaining({
            method: "GET",
            headers: expect.not.objectContaining({
              Authorization: expect.anything(),
            }),
          }),
        );
      });
    });

    describe("getEventParticipants", () => {
      it("should get event participants", async () => {
        const mockParticipants = [
          {
            user_id: "user-1",
            user_email: "user1@test.com",
            user_name: "User 1",
            ticket_id: "ticket-1",
            purchased_at: "2024-01-01T10:00:00Z",
            profiles: {
              full_name: "User 1",
              email: "user1@test.com",
            },
          },
        ];

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ participants: mockParticipants }),
        } as Response);

        const participants =
          await adminOperations.getEventParticipants("event-123");

        expect(participants).toEqual(mockParticipants);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/admin-operations/events/event-123/participants",
          expect.objectContaining({
            method: "GET",
          }),
        );
      });
    });
  });

  describe("tickets", () => {
    describe("createPaymentIntent", () => {
      it("should create payment intent without promo code", async () => {
        const mockResponse = {
          sessionId: "session-123",
          checkoutUrl: "https://checkout.stripe.com/pay/session-123",
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await tickets.createPaymentIntent("event-123", 2500);

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/tickets/create-payment-intent",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              eventId: "event-123",
              amount: 2500,
              promoCodeId: undefined,
            }),
          }),
        );
      });

      it("should create payment intent with promo code", async () => {
        const mockResponse = {
          sessionId: "session-123",
          checkoutUrl: "https://checkout.stripe.com/pay/session-123",
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await tickets.createPaymentIntent(
          "event-123",
          2500,
          "promo-123",
        );

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/tickets/create-payment-intent",
          expect.objectContaining({
            body: JSON.stringify({
              eventId: "event-123",
              amount: 2500,
              promoCodeId: "promo-123",
            }),
          }),
        );
      });
    });

    describe("purchaseTicket", () => {
      it("should purchase ticket with payment intent", async () => {
        const mockTicket = {
          id: "ticket-123",
          event_id: "event-123",
          user_id: "user-123",
          amount: 2500,
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ticket: mockTicket }),
        } as Response);

        const ticket = await tickets.purchaseTicket(
          "event-123",
          2500,
          "pi_123",
        );

        expect(ticket).toEqual(mockTicket);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/tickets/purchase",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              eventId: "event-123",
              amount: 2500,
              paymentIntentId: "pi_123",
              isDemoMode: false,
            }),
          }),
        );
      });

      it("should purchase ticket in demo mode", async () => {
        const mockTicket = {
          id: "ticket-123",
          event_id: "event-123",
          user_id: "user-123",
          amount: 0,
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ticket: mockTicket }),
        } as Response);

        const ticket = await tickets.purchaseTicket(
          "event-123",
          0,
          undefined,
          true,
        );

        expect(ticket).toEqual(mockTicket);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/tickets/purchase",
          expect.objectContaining({
            body: JSON.stringify({
              eventId: "event-123",
              amount: 0,
              paymentIntentId: undefined,
              isDemoMode: true,
            }),
          }),
        );
      });
    });

    describe("cancelTicket", () => {
      it("should cancel ticket with refund", async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ refunded: true }),
        } as Response);

        const result = await tickets.cancelTicket("ticket-123");

        expect(result).toEqual({ refunded: true });
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/tickets/ticket-123/cancel",
          expect.objectContaining({
            method: "DELETE",
          }),
        );
      });
    });

    describe("getMyTickets", () => {
      it("should get user tickets", async () => {
        const mockTickets = [
          { id: "ticket-1", event_id: "event-1" },
          { id: "ticket-2", event_id: "event-2" },
        ];

        const { supabase } = await import("@/lib/supabase/client");
        vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
          data: { tickets: mockTickets },
          error: null,
        });

        const tickets_result = await tickets.getMyTickets();

        expect(tickets_result).toEqual(mockTickets);
        expect(supabase.functions.invoke).toHaveBeenCalledWith("tickets", {
          method: "GET",
          headers: {
            "x-path": "/my-tickets",
          },
        });
      });

      it("should throw error when invoke fails", async () => {
        const { supabase } = await import("@/lib/supabase/client");
        vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
          data: null,
          error: { message: "Failed to fetch" },
        });

        await expect(tickets.getMyTickets()).rejects.toThrow("Failed to fetch");
      });

      it("should throw error when no data returned", async () => {
        const { supabase } = await import("@/lib/supabase/client");
        vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
          data: null,
          error: null,
        });

        await expect(tickets.getMyTickets()).rejects.toThrow(
          "Did not receive data from the Edge Function",
        );
      });
    });
  });

  describe("matchmaking", () => {
    describe("joinQueue", () => {
      it("should join matchmaking queue", async () => {
        const mockResponse = {
          status: "waiting",
          matched: false,
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await matchmaking.joinQueue("event-123");

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/matchmaking/join",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ eventId: "event-123" }),
          }),
        );
      });

      it("should return matched status with room", async () => {
        const mockResponse = {
          status: "matched",
          matched: true,
          roomId: "room-123",
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await matchmaking.joinQueue("event-123");

        expect(result).toEqual(mockResponse);
        expect(result.roomId).toBe("room-123");
      });
    });

    describe("leaveQueue", () => {
      it("should leave matchmaking queue", async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);

        await matchmaking.leaveQueue("event-123");

        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/matchmaking/leave",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ eventId: "event-123" }),
          }),
        );
      });
    });

    describe("getStatus", () => {
      it("should get matchmaking status", async () => {
        const mockResponse = {
          status: "waiting" as const,
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await matchmaking.getStatus("event-123");

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/matchmaking/status?eventId=event-123",
          expect.objectContaining({
            method: "GET",
          }),
        );
      });
    });

    describe("requestNextMatch", () => {
      it("should request next match", async () => {
        const mockResponse = {
          matched: true,
          roomId: "room-456",
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await matchmaking.requestNextMatch("event-123");

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/matchmaking/next-match",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ eventId: "event-123" }),
          }),
        );
      });
    });

    describe("triggerMatching", () => {
      it("should trigger matching", async () => {
        const mockResponse = {
          matched: true,
          roomId: "room-789",
          users: ["user-1", "user-2"],
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await matchmaking.triggerMatching("event-123");

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/matchmaking/match-users",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ eventId: "event-123" }),
          }),
        );
      });
    });

    describe("subscribeToMatchmaking", () => {
      it("should setup real-time subscription", async () => {
        const mockChannel = {
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn(),
        };

        const { supabase } = await import("@/lib/supabase/client");
        vi.mocked(supabase.channel).mockReturnValueOnce(mockChannel as never);

        const callback = vi.fn();
        const unsubscribe = matchmaking.subscribeToMatchmaking(
          "event-123",
          "user-123",
          callback,
        );

        expect(supabase.channel).toHaveBeenCalledWith(
          "matchmaking:event-123:user-123",
        );
        expect(mockChannel.on).toHaveBeenCalledWith(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "matchmaking_queue",
            filter: "user_id=eq.user-123",
          },
          expect.any(Function),
        );
        expect(mockChannel.subscribe).toHaveBeenCalled();

        // Test cleanup
        expect(typeof unsubscribe).toBe("function");
      });

      it("should handle cleanup errors gracefully", async () => {
        const mockChannel = {
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn(),
        };

        const { supabase } = await import("@/lib/supabase/client");
        vi.mocked(supabase.channel).mockReturnValueOnce(mockChannel as never);
        vi.mocked(supabase.removeChannel).mockImplementationOnce(() => {
          throw new Error("WebSocket error");
        });

        const callback = vi.fn();
        const unsubscribe = matchmaking.subscribeToMatchmaking(
          "event-123",
          "user-123",
          callback,
        );

        // Should not throw
        expect(() => unsubscribe()).not.toThrow();
      });
    });
  });

  describe("email", () => {
    describe("sendEmail", () => {
      it("should send email to single recipient", async () => {
        const mockResponse = {
          emailsSent: 1,
          message: "Email sent successfully",
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await email.sendEmail(
          "user@test.com",
          "Test Subject",
          "Test Message",
        );

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/send-email",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              to: "user@test.com",
              subject: "Test Subject",
              message: "Test Message",
            }),
          }),
        );
      });

      it("should send email to multiple recipients", async () => {
        const mockResponse = {
          emailsSent: 3,
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await email.sendEmail(
          ["user1@test.com", "user2@test.com", "user3@test.com"],
          "Test Subject",
          "Test Message",
        );

        expect(result.emailsSent).toBe(3);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://test.supabase.co/functions/v1/send-email",
          expect.objectContaining({
            body: JSON.stringify({
              to: ["user1@test.com", "user2@test.com", "user3@test.com"],
              subject: "Test Subject",
              message: "Test Message",
            }),
          }),
        );
      });

      it("should handle partial failures", async () => {
        const mockResponse = {
          emailsSent: 2,
          failed: 1,
          errors: ["Invalid email: bad@email"],
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await email.sendEmail(
          ["user1@test.com", "user2@test.com", "bad@email"],
          "Test Subject",
          "Test Message",
        );

        expect(result.emailsSent).toBe(2);
        expect(result.failed).toBe(1);
        expect(result.errors).toEqual(["Invalid email: bad@email"]);
      });
    });
  });

  describe("error handling", () => {
    it("should throw error when response is not ok", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      } as Response);

      await expect(adminOperations.getAllUsers()).rejects.toThrow(
        "Internal server error",
      );
    });

    it("should throw error with status when text fails", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: vi.fn().mockRejectedValueOnce(new Error("Text parse error")),
      } as Response);

      await expect(adminOperations.getAllUsers()).rejects.toThrow(
        "Request failed with status 404",
      );
    });
  });

  describe("request deduplication", () => {
    it("should deduplicate identical concurrent requests", async () => {
      const mockUsers = [{ id: "1", email: "user@test.com" }];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers }),
      } as Response);

      // Make two concurrent requests
      const [result1, result2] = await Promise.all([
        adminOperations.getAllUsers(),
        adminOperations.getAllUsers(),
      ]);

      // Both should return the same data
      expect(result1).toEqual(mockUsers);
      expect(result2).toEqual(mockUsers);

      // But fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should not deduplicate sequential requests", async () => {
      const mockUsers = [{ id: "1", email: "user@test.com" }];

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers }),
        } as Response);

      // Make sequential requests
      await adminOperations.getAllUsers();
      await adminOperations.getAllUsers();

      // Fetch should be called twice
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
