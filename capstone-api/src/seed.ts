import mongoose from "mongoose";
import { connectDB } from "./config/db";
import { Claim } from "./models/Claim";
import { Counter } from "./models/Counter";
import { Policy } from "./models/Policy";
import { User } from "./models/User";

const seed = async (): Promise<void> => {
  try {
    await connectDB();

    await Promise.all([
      Claim.deleteMany({}),
      Policy.deleteMany({}),
      User.deleteMany({}),
      Counter.deleteMany({})
    ]);

    const admin = await User.create({
      name: "Ava Admin",
      email: "ava.admin@example.com",
      password: "AdminPass123!",
      role: "admin"
    });

    const adjusterOne = await User.create({
      name: "Liam Adjuster",
      email: "liam.adjuster@example.com",
      password: "AdjusterPass123!",
      role: "adjuster"
    });

    const adjusterTwo = await User.create({
      name: "Noah Adjuster",
      email: "noah.adjuster@example.com",
      password: "AdjusterPass456!",
      role: "adjuster"
    });

    const policies = await Policy.insertMany([
      {
        policyNumber: "POL-AUTO-1001",
        holderName: "Emma Thompson",
        type: "auto",
        premium: 1200,
        status: "active",
        effectiveDate: new Date("2026-01-01"),
        expirationDate: new Date("2027-01-01"),
        owner: admin._id
      },
      {
        policyNumber: "POL-HOME-1002",
        holderName: "Olivia Martin",
        type: "home",
        premium: 1800,
        status: "active",
        effectiveDate: new Date("2026-02-15"),
        expirationDate: new Date("2027-02-15"),
        owner: adjusterOne._id
      },
      {
        policyNumber: "POL-LIFE-1003",
        holderName: "Ethan Walker",
        type: "life",
        premium: 950,
        status: "expired",
        effectiveDate: new Date("2024-05-01"),
        expirationDate: new Date("2025-05-01"),
        owner: adjusterTwo._id
      },
      {
        policyNumber: "POL-AUTO-1004",
        holderName: "Sophia Reed",
        type: "auto",
        premium: 1100,
        status: "canceled",
        effectiveDate: new Date("2025-03-01"),
        expirationDate: new Date("2026-03-01"),
        owner: admin._id
      },
      {
        policyNumber: "POL-HOME-1005",
        holderName: "Mason Brooks",
        type: "home",
        premium: 2100,
        status: "active",
        effectiveDate: new Date("2026-04-10"),
        expirationDate: new Date("2027-04-10"),
        owner: adjusterOne._id
      },
      {
        policyNumber: "POL-LIFE-1006",
        holderName: "Isabella Hayes",
        type: "life",
        premium: 1025,
        status: "active",
        effectiveDate: new Date("2026-05-01"),
        expirationDate: new Date("2027-05-01"),
        owner: adjusterTwo._id
      },
      {
        policyNumber: "POL-AUTO-1007",
        holderName: "Lucas Bennett",
        type: "auto",
        premium: 1340,
        status: "active",
        effectiveDate: new Date("2026-06-12"),
        expirationDate: new Date("2027-06-12"),
        owner: admin._id
      },
      {
        policyNumber: "POL-HOME-1008",
        holderName: "Mia Carter",
        type: "home",
        premium: 2250,
        status: "expired",
        effectiveDate: new Date("2024-09-01"),
        expirationDate: new Date("2025-09-01"),
        owner: adjusterOne._id
      },
      {
        policyNumber: "POL-LIFE-1009",
        holderName: "James Foster",
        type: "life",
        premium: 1180,
        status: "active",
        effectiveDate: new Date("2026-07-20"),
        expirationDate: new Date("2027-07-20"),
        owner: adjusterTwo._id
      },
      {
        policyNumber: "POL-AUTO-1010",
        holderName: "Charlotte Price",
        type: "auto",
        premium: 1425,
        status: "canceled",
        effectiveDate: new Date("2025-10-10"),
        expirationDate: new Date("2026-10-10"),
        owner: admin._id
      },
      {
        policyNumber: "POL-HOME-1011",
        holderName: "Benjamin Scott",
        type: "home",
        premium: 1995,
        status: "active",
        effectiveDate: new Date("2026-08-15"),
        expirationDate: new Date("2027-08-15"),
        owner: adjusterOne._id
      },
      {
        policyNumber: "POL-LIFE-1012",
        holderName: "Amelia Turner",
        type: "life",
        premium: 875,
        status: "expired",
        effectiveDate: new Date("2024-11-01"),
        expirationDate: new Date("2025-11-01"),
        owner: adjusterTwo._id
      },
      {
        policyNumber: "POL-AUTO-1013",
        holderName: "Henry Coleman",
        type: "auto",
        premium: 1560,
        status: "active",
        effectiveDate: new Date("2026-09-05"),
        expirationDate: new Date("2027-09-05"),
        owner: admin._id
      }
    ]);

    const claimStatuses = ["submitted", "under-review", "approved", "denied", "closed"] as const;
    type ClaimStatusSeed = (typeof claimStatuses)[number];

    const claimStatusDistribution: ClaimStatusSeed[] = [
      ...Array.from({ length: 8 }, () => "submitted" as const),
      ...Array.from({ length: 5 }, () => "under-review" as const),
      ...Array.from({ length: 4 }, () => "approved" as const),
      ...Array.from({ length: 2 }, () => "denied" as const),
      ...Array.from({ length: 6 }, () => "closed" as const)
    ];

    const claimDescriptions = [
      "Rear-end collision at traffic signal.",
      "Storm-related roof damage.",
      "Life policy payout request.",
      "Windshield replacement claim.",
      "Kitchen water leak remediation.",
      "Minor bumper scratch from parking lot incident.",
      "Hail damage to vehicle hood and roof.",
      "Basement flooding after heavy rain.",
      "Fence and shed damage from windstorm.",
      "Fire and smoke cleanup for garage.",
      "Slip-and-fall medical reimbursement claim.",
      "Electrical surge damaged home appliances.",
      "Theft of personal property from vehicle.",
      "Tree branch fell on parked car.",
      "Pipe burst caused living room water damage.",
      "Vandalism to exterior walls and windows.",
      "Minor collision in low-speed intersection turn.",
      "Temporary housing reimbursement request.",
      "Vehicle side mirror replacement after impact.",
      "Roof shingle replacement after hail event.",
      "Garage door damage from backing collision.",
      "Water heater leak and flooring replacement.",
      "Broken window and interior weather damage.",
      "Multi-vehicle accident with injury documentation.",
      "Claim for recovered stolen property repairs."
    ];

    if (claimStatusDistribution.length !== claimDescriptions.length) {
      throw new Error("Claim status distribution must match claim descriptions length.");
    }

    const claimSeedData = claimDescriptions.map((description, index) => {
      const status = claimStatusDistribution[index];
      const assignedTo = index % 2 === 0 ? adjusterOne._id : adjusterTwo._id;
      const incidentDate = new Date(Date.UTC(2026, 0, 5 + index * 5, 14, 30));
      const noteDate = new Date(incidentDate.getTime() + 2 * 24 * 60 * 60 * 1000);

      const statusNoteText: Record<(typeof claimStatuses)[number], string> = {
        submitted: "Claim submitted and awaiting adjuster triage.",
        "under-review": "Supporting documents requested for review.",
        approved: "Coverage confirmed and payment approved.",
        denied: "Claim denied based on policy terms and review findings.",
        closed: "Claim finalized and closed after settlement."
      };

      return {
        policy: policies[index % policies.length]._id,
        description,
        incidentDate,
        amount: 900 + (index + 1) * 475 + (index % 3) * 125,
        status,
        assignedTo,
        notes:
          status === "submitted"
            ? []
            : [
                {
                  author: status === "approved" || status === "closed" ? admin._id : assignedTo,
                  text: statusNoteText[status],
                  createdAt: noteDate
                }
              ]
      };
    });

    await Claim.create(claimSeedData);

    const [userCount, policyCount, claimCount] = await Promise.all([
      User.countDocuments(),
      Policy.countDocuments(),
      Claim.countDocuments()
    ]);

    console.log("Seeding complete");
    console.log({ userCount, policyCount, claimCount });
  } catch (error) {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

void seed();
