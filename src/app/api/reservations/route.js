import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth-session";
import { generateReadableBookingNumber } from "@/lib/booking-number";
import { connectToDatabase } from "@/lib/db";
import { sendBookingConfirmationEmail } from "@/lib/notifications";
import { locationToText } from "@/lib/location-utils";
import { getStripeServer } from "@/lib/stripe-server";
import { Booking } from "@/models/Booking";
import { Quote } from "@/models/Quote";
import { User } from "@/models/User";
import { Vehicle } from "@/models/Vehicle";

function bookingRef() {
  return `STR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

const passengerLegSchema = z.object({
  leadName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(5).max(40),
  email: z.string().trim().email().optional().or(z.literal("")),
  passengers: z.string().trim().max(20).optional().default("1"),
  luggage: z.string().trim().max(40).optional().default("none"),
  flightNumber: z.string().trim().max(30).optional().default(""),
  arrivingFrom: z.string().trim().max(160).optional().default(""),
  pickupAt: z.string().trim().min(5),
  pickupTimeZone: z.string().trim().max(80).optional().default(""),
  meetAndGreet: z.string().trim().max(10).optional().default("no"),
  specialInstructions: z.string().trim().max(500).optional().default(""),
});

const reservationBaseSchema = z.object({
  selectedVehicle: z.object({
    code: z.string().trim().min(1).max(40),
    name: z.string().trim().min(1).max(120),
  }),
  paymentIntentId: z.string().trim().min(1),
  quoteIds: z.object({
    outboundQuoteId: z.string().trim().min(1),
    inboundQuoteId: z.string().trim().optional().default(""),
  }),
});

const singleReservationSchema = reservationBaseSchema.extend({
  tripType: z.literal("single"),
  passenger: z.object({
    outbound: passengerLegSchema,
    inbound: z.unknown().optional(),
  }),
});

const returnReservationSchema = reservationBaseSchema.extend({
  tripType: z.literal("return"),
  passenger: z.object({
    outbound: passengerLegSchema,
    inbound: passengerLegSchema,
  }),
});

const reservationSchema = z.discriminatedUnion("tripType", [singleReservationSchema, returnReservationSchema]);

function notesFromDetails(details) {
  const chunks = [
    details.arrivingFrom ? `Arriving from: ${details.arrivingFrom}` : "",
    details.passengers ? `Passengers: ${details.passengers}` : "",
    details.luggage ? `Luggage: ${details.luggage}` : "",
    details.meetAndGreet ? `Meet & Greet: ${details.meetAndGreet}` : "",
    details.specialInstructions ? `Notes: ${details.specialInstructions}` : "",
  ].filter(Boolean);

  return chunks.join(" | ").slice(0, 500);
}

function parsePickupSchedule(value, timeZoneInput) {
  const pickupAtLocal = String(value || "").trim();
  const pickupTimeZone = String(timeZoneInput || "").trim() || "Europe/London";
  const date = new Date(pickupAtLocal);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid pickup date/time.");
  }
  return {
    pickupAt: date,
    pickupAtLocal,
    pickupTimeZone,
  };
}

async function resolveVehicleIdFromQuote(quote, selectedVehicleCode) {
  if (quote?.vehicleId) {
    return quote.vehicleId;
  }

  const code = String(selectedVehicleCode || quote?.vehicleCode || quote?.vehicleClass || "")
    .trim()
    .toLowerCase();

  if (!code) {
    return null;
  }

  const vehicle = await Vehicle.findOne({ code }).select("_id").lean().exec();
  return vehicle?._id || null;
}

function toPassengerDocument(details) {
  return {
    leadName: details.leadName,
    mobile: details.mobile,
    email: details.email || "",
    passengers: details.passengers || "1",
    luggage: details.luggage || "none",
    flightNumber: details.flightNumber || "",
    arrivingFrom: details.arrivingFrom || "",
    meetAndGreet: details.meetAndGreet || "no",
    specialInstructions: details.specialInstructions || "",
  };
}

function toBookingDocument({
  legType,
  groupId,
  linkedBookingId = null,
  bookingNumber,
  user,
  quote,
  details,
  vehicleId,
  payment,
}) {
  const schedule = parsePickupSchedule(details.pickupAt, details.pickupTimeZone);
  return {
    bookingRef: bookingRef(),
    bookingNumber,
    tripGroupId: groupId,
    linkedBookingId,
    legType,
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
    passenger: toPassengerDocument(details),
    passengerName: details.leadName,
    passengerPhone: details.mobile,
    flightNumber: details.flightNumber || "",
    notes: notesFromDetails(details),
    pickupAt: schedule.pickupAt,
    pickupAtLocal: schedule.pickupAtLocal,
    pickupTimeZone: schedule.pickupTimeZone,
    payment,
    pricingBreakdown: quote.breakdown || null,
    status: "BOOKING_CONFIRMED",
    total: Number(quote.breakdown?.total || 0),
    currency: quote.breakdown?.currency || "GBP",
  };
}

function getExpectedAmountMinor(outboundQuote, inboundQuote) {
  const outboundTotal = Number(outboundQuote?.breakdown?.total || 0);
  const inboundTotal = Number(inboundQuote?.breakdown?.total || 0);
  return Math.round((outboundTotal + inboundTotal) * 100);
}

function extractPaymentSummary(paymentIntent) {
  const paymentMethod = paymentIntent?.payment_method;
  const latestCharge = paymentIntent?.latest_charge;
  const card = paymentMethod?.card;

  return {
    intentId: String(paymentIntent?.id || ""),
    status: String(paymentIntent?.status || ""),
    amount: Number(paymentIntent?.amount || 0),
    currency: String(paymentIntent?.currency || "gbp").toUpperCase(),
    methodType: String(paymentMethod?.type || ""),
    cardBrand: String(card?.brand || ""),
    cardLast4: String(card?.last4 || ""),
    chargeId: String(latestCharge?.id || ""),
    receiptUrl: String(latestCharge?.receipt_url || ""),
  };
}

export async function POST(request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reservation payload.", parsed }, { status: 400 });
    }

    await connectToDatabase();

    const [user, outboundQuote] = await Promise.all([
      User.findOne({ email: session.user.email.toLowerCase() }).exec(),
      Quote.findById(parsed.data.quoteIds.outboundQuoteId).exec(),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Authenticated user not found." }, { status: 404 });
    }

    if (!outboundQuote) {
      return NextResponse.json({ error: "Outbound quote not found." }, { status: 404 });
    }

    if (outboundQuote.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Outbound quote expired. Please re-select vehicle." }, { status: 409 });
    }

    let inboundQuote = null;
    if (parsed.data.tripType === "return" && parsed.data.quoteIds.inboundQuoteId) {
      inboundQuote = await Quote.findById(parsed.data.quoteIds.inboundQuoteId).exec();
      if (!inboundQuote) {
        return NextResponse.json({ error: "Inbound quote not found." }, { status: 404 });
      }
      if (inboundQuote.expiresAt.getTime() < Date.now()) {
        return NextResponse.json({ error: "Inbound quote expired. Please re-select vehicle." }, { status: 409 });
      }
    }

    const selectedVehicleCode = parsed.data.selectedVehicle.code.toLowerCase();

    if (outboundQuote.vehicleCode && outboundQuote.vehicleCode !== selectedVehicleCode) {
      return NextResponse.json({ error: "Outbound quote vehicle mismatch. Please reselect vehicle." }, { status: 409 });
    }

    if (inboundQuote?.vehicleCode && inboundQuote.vehicleCode !== selectedVehicleCode) {
      return NextResponse.json({ error: "Inbound quote vehicle mismatch. Please reselect vehicle." }, { status: 409 });
    }

    const existingBookings = await Booking.find({ "payment.intentId": parsed.data.paymentIntentId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    if (existingBookings.length > 0) {
      return NextResponse.json({
        ok: true,
        bookingRefs: existingBookings.map((booking) => booking.bookingRef),
        bookingNumbers: existingBookings.map((booking) => booking.bookingNumber || booking.bookingRef),
        tripGroupId: existingBookings[0]?.tripGroupId || null,
      });
    }

    const stripe = getStripeServer();
    const paymentIntent = await stripe.paymentIntents.retrieve(parsed.data.paymentIntentId, {
      expand: ["payment_method", "latest_charge"],
    });
    const expectedAmount = getExpectedAmountMinor(outboundQuote, inboundQuote);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Stripe payment is not completed." }, { status: 409 });
    }

    if (paymentIntent.currency !== "gbp") {
      return NextResponse.json({ error: "Stripe payment currency mismatch." }, { status: 409 });
    }

    if (paymentIntent.amount !== expectedAmount) {
      return NextResponse.json({ error: "Stripe payment amount mismatch." }, { status: 409 });
    }

    const paymentSummary = extractPaymentSummary(paymentIntent);

    const [outboundVehicleId, inboundVehicleId] = await Promise.all([
      resolveVehicleIdFromQuote(outboundQuote, selectedVehicleCode),
      inboundQuote ? resolveVehicleIdFromQuote(inboundQuote, selectedVehicleCode) : Promise.resolve(null),
    ]);

    if (!outboundVehicleId) {
      return NextResponse.json({ error: "Vehicle reference missing on outbound quote. Please re-quote." }, { status: 409 });
    }

    if (inboundQuote && !inboundVehicleId) {
      return NextResponse.json({ error: "Vehicle reference missing on inbound quote. Please re-quote." }, { status: 409 });
    }

    const isReturn = parsed.data.tripType === "return" && Boolean(inboundQuote);
    const groupId = isReturn ? `TRIP-${randomUUID().slice(0, 12).toUpperCase()}` : "";

    const outboundBookingNumber = await generateReadableBookingNumber();
    const outboundDetails = parsed.data.passenger.outbound;
    const outboundBooking = await Booking.create(
      toBookingDocument({
        legType: isReturn ? "outbound" : "single",
        groupId,
        bookingNumber: outboundBookingNumber,
        user,
        quote: outboundQuote,
        details: outboundDetails,
        vehicleId: outboundVehicleId,
        payment: paymentSummary,
      }),
    );

    const bookingRefs = [outboundBooking.bookingRef];
    const bookingNumbers = [outboundBooking.bookingNumber || outboundBooking.bookingRef];

    if (isReturn && inboundQuote && inboundVehicleId) {
      const inboundBookingNumber = await generateReadableBookingNumber();
      const inboundDetails = parsed.data.passenger.inbound || parsed.data.passenger.outbound;
      const inboundBooking = await Booking.create(
        toBookingDocument({
          legType: "inbound",
          groupId,
          bookingNumber: inboundBookingNumber,
          user,
          quote: inboundQuote,
          details: inboundDetails,
          vehicleId: inboundVehicleId,
          payment: paymentSummary,
        }),
      );

      await Booking.bulkWrite([
        {
          updateOne: {
            filter: { _id: outboundBooking._id },
            update: { $set: { linkedBookingId: inboundBooking._id } },
          },
        },
        {
          updateOne: {
            filter: { _id: inboundBooking._id },
            update: { $set: { linkedBookingId: outboundBooking._id } },
          },
        },
      ]);

      bookingRefs.push(inboundBooking.bookingRef);
      bookingNumbers.push(inboundBooking.bookingNumber || inboundBooking.bookingRef);
    }

    await sendBookingConfirmationEmail(outboundBooking.toObject(), parsed.data.selectedVehicle.name);

    return NextResponse.json({
      ok: true,
      bookingRefs,
      bookingNumbers,
      tripGroupId: groupId || null,
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not create reservation." }, { status: 500 });
  }
}
