import { Schema, model, models } from "mongoose";

const vehicleImageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 500 },
    alt: { type: String, default: "", trim: true, maxlength: 140 },
    publicId: { type: String, default: "", trim: true, maxlength: 240 },
  },
  { _id: false },
);

const vehicleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    variants: { type: String, default: "", trim: true, maxlength: 300 },
    order: { type: Number, default: 0, min: 0, max: 9999 },
    seats: { type: Number, default: 4, min: 1, max: 30 },
    luggage: { type: Number, default: 2, min: 0, max: 30 },
    image: { type: vehicleImageSchema, required: true },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

vehicleSchema.pre("validate", function normalizeCode() {
  if (this.code) {
    this.code = this.code.trim().toLowerCase();
  }
  if (this.name) {
    this.name = this.name.trim();
  }
});

vehicleSchema.index({ code: 1 }, { unique: true });
vehicleSchema.index({ active: 1, order: 1, name: 1 });

export const Vehicle = models.Vehicle || model("Vehicle", vehicleSchema);
