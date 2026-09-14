import { Schema, model, models } from "mongoose";

const stateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 12 },
    active: { type: Boolean, default: true, required: true },
    order: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);


stateSchema.index({ code: 1 }, { unique: true });
stateSchema.index({ active: 1, order: 1, name: 1 });

export const State = models.State || model("State", stateSchema);
