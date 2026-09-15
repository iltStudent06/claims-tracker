import { Router } from "express";
import { authorizeRoles, protect } from "../middleware/auth";
import { User } from "../models/User";

const router = Router();

// User-management endpoints are restricted to authenticated admins.
router.use(protect, authorizeRoles("admin"));

// List all users for admin management views.
router.get("/", async (_req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});

export default router;
