import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMatchmaking } from "../hooks";
import * as api from "../api";

// Mock the API
vi.mock("../api", () => ({
  joinQueue: vi.fn(),
  leaveQueue: vi.fn(),
  getMatchmakingStatus: vi.fn(),
  requestNextMatch: vi.fn(),
}));

describe("useMatchmaking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with correct default values", () => {
      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.inQueue).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it("should provide all expected methods", () => {
      const { result } = renderHook(() => useMatchmaking());

      expect(typeof result.current.joinQueue).toBe("function");
      expect(typeof result.current.leaveQueue).toBe("function");
      expect(typeof result.current.getMatchmakingStatus).toBe("function");
      expect(typeof result.current.requestNextMatch).toBe("function");
    });
  });

  describe("joinQueue", () => {
    it("should set loading state and call API", async () => {
      const mockResponse = {
        status: "waiting",
        matched: false,
      };

      vi.mocked(api.joinQueue).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMatchmaking());

      expect(result.current.loading).toBe(false);
      expect(result.current.inQueue).toBe(false);

      const promise = act(async () => {
        await result.current.joinQueue("event-123");
      });

      await promise;

      expect(api.joinQueue).toHaveBeenCalledWith("event-123");
      expect(result.current.inQueue).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it("should reset loading state even on error", async () => {
      vi.mocked(api.joinQueue).mockRejectedValue(new Error("Failed to join"));

      const { result } = renderHook(() => useMatchmaking());

      await act(async () => {
        try {
          await result.current.joinQueue("event-123");
        } catch {
          // Expected error
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.inQueue).toBe(false);
    });
  });

  describe("leaveQueue", () => {
    it("should set loading state and call API", async () => {
      vi.mocked(api.leaveQueue).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMatchmaking());

      // First join the queue
      const mockJoinResponse = {
        status: "waiting",
        matched: false,
      };

      vi.mocked(api.joinQueue).mockResolvedValue(mockJoinResponse);

      await act(async () => {
        await result.current.joinQueue("event-123");
      });

      expect(result.current.inQueue).toBe(true);

      // Then leave
      await act(async () => {
        await result.current.leaveQueue("event-123");
      });

      expect(api.leaveQueue).toHaveBeenCalledWith("event-123");
      expect(result.current.inQueue).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it("should reset loading state even on error", async () => {
      vi.mocked(api.leaveQueue).mockRejectedValue(new Error("Failed to leave"));

      const { result } = renderHook(() => useMatchmaking());

      await act(async () => {
        try {
          await result.current.leaveQueue("event-123");
        } catch {
          // Expected error
        }
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("getMatchmakingStatus", () => {
    it("should set loading state and call API", async () => {
      const mockStatus = {
        status: "waiting" as const,
      };

      vi.mocked(api.getMatchmakingStatus).mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useMatchmaking());

      let statusResult:
        | { status: "waiting" | "matched" | "not_in_queue"; roomId?: string }
        | undefined;
      await act(async () => {
        statusResult = await result.current.getMatchmakingStatus("event-123");
      });

      expect(api.getMatchmakingStatus).toHaveBeenCalledWith("event-123");
      expect(statusResult).toEqual(mockStatus);
      expect(result.current.loading).toBe(false);
    });

    it("should return matched status with roomId", async () => {
      const mockStatus = {
        status: "matched" as const,
        roomId: "room-456",
      };

      vi.mocked(api.getMatchmakingStatus).mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useMatchmaking());

      let statusResult:
        | { status: "waiting" | "matched" | "not_in_queue"; roomId?: string }
        | undefined;
      await act(async () => {
        statusResult = await result.current.getMatchmakingStatus("event-123");
      });

      expect(statusResult).toEqual(mockStatus);
      expect(statusResult?.status).toBe("matched");
      expect(statusResult?.roomId).toBe("room-456");
    });

    it("should reset loading state even on error", async () => {
      vi.mocked(api.getMatchmakingStatus).mockRejectedValue(
        new Error("Failed to get status"),
      );

      const { result } = renderHook(() => useMatchmaking());

      await act(async () => {
        try {
          await result.current.getMatchmakingStatus("event-123");
        } catch {
          // Expected error
        }
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("requestNextMatch", () => {
    it("should set loading state and call API", async () => {
      const mockResponse = {
        matched: true,
        roomId: "room-789",
      };

      vi.mocked(api.requestNextMatch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMatchmaking());

      let matchResult: { matched: boolean; roomId?: string } | undefined;
      await act(async () => {
        matchResult = await result.current.requestNextMatch("event-123");
      });

      expect(api.requestNextMatch).toHaveBeenCalledWith("event-123");
      expect(matchResult).toEqual(mockResponse);
      expect(result.current.loading).toBe(false);
    });

    it("should return not matched response", async () => {
      const mockResponse = {
        matched: false,
      };

      vi.mocked(api.requestNextMatch).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMatchmaking());

      let matchResult: { matched: boolean; roomId?: string } | undefined;
      await act(async () => {
        matchResult = await result.current.requestNextMatch("event-123");
      });

      expect(matchResult).toEqual(mockResponse);
      expect(matchResult?.matched).toBe(false);
    });

    it("should reset loading state even on error", async () => {
      vi.mocked(api.requestNextMatch).mockRejectedValue(
        new Error("Failed to request match"),
      );

      const { result } = renderHook(() => useMatchmaking());

      await act(async () => {
        try {
          await result.current.requestNextMatch("event-123");
        } catch {
          // Expected error
        }
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("loading state transitions", () => {
    it("should handle multiple operations correctly", async () => {
      const mockJoinResponse = {
        status: "waiting",
        matched: false,
      };
      const mockStatusResponse = {
        status: "waiting" as const,
      };

      vi.mocked(api.joinQueue).mockResolvedValue(mockJoinResponse);
      vi.mocked(api.getMatchmakingStatus).mockResolvedValue(mockStatusResponse);
      vi.mocked(api.leaveQueue).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMatchmaking());

      // Join queue
      await act(async () => {
        await result.current.joinQueue("event-123");
      });

      expect(result.current.inQueue).toBe(true);
      expect(result.current.loading).toBe(false);

      // Check status
      await act(async () => {
        await result.current.getMatchmakingStatus("event-123");
      });

      expect(result.current.loading).toBe(false);

      // Leave queue
      await act(async () => {
        await result.current.leaveQueue("event-123");
      });

      expect(result.current.inQueue).toBe(false);
      expect(result.current.loading).toBe(false);
    });
  });
});
