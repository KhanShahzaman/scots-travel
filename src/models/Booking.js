import { Schema, model, models } from "mongoose";

const bookingLocationSchema = new Schema(
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

const bookingPassengerSchema = new Schema(
  {
    leadName: { type: String, required: true, trim: true, maxlength: 120 },
    mobile: { type: String, required: true, trim: true, maxlength: 40 },
    email: { type: String, default: "", trim: true, maxlength: 200 },
    passengers: { type: String, default: "1", trim: true, maxlength: 20 },
    luggage: { type: String, default: "none", trim: true, maxlength: 40 },
    flightNumber: { type: String, default: "", trim: true, maxlength: 30 },
    arrivingFrom: { type: String, default: "", trim: true, maxlength: 160 },
    meetAndGreet: { type: String, default: "no", trim: true, maxlength: 10 },
    specialInstructions: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { _id: false },
);

const bookingPaymentSchema = new Schema(
  {
    intentId: { type: String, default: "", trim: true, maxlength: 120 },
    status: { type: String, default: "pending", trim: true, maxlength: 40 },
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "GBP", trim: true, maxlength: 10 },
    methodType: { type: String, default: "", trim: true, maxlength: 40 },
    cardBrand: { type: String, default: "", trim: true, maxlength: 40 },
    cardLast4: { type: String, default: "", trim: true, maxlength: 4 },
    chargeId: { type: String, default: "", trim: true, maxlength: 120 },
    receiptUrl: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const bookingSchema = new Schema(
  {
    bookingRef: { type: String, required: true, unique: true },
    bookingNumber: { type: String, trim: true, uppercase: true, maxlength: 40 },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    quoteId: { type: Schema.Types.ObjectId, ref: "Quote", default: null },
    tripGroupId: { type: String, default: "", trim: true, maxlength: 80, index: true },
    legType: { type: String, enum: ["single", "outbound", "inbound"], default: "single", required: true },
    linkedBookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    route: {
      pickup: { type: bookingLocationSchema, required: true },
      dropoff: { type: bookingLocationSchema, required: true },
      stops: { type: [bookingLocationSchema], default: [] },
    },
    pickup: { type: String, required: true },
    dropoff: { type: String, required: true },
    miles: { type: Number, required: true },
    vehicleId: { type: Schema.Types.ObjectId, required: true, ref: "Vehicle", index: true },
    pickupState: { type: String, default: "", trim: true, maxlength: 120 },
    stopSummary: { type: String, default: "", trim: true, maxlength: 500 },
    passenger: { type: bookingPassengerSchema, required: true },
    passengerName: { type: String, required: true, trim: true, maxlength: 120 },
    passengerPhone: { type: String, required: true, trim: true, maxlength: 40 },
    flightNumber: { type: String, default: "", trim: true, maxlength: 30 },
    notes: { type: String, default: "", trim: true, maxlength: 500 },
    pickupAt: { type: Date, required: true },
    pickupAtLocal: { type: String, default: "", trim: true, maxlength: 32 },
    pickupTimeZone: { type: String, default: "Europe/London", trim: true, maxlength: 80 },
    payment: { type: bookingPaymentSchema, default: () => ({}) },
    pricingBreakdown: { type: Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ["BOOKING_CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      required: true,
      default: "BOOKING_CONFIRMED",
    },
    assignedDriverName: { type: String },
    total: { type: Number, required: true },
    currency: { type: String, required: true, default: "GBP" },
  },
  { timestamps: true },
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ tripGroupId: 1, createdAt: -1 });
bookingSchema.index({ bookingNumber: 1 }, { unique: true, sparse: true });
bookingSchema.index({ "payment.intentId": 1 });

export const Booking = models.Booking || model("Booking", bookingSchema);
