import { Schema, model, models } from "mongoose";

const quoteLocationSchema = new Schema(
  {
    label: { type: String, default: "", trim: true, maxlength: 320 },
    address: { type: String, required: true, trim: true, maxlength: 320 },
    city: { type: String, default: "", trim: true, maxlength: 120 },
    state: { type: String, default: "", trim: true, maxlength: 120 },
    zipcode: { type: String, default: "", trim: true, maxlength: 30 },
    country: { type: String, default: "", trim: true, maxlength: 120 },
    countryCode: { type: String, default: "", trim: true, maxlength: 3 },
    placeId: { type: String, default: "", trim: true, maxlength: 220 },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    types: { type: [String], default: [] },
    isAirport: { type: Boolean, default: false },
    isHospital: { type: Boolean, default: false },
    isUk: { type: Boolean, default: false },
    type: { type: String, enum: ["airport", "hospital", "address", "other"], default: "address" },
  },
  { _id: false },
);

const quoteSchema = new Schema(
  {
    pickup: { type: quoteLocationSchema, required: true },
    dropoff: { type: quoteLocationSchema, required: true },
    stops: { type: [quoteLocationSchema], default: [] },
    miles: { type: Number, required: true },
    vehicleCode: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
    vehicleName: { type: String, required: true, trim: true, maxlength: 120 },
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", default: null },
    // Legacy field kept for old records and backward-safe reads.
    vehicleClass: { type: String, default: "" },
    includeMeetAndGreet: { type: Boolean, required: true, default: false },
    waypoints: { type: Number, required: true, default: 0 },
    isNightRide: { type: Boolean, required: true, default: false },
    breakdown: {
      billableMiles: Number,
      perMile: Number,
      distanceCharge: Number,
      airportPickupFee: Number,
      meetAndGreetFee: Number,
      waypointFee: Number,
      surchargeTotal: Number,
      nightSurchargeApplied: Boolean,
      subtotal: Number,
      taxAmount: Number,
      total: Number,
      currency: String,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const Quote = models.Quote || model("Quote", quoteSchema);
