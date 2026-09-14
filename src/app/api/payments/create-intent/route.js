import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/db";
import { getStripeServer } from "@/lib/stripe-server";
import { Quote } from "@/models/Quote";

const intentSchema = z.object({
  tripType: z.enum(["single", "return"]),
  selectedVehicle: z.object({
    code: z.string().trim().min(1).max(40),
    name: z.string().trim().min(1).max(120),
  }),
  quoteIds: z.object({
    outboundQuoteId: z.string().trim().min(1),
    inboundQuoteId: z.string().trim().optional().default(""),
  }),
});

function getExpectedAmountMinor(outboundQuote, inboundQuote) {
  const outboundTotal = Number(outboundQuote?.breakdown?.total || 0);
  const inboundTotal = Number(inboundQuote?.breakdown?.total || 0);
  return Math.round((outboundTotal + inboundTotal) * 100);
}

export async function POST(request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = intentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment payload." }, { status: 400 });
    }

    await connectToDatabase();

    const [outboundQuote, inboundQuote] = await Promise.all([
      Quote.findById(parsed.data.quoteIds.outboundQuoteId).lean().exec(),
      parsed.data.tripType === "return" && parsed.data.quoteIds.inboundQuoteId
        ? Quote.findById(parsed.data.quoteIds.inboundQuoteId).lean().exec()
        : Promise.resolve(null),
    ]);

    if (!outboundQuote) {
      return NextResponse.json({ error: "Outbound quote not found." }, { status: 404 });
    }
    if (outboundQuote.expiresAt && new Date(outboundQuote.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Outbound quote expired. Please re-select vehicle." }, { status: 409 });
    }

    if (parsed.data.tripType === "return") {
      if (!inboundQuote) {
        return NextResponse.json({ error: "Inbound quote not found." }, { status: 404 });
      }
      if (inboundQuote.expiresAt && new Date(inboundQuote.expiresAt).getTime() < Date.now()) {
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

    const amount = getExpectedAmountMinor(outboundQuote, inboundQuote);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
    }

    const stripe = getStripeServer();
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "gbp",
      payment_method_types: ["card"],
      metadata: {
        userEmail: session.user.email,
        tripType: parsed.data.tripType,
        vehicleCode: selectedVehicleCode,
        outboundQuoteId: parsed.data.quoteIds.outboundQuoteId,
        inboundQuoteId: parsed.data.quoteIds.inboundQuoteId || "",
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not create payment intent." }, { status: 500 });
  }
}

