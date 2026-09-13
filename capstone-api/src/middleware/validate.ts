import { NextFunction, Request, Response, RequestHandler } from "express";
import { ValidationChain, validationResult } from "express-validator";

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
