import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names correctly", () => {
      const result = cn("px-2 py-1", "px-4");

      // tailwind-merge should merge px-2 and px-4, keeping only px-4
      expect(result).toBe("py-1 px-4");
    });

    it("should handle conditional classes", () => {
      const isActive = true;
      const result = cn("base-class", isActive && "active-class");

      expect(result).toBe("base-class active-class");
    });

    it("should filter out falsy values", () => {
      const result = cn("base-class", false, null, undefined, "other-class");

      expect(result).toBe("base-class other-class");
    });

    it("should handle empty input", () => {
      const result = cn();

      expect(result).toBe("");
    });

    it("should handle arrays of classes", () => {
      const result = cn(["class-1", "class-2"], "class-3");

      expect(result).toBe("class-1 class-2 class-3");
    });

    it("should handle objects with boolean values", () => {
      const result = cn({
        "class-1": true,
        "class-2": false,
        "class-3": true,
      });

      expect(result).toBe("class-1 class-3");
    });

    it("should merge conflicting Tailwind classes correctly", () => {
      // Test various Tailwind class conflicts
      const result = cn("bg-red-500 text-lg p-4", "bg-blue-500 text-xl p-2");

      // Should keep the last value for each property
      expect(result).toBe("bg-blue-500 text-xl p-2");
    });

    it("should handle complex conditional combinations", () => {
      const isActive = true;
      const isDisabled = false;
      const size = "large";

      const result = cn(
        "base-class",
        isActive && "active",
        isDisabled && "disabled",
        size === "large" && "text-lg",
      );

      expect(result).toBe("base-class active text-lg");
    });

    it("should merge responsive classes", () => {
      const result = cn("px-2 md:px-4", "px-3 md:px-6");

      // Should keep the last value for each breakpoint
      expect(result).toBe("px-3 md:px-6");
    });

    it("should handle mixed input types", () => {
      const result = cn(
        "base",
        ["array-class-1", "array-class-2"],
        { "object-class": true, "false-class": false },
        undefined,
        "final-class",
      );

      expect(result).toBe(
        "base array-class-1 array-class-2 object-class final-class",
      );
    });

    it("should merge conflicting utilities but preserve non-conflicting duplicates", () => {
      // tailwind-merge merges conflicting utilities, not identical classes
      const result = cn("px-2 my-class px-4");

      // px-4 overrides px-2, but my-class appears once
      expect(result).toBe("my-class px-4");
    });

    it("should handle important modifier on same utility", () => {
      const result = cn("!text-red-500", "!text-blue-500");

      // Important modifier on same utility - last one wins
      expect(result).toBe("!text-blue-500");
    });

    it("should handle arbitrary values", () => {
      const result = cn("text-[14px]", "text-[16px]");

      // Should keep the last arbitrary value
      expect(result).toBe("text-[16px]");
    });

    it("should merge hover and focus variants", () => {
      const result = cn(
        "hover:bg-red-500 focus:bg-red-500",
        "hover:bg-blue-500",
      );

      expect(result).toBe("focus:bg-red-500 hover:bg-blue-500");
    });

    it("should handle dark mode classes", () => {
      const result = cn(
        "bg-white dark:bg-black",
        "bg-gray-100 dark:bg-gray-900",
      );

      expect(result).toBe("bg-gray-100 dark:bg-gray-900");
    });
  });
});
