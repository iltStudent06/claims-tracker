import { NextFunction, Request, Response, Router } from "express";
import { body, param, query } from "express-validator";
import { protect } from "../middleware/auth";
import { validateRequest } from "../middleware/validate";
import { Policy, PolicyType } from "../models/Policy";

const router = Router();

const normalizePolicyStatus = (value: unknown): unknown =>
  value === "canceled" ? "cancelled" : value;

const policyTypeSegment: Record<PolicyType, string> = {
  auto: "AUTO",
  home: "HOME",
  life: "LIFE"
};

const getPolicySequenceMax = async (typeSegment: string): Promise<number> => {
  const maxSequenceResult = await Policy.db
    .collection<{ policyNumber?: string }>("policies")
    .aggregate<{ maxSequence: number }>([
      {
        $project: {
          seq: {
            $cond: [
              {
                $regexMatch: {
                  input: "$policyNumber",
                  regex: new RegExp(`^POL-${typeSegment}-\\d+$`)
                }
              },
              { $toInt: { $arrayElemAt: [{ $split: ["$policyNumber", "-"] }, 2] } },
              null
            ]
          }
        }
      },
      { $match: { seq: { $ne: null } } },
      { $group: { _id: null, maxSequence: { $max: "$seq" } } }
    ])
    .toArray();

  return maxSequenceResult[0]?.maxSequence ?? 1000;
};

const generatePolicyNumber = async (type: PolicyType): Promise<string> => {
  const countersCollection = Policy.db.collection<{
    _id: string;
    key?: string;
    sequenceValue: number;
  }>("counters");
  const typeSegment = policyTypeSegment[type];
  const counterKey = `policyNumber:${type}`;

  await countersCollection.updateOne(
    { _id: counterKey, key: { $exists: false } },
    { $set: { key: counterKey } }
  );

  const maxSequence = await getPolicySequenceMax(typeSegment);

  await countersCollection.updateOne(
    { key: counterKey },
    { $setOnInsert: { key: counterKey, sequenceValue: 1000 } },
    { upsert: true }
  );

  await countersCollection.updateOne({ key: counterKey }, { $max: { sequenceValue: maxSequence } });

  const counter = await countersCollection.findOneAndUpdate(
    { key: counterKey },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: "after" }
  );

  if (!counter) {
    throw new Error("Failed to generate policy number");
  }

  return `POL-${typeSegment}-${counter.sequenceValue}`;
};

// All policy endpoints require an authenticated user.
router.use(protect);

// List policies with optional filters and pagination metadata.
router.get(
  "/",
  validateRequest([
    query("type").optional().isIn(["auto", "home", "life"]),
    query("status")
      .optional()
      .customSanitizer(normalizePolicyStatus)
      .isIn(["active", "expired", "cancelled"]),
    query("search").optional().isString(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 })
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);

      const filters: Record<string, unknown> = {};
      if (req.query.type) {
        filters.type = req.query.type;
      }
      if (req.query.status) {
        if (req.query.status === "cancelled") {
          filters.status = { $in: ["cancelled", "canceled"] };
        } else {
          filters.status = req.query.status;
        }
      }
      if (req.query.search) {
        const search = String(req.query.search).trim();
        filters.$or = [
          { holderName: { $regex: search, $options: "i" } },
          { policyNumber: { $regex: search, $options: "i" } }
        ];
      }

      const [data, total] = await Promise.all([
        Policy.find(filters)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        Policy.countDocuments(filters)
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

// Get a single policy by id with owner details.
router.get(
  "/:id",
  validateRequest([param("id").isMongoId().withMessage("Invalid policy id.")]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const policy = await Policy.findById(req.params.id).populate("owner", "name email role");

      if (!policy) {
        res.status(404).json({ message: "Policy not found." });
        return;
      }

      res.status(200).json(policy);
    } catch (error) {
      next(error);
    }
  }
);

// Create a policy owned by the authenticated user.
router.post(
  "/",
  validateRequest([
    body("holderName").trim().notEmpty().withMessage("Holder name is required."),
    body("type").isIn(["auto", "home", "life"]).withMessage("Invalid policy type."),
    body("premium").isFloat({ min: 0 }).withMessage("Premium must be a non-negative number."),
    body("status")
      .optional()
      .customSanitizer(normalizePolicyStatus)
      .isIn(["active", "expired", "cancelled"]),
    body("effectiveDate").isISO8601().withMessage("Effective date is required."),
    body("expirationDate").isISO8601().withMessage("Expiration date is required.")
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.body.type as PolicyType;
      let policy;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const generatedPolicyNumber = await generatePolicyNumber(type);

        try {
          policy = await Policy.create({
            ...req.body,
            policyNumber: generatedPolicyNumber,
            owner: req.user!._id
          });
          break;
        } catch (createError) {
          const isDuplicateKey =
            typeof createError === "object" &&
            createError !== null &&
            "code" in createError &&
            (createError as { code?: number }).code === 11000;

          if (!isDuplicateKey || attempt === 2) {
            throw createError;
          }
        }
      }

      if (!policy) {
        throw new Error("Failed to create policy");
      }

      res.status(201).json(policy);
    } catch (error) {
      next(error);
    }
  }
);

// Update policy fields while enforcing schema validators.
router.put(
  "/:id",
  validateRequest([
    param("id").isMongoId().withMessage("Invalid policy id."),
    body("policyNumber").optional().trim().notEmpty(),
    body("holderName").optional().trim().notEmpty(),
    body("type").optional().isIn(["auto", "home", "life"]),
    body("premium").optional().isFloat({ min: 0 }),
    body("status")
      .optional()
      .customSanitizer(normalizePolicyStatus)
      .isIn(["active", "expired", "cancelled"]),
    body("effectiveDate").optional().isISO8601(),
    body("expirationDate").optional().isISO8601()
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updates = { ...req.body } as Record<string, unknown>;
      delete updates.owner;

      const policy = await Policy.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true
      });

      if (!policy) {
        res.status(404).json({ message: "Policy not found." });
        return;
      }

      res.status(200).json(policy);
    } catch (error) {
      next(error);
    }
  }
);

// Delete a policy by id.
router.delete(
  "/:id",
  validateRequest([param("id").isMongoId().withMessage("Invalid policy id.")]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const policy = await Policy.findByIdAndDelete(req.params.id);

      if (!policy) {
        res.status(404).json({ message: "Policy not found." });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
