import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import policyRoutes from "./policyRoutes";
import claimRoutes from "./claimRoutes";
import dashboardRoutes from "./dashboardRoutes";

const router = Router();

// Lightweight health check used by deployment/runtime probes.
router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Mount feature routers under the /api namespace.
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/policies", policyRoutes);
router.use("/claims", claimRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
