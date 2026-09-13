import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import policyRoutes from "./policyRoutes";
import claimRoutes from "./claimRoutes";
import dashboardRoutes from "./dashboardRoutes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/policies", policyRoutes);
router.use("/claims", claimRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
