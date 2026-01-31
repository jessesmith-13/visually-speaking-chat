import { describe, it, expect, vi, beforeEach } from "vitest";
import * as api from "../api";
import { callEdgeFunction } from "@/lib/edge/client";

// Mock the edge client
vi.mock("@/lib/edge/client", () => ({
  callEdgeFunction: vi.fn(),
}));

describe("Matchmaking API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("joinQueue", () => {
    it("should call edge function with correct parameters", async () => {
      const mockResponse = {
        status: "waiting",
        matched: false,
      };

      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.joinQueue("event-123");

      expect(callEdgeFunction).toHaveBeenCalledWith("matchmaking", "/join", {
        method: "POST",
        body: { eventId: "event-123" },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should return matched status with roomId when matched", async () => {
      const mockResponse = {
        status: "matched",
        matched: true,
        roomId: "room-456",
      };

      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.joinQueue("event-123");

      expect(result).toEqual(mockResponse);
      expect(result.matched).toBe(true);
      expect(result.roomId).toBe("room-456");
    });

    it("should handle errors from edge function", async () => {
      const error = new Error("Failed to join queue");
      vi.mocked(callEdgeFunction).mockRejectedValue(error);

      await expect(api.joinQueue("event-123")).rejects.toThrow(
        "Failed to join queue",
      );
    });
  });

  describe("leaveQueue", () => {
    it("should call edge function with correct parameters", async () => {
      vi.mocked(callEdgeFunction).mockResolvedValue(undefined);

      await api.leaveQueue("event-123");

      expect(callEdgeFunction).toHaveBeenCalledWith("matchmaking", "/leave", {
        method: "POST",
        body: { eventId: "event-123" },
      });
    });

    it("should handle errors from edge function", async () => {
      const error = new Error("Failed to leave queue");
      vi.mocked(callEdgeFunction).mockRejectedValue(error);

      await expect(api.leaveQueue("event-123")).rejects.toThrow(
        "Failed to leave queue",
      );
    });
  });

  describe("getMatchmakingStatus", () => {
    it("should return waiting status", async () => {
      const mockResponse = {
        status: "waiting" as const,
      };

      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.getMatchmakingStatus("event-123");

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "matchmaking",
        "/status?eventId=event-123",
      );
      expect(result).toEqual(mockResponse);
      expect(result.status).toBe("waiting");
    });

    it("should return matched status with roomId", async () => {
      const mockResponse = {
        status: "matched" as const,
        roomId: "room-789",
      };

      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.getMatchmakingStatus("event-123");

      expect(result).toEqual(mockResponse);
      expect(result.status).toBe("matched");
      expect(result.roomId).toBe("room-789");
    });

    it("should return not_in_queue status", async () => {
      const mockResponse = {
        status: "not_in_queue" as const,
      };

      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.getMatchmakingStatus("event-123");

      expect(result).toEqual(mockResponse);
      expect(result.status).toBe("not_in_queue");
    });

    it("should handle errors from edge function", async () => {
      const error = new Error("Failed to get status");
      vi.mocked(callEdgeFunction).mockRejectedValue(error);

      await expect(api.getMatchmakingStatus("event-123")).rejects.toThrow(
        "Failed to get status",
      );
    });
  });

  describe("requestNextMatch", () => {
    it("should return matched response with roomId", async () => {
      const mockResponse = {
        matched: true,
        roomId: "room-999",
      };

      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.requestNextMatch("event-123");

      expect(callEdgeFunction).toHaveBeenCalledWith(
        "matchmaking",
        "/next-match",
        {
          method: "POST",
          body: { eventId: "event-123" },
        },
      );
      expect(result).toEqual(mockResponse);
      expect(result.matched).toBe(true);
      expect(result.roomId).toBe("room-999");
    });

    it("should return not matched response", async () => {
      const mockResponse = {
        matched: false,
      };

      vi.mocked(callEdgeFunction).mockResolvedValue(mockResponse);

      const result = await api.requestNextMatch("event-123");

      expect(result).toEqual(mockResponse);
      expect(result.matched).toBe(false);
      expect(result.roomId).toBeUndefined();
    });

    it("should handle errors from edge function", async () => {
      const error = new Error("Failed to request next match");
      vi.mocked(callEdgeFunction).mockRejectedValue(error);

      await expect(api.requestNextMatch("event-123")).rejects.toThrow(
        "Failed to request next match",
      );
    });
  });
});
