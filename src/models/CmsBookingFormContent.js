import { Schema, model, models } from "mongoose";

const vehicleOptionSchema = new Schema(
  {
    value: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    order: { type: Number, default: 0, min: 0, max: 9999 },
  },
  { _id: false },
);

const bookingFormFieldsSchema = new Schema(
  {
    pickupLabel: { type: String, default: "Pickup", trim: true, maxlength: 100 },
    pickupPlaceholder: { type: String, default: "Airport pickup location", trim: true, maxlength: 160 },
    dropoffLabel: { type: String, default: "Drop-off", trim: true, maxlength: 100 },
    dropoffPlaceholder: { type: String, default: "Destination", trim: true, maxlength: 160 },
    milesLabel: { type: String, default: "Distance (miles)", trim: true, maxlength: 100 },
    milesPlaceholder: { type: String, default: "24", trim: true, maxlength: 60 },
    vehicleLabel: { type: String, default: "Vehicle", trim: true, maxlength: 100 },
    waypointsLabel: { type: String, default: "Waypoints", trim: true, maxlength: 100 },
    meetAndGreetLabel: { type: String, default: "Include meet and greet", trim: true, maxlength: 120 },
    nightRideLabel: { type: String, default: "Night ride surcharge", trim: true, maxlength: 120 },
  },
  { _id: false },
);

const breakdownLabelsSchema = new Schema(
  {
    billableMiles: { type: String, default: "Billable miles", trim: true, maxlength: 120 },
    perMile: { type: String, default: "Per mile", trim: true, maxlength: 120 },
    distanceCharge: { type: String, default: "Distance charge", trim: true, maxlength: 120 },
    airportPickupFee: { type: String, default: "Airport pickup fee", trim: true, maxlength: 120 },
    meetAndGreetFee: { type: String, default: "Meet and greet fee", trim: true, maxlength: 120 },
    waypointFee: { type: String, default: "Waypoint fee", trim: true, maxlength: 120 },
    surchargeTotal: { type: String, default: "Surcharges", trim: true, maxlength: 120 },
    taxAmount: { type: String, default: "Tax", trim: true, maxlength: 120 },
    total: { type: String, default: "Total", trim: true, maxlength: 120 },
  },
  { _id: false },
);

const cmsBookingFormContentSchema = new Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true, default: "default_booking_form" },
    status: { type: String, enum: ["draft", "published"], default: "published", required: true },
    title: { type: String, default: "Build a Quote", trim: true, maxlength: 120 },
    subtitle: { type: String, default: "Get an instant transfer estimate.", trim: true, maxlength: 300 },
    submitLabel: { type: String, default: "Calculate Fare", trim: true, maxlength: 80 },
    helperText: {
      type: String,
      default: "Guests can quote freely. Login/signup is required at checkout.",
      trim: true,
      maxlength: 240,
    },
    resultTitle: { type: String, default: "Quote Result", trim: true, maxlength: 120 },
    resultEmptyText: { type: String, default: "Run a quote to see fare breakdown.", trim: true, maxlength: 220 },
    expiresPrefix: { type: String, default: "Quote expires", trim: true, maxlength: 120 },
    continueLabel: { type: String, default: "Continue to Checkout", trim: true, maxlength: 120 },
    fields: { type: bookingFormFieldsSchema, required: true, default: {} },
    breakdownLabels: { type: breakdownLabelsSchema, required: true, default: {} },
    vehicleOptions: { type: [vehicleOptionSchema], default: [] },
    updatedBy: { type: String, default: "system", trim: true, maxlength: 180 },
  },
  { timestamps: true },
);

cmsBookingFormContentSchema.index({ key: 1 }, { unique: true });

export const CmsBookingFormContent =
  models.CmsBookingFormContent || model("CmsBookingFormContent", cmsBookingFormContentSchema);
