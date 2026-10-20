
import { Schema, model, models } from "mongoose";

const slabSchema = new Schema(
  {
    fromMiles: { type: Number, required: true, min: 1 },
    toMiles: { type: Number, default: null, min: 1 },
    ratePerMile: { type: Number, required: true, min: 0.01 },
    order: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const vehicleRateSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },

    minimumBillableMiles: {
      type: Number,
      default: 3,
      min: 1,
      required: true,
    },

    slabs: {
      type: [slabSchema],
      required: true,
      default: [],
    },

    airportPickupFee: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    meetAndGreetFee: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    waypointFee: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    nightWindowStart: {
      type: String,
      default: "21:00",
      trim: true,
      maxlength: 5,
      required: true,
    },

    nightWindowEnd: {
      type: String,
      default: "04:00",
      trim: true,
      maxlength: 5,
      required: true,
    },

    nightSurchargeFee: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    taxRate: {
      type: Number,
      default: 0.2,
      min: 0,
      max: 0.3,
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// One common rate configuration per vehicle.
vehicleRateSchema.index({ vehicleId: 1 }, { unique: true });
vehicleRateSchema.index({ active: 1, updatedAt: -1 });

export const VehicleRate =
  models.VehicleRate || model("VehicleRate", vehicleRateSchema);
