import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User, UserRole } from "../models/User";

// JWT payload shape used by this API.
type JwtPayload = {
  userId: string;
};

// Authentication middleware:
// - reads Bearer token from Authorization header
// - verifies token signature and expiry
// - loads the user and attaches it to req.user
// - returns 401 for missing/invalid/expired tokens
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Not authorized. Missing token." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.jwtSecret as jwt.Secret) as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ message: "Not authorized. Invalid token." });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Not authorized. Token expired." });
      return;
    }

    res.status(401).json({ message: "Not authorized. Invalid token." });
  }
};

// Authorization middleware factory:
// - accepts allowed roles
// - blocks requests from unauthenticated users or disallowed roles
// - returns 403 when access is forbidden
export const authorizeRoles =
  (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }
    next();
  };
