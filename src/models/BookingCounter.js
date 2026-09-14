import { Schema, model, models } from "mongoose";

const bookingCounterSchema = new Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 80 },
    seq: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

bookingCounterSchema.index({ key: 1 }, { unique: true });

export const BookingCounter = models.BookingCounter || model("BookingCounter", bookingCounterSchema);
