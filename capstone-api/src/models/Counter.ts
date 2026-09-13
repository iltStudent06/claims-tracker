import { Schema, model } from "mongoose";

interface ICounter {
  key: string;
  sequenceValue: number;
}

const counterSchema = new Schema<ICounter>(
  {
    key: { type: String, required: true, unique: true },
    sequenceValue: { type: Number, default: 1000 }
  },
  { timestamps: true }
);

export const Counter = model<ICounter>("Counter", counterSchema);
