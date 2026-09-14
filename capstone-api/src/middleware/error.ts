import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

// Fallback handler for unknown routes.
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

// Centralized error middleware:
// - maps known Mongoose errors to safe HTTP responses
// - keeps responses user-friendly
// - avoids leaking stack traces to clients
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // ValidationError: return field-level validation messages.
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.entries(err.errors).reduce<Record<string, string>>((acc, [field, value]) => {
      acc[field] = value.message;
      return acc;
    }, {});

    res.status(400).json({
      message: "Validation failed.",
      errors
    });
    return;
  }

  const mongoError = err as Error & {
    code?: number;
    keyValue?: Record<string, unknown>;
  };

  // Duplicate key error (e.g., unique index violation).
  if (mongoError.code === 11000) {
    const duplicateField = Object.keys(mongoError.keyValue || {})[0] || "field";
    res.status(409).json({
      message: `${duplicateField} already exists.`
    });
    return;
  }

  // CastError: malformed ObjectId or incompatible type conversion.
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      message: "Invalid identifier format."
    });
    return;
  }

  // Unknown/unhandled errors: return a generic 500 response.
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
};
