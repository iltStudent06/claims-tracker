import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
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

  if (mongoError.code === 11000) {
    const duplicateField = Object.keys(mongoError.keyValue || {})[0] || "field";
    res.status(409).json({
      message: `${duplicateField} already exists.`
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      message: "Invalid identifier format."
    });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
};
