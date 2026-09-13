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
        policyNumber: "pol-1001",
        holderName: "Emma Thompson",
        type: "auto",
        premium: 1200,
        status: "active",
        effectiveDate: new Date("2026-01-01"),
        expirationDate: new Date("2027-01-01"),
        owner: admin._id
      },
      {
        policyNumber: "pol-1002",
        holderName: "Olivia Martin",
        type: "home",
        premium: 1800,
        status: "active",
        effectiveDate: new Date("2026-02-15"),
        expirationDate: new Date("2027-02-15"),
        owner: adjusterOne._id
      },
      {
        policyNumber: "pol-1003",
        holderName: "Ethan Walker",
        type: "life",
        premium: 950,
        status: "expired",
        effectiveDate: new Date("2024-05-01"),
        expirationDate: new Date("2025-05-01"),
        owner: adjusterTwo._id
      },
      {
        policyNumber: "pol-1004",
        holderName: "Sophia Reed",
        type: "auto",
        premium: 1100,
        status: "cancelled",
        effectiveDate: new Date("2025-03-01"),
        expirationDate: new Date("2026-03-01"),
        owner: admin._id
      },
      {
        policyNumber: "pol-1005",
        holderName: "Mason Brooks",
        type: "home",
        premium: 2100,
        status: "active",
        effectiveDate: new Date("2026-04-10"),
        expirationDate: new Date("2027-04-10"),
        owner: adjusterOne._id
      }
    ]);

    await Claim.create([
      {
        policy: policies[0]._id,
        description: "Rear-end collision at traffic signal.",
        incidentDate: new Date("2026-06-11"),
        amount: 4300,
        status: "submitted",
        assignedTo: adjusterOne._id,
        notes: []
      },
      {
        policy: policies[1]._id,
        description: "Storm-related roof damage.",
        incidentDate: new Date("2026-05-20"),
        amount: 12500,
        status: "under-review",
        assignedTo: adjusterTwo._id,
        notes: [
          {
            author: adjusterTwo._id,
            text: "Inspection report requested from contractor.",
            createdAt: new Date("2026-05-22T10:00:00.000Z")
          }
        ]
      },
      {
        policy: policies[2]._id,
        description: "Life policy payout request.",
        incidentDate: new Date("2026-03-03"),
        amount: 50000,
        status: "approved",
        assignedTo: adjusterOne._id,
        notes: [
          {
            author: admin._id,
            text: "Beneficiary documents verified.",
            createdAt: new Date("2026-03-08T09:30:00.000Z")
          }
        ]
      },
      {
        policy: policies[3]._id,
        description: "Windshield replacement claim.",
        incidentDate: new Date("2026-02-14"),
        amount: 780,
        status: "denied",
        assignedTo: adjusterTwo._id,
        notes: [
          {
            author: adjusterTwo._id,
            text: "Claim denied due to inactive coverage date.",
            createdAt: new Date("2026-02-16T12:15:00.000Z")
          }
        ]
      },
      {
        policy: policies[4]._id,
        description: "Kitchen water leak remediation.",
        incidentDate: new Date("2026-07-01"),
        amount: 6400,
        status: "closed",
        assignedTo: adjusterOne._id,
        notes: [
          {
            author: adjusterOne._id,
            text: "Final invoice approved and paid.",
            createdAt: new Date("2026-07-08T15:45:00.000Z")
          }
        ]
      },
      {
        policy: policies[0]._id,
        description: "Minor bumper scratch from parking lot incident.",
        incidentDate: new Date("2026-08-12"),
        amount: 950,
        status: "submitted",
        assignedTo: adjusterTwo._id,
        notes: []
      }
    ]);

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
