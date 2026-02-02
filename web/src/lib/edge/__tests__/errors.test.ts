import { describe, it, expect } from "vitest";
import {
  EdgeFunctionError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  isEdgeFunctionError,
} from "../errors";

describe("edge/errors", () => {
  describe("EdgeFunctionError", () => {
    it("should create an error with message", () => {
      const error = new EdgeFunctionError("Something went wrong");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EdgeFunctionError);
      expect(error.message).toBe("Something went wrong");
      expect(error.name).toBe("EdgeFunctionError");
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it("should create an error with status code", () => {
      const error = new EdgeFunctionError("Server error", 500);

      expect(error.message).toBe("Server error");
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
    });

    it("should create an error with details", () => {
      const details = { field: "email", issue: "invalid format" };
      const error = new EdgeFunctionError("Validation failed", 400, details);

      expect(error.message).toBe("Validation failed");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });
  });

  describe("AuthenticationError", () => {
    it("should create an authentication error with default message", () => {
      const error = new AuthenticationError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EdgeFunctionError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe("Authentication required");
      expect(error.name).toBe("AuthenticationError");
      expect(error.statusCode).toBe(401);
    });

    it("should create an authentication error with custom message", () => {
      const error = new AuthenticationError("Please log in");

      expect(error.message).toBe("Please log in");
      expect(error.statusCode).toBe(401);
    });
  });

  describe("AuthorizationError", () => {
    it("should create an authorization error with default message", () => {
      const error = new AuthorizationError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EdgeFunctionError);
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.message).toBe("Insufficient permissions");
      expect(error.name).toBe("AuthorizationError");
      expect(error.statusCode).toBe(403);
    });

    it("should create an authorization error with custom message", () => {
      const error = new AuthorizationError("Admin access required");

      expect(error.message).toBe("Admin access required");
      expect(error.statusCode).toBe(403);
    });
  });

  describe("NotFoundError", () => {
    it("should create a not found error with default message", () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EdgeFunctionError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe("Resource not found");
      expect(error.name).toBe("NotFoundError");
      expect(error.statusCode).toBe(404);
    });

    it("should create a not found error with custom message", () => {
      const error = new NotFoundError("Event not found");

      expect(error.message).toBe("Event not found");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("ValidationError", () => {
    it("should create a validation error without details", () => {
      const error = new ValidationError("Invalid input");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EdgeFunctionError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Invalid input");
      expect(error.name).toBe("ValidationError");
      expect(error.statusCode).toBe(400);
      expect(error.details).toBeUndefined();
    });

    it("should create a validation error with details", () => {
      const details = {
        fields: ["email", "password"],
        errors: ["Email is required", "Password too short"],
      };
      const error = new ValidationError("Validation failed", details);

      expect(error.message).toBe("Validation failed");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });
  });

  describe("isEdgeFunctionError", () => {
    it("should return true for EdgeFunctionError", () => {
      const error = new EdgeFunctionError("Test error");

      expect(isEdgeFunctionError(error)).toBe(true);
    });

    it("should return true for AuthenticationError", () => {
      const error = new AuthenticationError();

      expect(isEdgeFunctionError(error)).toBe(true);
    });

    it("should return true for AuthorizationError", () => {
      const error = new AuthorizationError();

      expect(isEdgeFunctionError(error)).toBe(true);
    });

    it("should return true for NotFoundError", () => {
      const error = new NotFoundError();

      expect(isEdgeFunctionError(error)).toBe(true);
    });

    it("should return true for ValidationError", () => {
      const error = new ValidationError("Invalid");

      expect(isEdgeFunctionError(error)).toBe(true);
    });

    it("should return false for regular Error", () => {
      const error = new Error("Regular error");

      expect(isEdgeFunctionError(error)).toBe(false);
    });

    it("should return false for non-error objects", () => {
      expect(isEdgeFunctionError({})).toBe(false);
      expect(isEdgeFunctionError("string")).toBe(false);
      expect(isEdgeFunctionError(null)).toBe(false);
      expect(isEdgeFunctionError(undefined)).toBe(false);
      expect(isEdgeFunctionError(123)).toBe(false);
    });

    it("should return false for error-like objects", () => {
      const errorLike = {
        message: "I look like an error",
        name: "EdgeFunctionError",
        statusCode: 500,
      };

      expect(isEdgeFunctionError(errorLike)).toBe(false);
    });
  });

  describe("error inheritance chain", () => {
    it("should maintain proper inheritance chain", () => {
      const authError = new AuthenticationError();

      // Check instanceof for entire chain
      expect(authError instanceof Error).toBe(true);
      expect(authError instanceof EdgeFunctionError).toBe(true);
      expect(authError instanceof AuthenticationError).toBe(true);

      // Other error types should be false
      expect(authError instanceof AuthorizationError).toBe(false);
      expect(authError instanceof NotFoundError).toBe(false);
      expect(authError instanceof ValidationError).toBe(false);
    });

    it("should allow catching base EdgeFunctionError", () => {
      const errors = [
        new AuthenticationError(),
        new AuthorizationError(),
        new NotFoundError(),
        new ValidationError("test"),
      ];

      errors.forEach((error) => {
        try {
          throw error;
        } catch (e) {
          // All should be catchable as EdgeFunctionError
          expect(e).toBeInstanceOf(EdgeFunctionError);
        }
      });
    });
  });

  describe("error serialization", () => {
    it("should include all properties in error object", () => {
      const details = { field: "email" };
      const error = new ValidationError("Invalid email", details);

      // Check that properties are accessible
      expect(error.message).toBe("Invalid email");
      expect(error.name).toBe("ValidationError");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });

    it("should preserve stack trace", () => {
      const error = new EdgeFunctionError("Test");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("EdgeFunctionError");
    });
  });
});
