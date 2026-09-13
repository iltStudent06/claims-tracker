import { Router } from "express";
import { authorizeRoles, protect } from "../middleware/auth";
import { User } from "../models/User";

const router = Router();

router.use(protect, authorizeRoles("admin"));

router.get("/", async (_req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});

export default router;
