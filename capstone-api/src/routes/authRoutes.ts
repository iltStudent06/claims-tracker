import { NextFunction, Request, Response, Router } from "express";
import { body } from "express-validator";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { protect } from "../middleware/auth";
import { validateRequest } from "../middleware/validate";
import { User, UserRole } from "../models/User";

const router = Router();

const generateToken = (userId: string): string =>
  jwt.sign({ userId }, env.jwtSecret as jwt.Secret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"]
  });

router.post(
  "/register",
  validateRequest([
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, role } = req.body as {
        name: string;
        email: string;
        password: string;
        role?: UserRole;
      };

      const existing = await User.findOne({ email });
      if (existing) {
        res.status(409).json({ message: "Email already in use." });
        return;
      }

      const user = await User.create({ name, email, password, role });
      const token = generateToken(user._id.toString());

      res.status(201).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/login",
  validateRequest([
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string };

      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        res.status(401).json({ message: "Invalid credentials." });
        return;
      }

      const validPassword = await user.comparePassword(password);
      if (!validPassword) {
        res.status(401).json({ message: "Invalid credentials." });
        return;
      }

      const token = generateToken(user._id.toString());
      res.status(200).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/me", protect, async (req, res, next) => {
  try {
    res.status(200).json({
      user: req.user
    });
  } catch (error) {
    next(error);
  }
});

export default router;
