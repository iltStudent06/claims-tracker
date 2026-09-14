import { NextFunction, Request, Response, RequestHandler } from "express";
import { ValidationChain, validationResult } from "express-validator";

// Reusable request validation middleware factory:
// - receives an array of express-validator chains
// - runs the chains before route handlers
// - returns 400 with validation details when checks fail
export const validateRequest = (validations: ValidationChain[]): RequestHandler[] => [
  ...validations,
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        message: "Validation failed.",
        errors: errors.array()
      });
      return;
    }

    next();
  }
];
