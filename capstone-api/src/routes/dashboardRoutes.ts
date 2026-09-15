import { NextFunction, Request, Response, Router } from "express";
import { protect } from "../middleware/auth";
import { Claim } from "../models/Claim";
import { Policy } from "../models/Policy";
import { User } from "../models/User";

const router = Router();

// Dashboard endpoints require authentication.
router.use(protect);

// Return aggregated KPI-style dashboard data and most recent claims.
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalClaims,
      claimsByStatusRaw,
      totalPolicies,
      policiesByTypeRaw,
      totalUsers,
      claimTotals,
      recentClaims
    ] = await Promise.all([
      Claim.countDocuments(),
      Claim.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Policy.countDocuments(),
      Policy.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
      User.countDocuments(),
      Claim.aggregate([{ $group: { _id: null, totalClaimAmount: { $sum: "$amount" } } }]),
      Claim.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("policy", "policyNumber holderName type")
        .populate("assignedTo", "name email role")
    ]);

    const claimsByStatus = claimsByStatusRaw.reduce<Record<string, number>>((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const policiesByType = policiesByTypeRaw.reduce<Record<string, number>>((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.status(200).json({
      totalClaims,
      claimsByStatus,
      totalPolicies,
      policiesByType,
      totalUsers,
      recentClaims,
      totalClaimAmount: claimTotals[0]?.totalClaimAmount || 0
    });
  } catch (error) {
    next(error);
  }
});

export default router;
