"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { generateReadableBookingNumber } from "@/lib/booking-number";
import { connectToDatabase } from "@/lib/db";
import {
  sendBookingConfirmationEmail,
  sendDriverAssignedEmail,
  sendThankYouEmail,
} from "@/lib/notifications";
import { locationToText } from "@/lib/location-utils";
import { Booking } from "@/models/Booking";
import { Quote } from "@/models/Quote";
import { User } from "@/models/User";
import { Vehicle } from "@/models/Vehicle";

function bookingRef() {
  return `STR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function resolveVehicleIdFromQuote(quote) {
  if (quote?.vehicleId) {
    return quote.vehicleId;
  }

  const code = String(quote?.vehicleCode || quote?.vehicleClass || "")
    .trim()
    .toLowerCase();
  if (!code) {
    return null;
  }

  const vehicle = await Vehicle.findOne({ code }).select("_id name").lean().exec();
  return vehicle?._id || null;
}

export async function createBookingFromQuoteAction(formData) {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const quoteId = String(formData.get("quoteId") || "");
  const pickupAtRaw = String(formData.get("pickupAt") || "");
  const passengerName = String(formData.get("passengerName") || "").trim();
  const passengerPhone = String(formData.get("passengerPhone") || "").trim();
  const flightNumber = String(formData.get("flightNumber") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!quoteId || !pickupAtRaw || !passengerName || !passengerPhone) {
    throw new Error("Missing checkout fields.");
  }

  await connectToDatabase();

  const [quote, user] = await Promise.all([
    Quote.findById(quoteId).exec(),
    User.findOne({ email: session.user.email.toLowerCase() }).exec(),
  ]);

  if (!quote) {
    throw new Error("Quote not found.");
  }

  if (!user) {
    throw new Error("Authenticated user not found.");
  }

  if (quote.expiresAt.getTime() < Date.now()) {
    throw new Error("Quote has expired. Please re-quote.");
  }

  const vehicleId = await resolveVehicleIdFromQuote(quote);
  if (!vehicleId) {
    throw new Error("Vehicle reference missing on quote. Please re-quote.");
  }

  const pickupAt = new Date(pickupAtRaw);
  if (Number.isNaN(pickupAt.getTime())) {
    throw new Error("Invalid pickup date/time.");
  }

  const bookingNumber = await generateReadableBookingNumber();
  const booking = await Booking.create({
    bookingRef: bookingRef(),
    bookingNumber,
    userId: user._id,
    customerName: user.name,
    customerEmail: user.email,
    quoteId: quote._id,
    route: {
      pickup: quote.pickup,
      dropoff: quote.dropoff,
      stops: quote.stops || [],
    },
    pickup: locationToText(quote.pickup),
    dropoff: locationToText(quote.dropoff),
    pickupState: quote.pickup?.state || "",
    stopSummary: (quote.stops || []).map((stop) => locationToText(stop)).join(" | "),
    miles: Number(quote.miles || 0),
    vehicleId,
    passenger: {
      leadName: passengerName,
      mobile: passengerPhone,
      email: "",
      passengers: "1",
      luggage: "none",
      flightNumber,
      arrivingFrom: "",
      meetAndGreet: "no",
      specialInstructions: notes,
    },
    pickupAt,
    pickupAtLocal: pickupAtRaw,
    pickupTimeZone: "Europe/London",
    passengerName,
    passengerPhone,
    flightNumber,
    notes,
    pricingBreakdown: quote.breakdown || null,
    status: "BOOKING_CONFIRMED",
    total: Number(quote.breakdown?.total || 0),
    currency: quote.breakdown?.currency || "GBP",
  });

  await sendBookingConfirmationEmail(booking.toObject(), quote.vehicleName || quote.vehicleCode || "");

  redirect(`/dashboard?booking=${booking.bookingRef}`);
}

export async function assignDriverAction(formData) {
  const session = await getAuthSession();

  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }

  const bookingId = String(formData.get("bookingId") || "");
  const driverName = String(formData.get("driverName") || "").trim();

  if (!bookingId || !driverName) {
    throw new Error("Booking ID and driver name are required.");
  }

  await connectToDatabase();

  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { status: "ASSIGNED", assignedDriverName: driverName },
    { new: true },
  )
    .populate({ path: "vehicleId", select: "name code" })
    .exec();

  if (!booking) {
    throw new Error("Booking not found.");
  }

  await sendDriverAssignedEmail(booking.toObject(), driverName);

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/dashboard");
}

export async function completeRideAction(formData) {
  const session = await getAuthSession();

  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }

  const bookingId = String(formData.get("bookingId") || "");

  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  await connectToDatabase();

  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { status: "COMPLETED" },
    { new: true },
  )
    .populate({ path: "vehicleId", select: "name code" })
    .exec();

  if (!booking) {
    throw new Error("Booking not found.");
  }

  await sendThankYouEmail(booking.toObject());

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/dashboard");
}
