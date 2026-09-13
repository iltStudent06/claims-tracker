import { NextFunction, Request, Response, Router } from "express";
import { body, param, query } from "express-validator";
import { protect } from "../middleware/auth";
import { validateRequest } from "../middleware/validate";
import { Claim, ClaimStatus } from "../models/Claim";
import { Policy } from "../models/Policy";

const router = Router();

router.use(protect);

router.get(
  "/",
  validateRequest([
    query("status").optional().isIn(["submitted", "under-review", "approved", "denied", "closed"]),
    query("policy").optional().isMongoId(),
    query("assignedTo").optional().isMongoId(),
    query("search").optional().isString(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 })
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);

      const filters: Record<string, unknown> = {};
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.policy) {
        filters.policy = req.query.policy;
      }
      if (req.query.assignedTo) {
        filters.assignedTo = req.query.assignedTo;
      }
      if (req.query.search) {
        const search = String(req.query.search).trim();
        filters.$or = [
          { claimNumber: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } }
        ];
      }

      const [data, total] = await Promise.all([
        Claim.find(filters)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("policy", "policyNumber holderName type status")
          .populate("assignedTo", "name email role"),
        Claim.countDocuments(filters)
      ]);

      res.status(200).json({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [byStatus, totals] = await Promise.all([
      Claim.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      Claim.aggregate([
        {
          $group: {
            _id: null,
            totalClaimAmount: { $sum: "$amount" },
            totalClaims: { $sum: 1 }
          }
        }
      ])
    ]);

    const countByStatus = byStatus.reduce<Record<string, number>>((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.status(200).json({
      countByStatus,
      totalClaimAmount: totals[0]?.totalClaimAmount || 0,
      totalClaims: totals[0]?.totalClaims || 0
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id",
  validateRequest([param("id").isMongoId().withMessage("Invalid claim id.")]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const claim = await Claim.findById(req.params.id)
        .populate("policy", "policyNumber holderName type status")
        .populate("assignedTo", "name email role")
        .populate("notes.author", "name email role");

      if (!claim) {
        res.status(404).json({ message: "Claim not found." });
        return;
      }

      res.status(200).json(claim);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  validateRequest([
    body("policy").isMongoId().withMessage("Policy id is required."),
    body("description").trim().notEmpty().withMessage("Description is required."),
    body("incidentDate").isISO8601().withMessage("Incident date is required."),
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be a non-negative number."),
    body("status").optional().isIn(["submitted", "under-review", "approved", "denied", "closed"])
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Not authorized." });
        return;
      }

      const existingPolicy = await Policy.findById(req.body.policy);
      if (!existingPolicy) {
        res.status(404).json({ message: "Policy not found." });
        return;
      }

      const claim = await Claim.create({
        policy: req.body.policy,
        description: req.body.description,
        incidentDate: req.body.incidentDate,
        amount: req.body.amount,
        status: req.body.status,
        assignedTo: req.user._id
      });

      const populated = await Claim.findById(claim._id)
        .populate("policy", "policyNumber holderName type status")
        .populate("assignedTo", "name email role");

      res.status(201).json(populated);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/:id",
  validateRequest([
    param("id").isMongoId().withMessage("Invalid claim id."),
    body("policy").optional().isMongoId(),
    body("description").optional().trim().notEmpty(),
    body("incidentDate").optional().isISO8601(),
    body("amount").optional().isFloat({ min: 0 }),
    body("status").optional().isIn(["submitted", "under-review", "approved", "denied", "closed"]),
    body("assignedTo").optional().isMongoId()
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.policy) {
        const existingPolicy = await Policy.findById(req.body.policy);
        if (!existingPolicy) {
          res.status(404).json({ message: "Policy not found." });
          return;
        }
      }

      const claim = await Claim.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      })
        .populate("policy", "policyNumber holderName type status")
        .populate("assignedTo", "name email role")
        .populate("notes.author", "name email role");

      if (!claim) {
        res.status(404).json({ message: "Claim not found." });
        return;
      }

      res.status(200).json(claim);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/notes",
  validateRequest([
    param("id").isMongoId().withMessage("Invalid claim id."),
    body("text").trim().notEmpty().withMessage("Note text is required.")
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Not authorized." });
        return;
      }

      const claim = await Claim.findById(req.params.id);
      if (!claim) {
        res.status(404).json({ message: "Claim not found." });
        return;
      }

      claim.notes.push({
        author: req.user._id,
        text: req.body.text,
        createdAt: new Date()
      });

      await claim.save();

      const populatedClaim = await Claim.findById(claim.id)
        .populate("policy", "policyNumber holderName type status")
        .populate("assignedTo", "name email role")
        .populate("notes.author", "name email role");

      res.status(201).json(populatedClaim);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  validateRequest([param("id").isMongoId().withMessage("Invalid claim id.")]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const claim = await Claim.findByIdAndDelete(req.params.id);

      if (!claim) {
        res.status(404).json({ message: "Claim not found." });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
