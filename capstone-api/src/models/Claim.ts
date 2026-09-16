import { Document, Schema, Types, model } from "mongoose";

export type ClaimStatus = "submitted" | "under-review" | "approved" | "denied" | "closed";

interface IClaimNote {
  author: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IClaim extends Document {
  claimNumber: string;
  policy: Types.ObjectId;
  description: string;
  incidentDate: Date;
  amount: number;
  status: ClaimStatus;
  assignedTo?: Types.ObjectId;
  notes: IClaimNote[];
}

const claimNoteSchema = new Schema<IClaimNote>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const claimSchema = new Schema<IClaim>(
  {
    claimNumber: { type: String, unique: true, index: true },
    policy: { type: Schema.Types.ObjectId, ref: "Policy", required: true },
    description: { type: String, required: true, trim: true },
    incidentDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["submitted", "under-review", "approved", "denied", "closed"],
      default: "submitted"
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: [claimNoteSchema], default: [] }
  },
  { timestamps: true }
);

claimSchema.pre("save", async function setClaimNumber() {
  if (this.claimNumber) {
    return;
  }

  const counter = await this.db
    .collection<{ key: string; sequenceValue: number }>("counters")
    .findOneAndUpdate(
      { key: "claimNumber" },
      { $inc: { sequenceValue: 1 } },
      { upsert: true, returnDocument: "after" }
    );

  if (!counter) {
    throw new Error("Failed to generate claim number");
  }

  this.claimNumber = `CLM-${String(counter.sequenceValue).padStart(4, "0")}`;
});

export const Claim = model<IClaim>("Claim", claimSchema);
