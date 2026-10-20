
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { isUkLocation } from "@/lib/location-utils";
import { getQuotePreview } from "@/lib/quote-pricing";
import { Quote } from "@/models/Quote";

const locationSchema = z.object({
  label: z.string().trim().max(320).default(""),
  address: z.string().trim().min(2).max(320),
  city: z.string().trim().max(120).default(""),
  state: z.string().trim().max(120).default(""),
  zipcode: z.string().trim().max(30).default(""),
  country: z.string().trim().max(120).default(""),
  countryCode: z.string().trim().max(3).default(""),
  placeId: z.string().trim().max(220).default(""),
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
  types: z.array(z.string().trim().max(80)).max(20).default([]),
  isAirport: z.boolean().default(false),
  isHospital: z.boolean().default(false),
  isUk: z.boolean().default(false),
  type: z.enum(["airport", "hospital", "address", "other"]).default("address"),
});

const quoteSchema = z.object({
  pickup: locationSchema,
  dropoff: locationSchema,
  stops: z.array(locationSchema).max(4).default([]),
  miles: z.number().min(0.1).max(300),
  vehicleCode: z.string().trim().min(1).max(40).optional(),
  vehicleClass: z.string().trim().min(1).max(40).optional(),
  includeMeetAndGreet: z.boolean().default(false),
  waypoints: z.number().int().min(0).max(4).optional(),
  isNightRide: z.boolean().default(false),
  pickupAtLocal: z.string().trim().max(32).optional(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = quoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid quote payload." },
        { status: 400 },
      );
    }

    const normalizedStops = (parsed.data.stops || []).filter(
      (item) => item.address,
    );

    const allLocations = [
      parsed.data.pickup,
      parsed.data.dropoff,
      ...normalizedStops,
    ];

    if (allLocations.some((location) => !isUkLocation(location))) {
      return NextResponse.json(
        { error: "Only UK locations are allowed." },
        { status: 400 },
      );
    }

    const pickup = { ...parsed.data.pickup, isUk: true };
    const dropoff = { ...parsed.data.dropoff, isUk: true };
    const stops = normalizedStops.map((stop) => ({
      ...stop,
      isUk: true,
    }));

    const totalWaypoints = stops.length;

    const requestedVehicleCode = (
      parsed.data.vehicleCode ||
      parsed.data.vehicleClass ||
      ""
    ).toLowerCase();

    await connectToDatabase();

    const preview = await getQuotePreview({
      pickup,
      miles: parsed.data.miles,
      stops,
      includeMeetAndGreet: parsed.data.includeMeetAndGreet,
      pickupAtLocal: parsed.data.pickupAtLocal || "",
      vehicleCode: requestedVehicleCode || undefined,
    });

    if (!requestedVehicleCode) {
      return NextResponse.json({
        mode: "preview",
        miles: parsed.data.miles,
        options: preview.options,
        route: {
          pickup,
          dropoff,
          stops,
        },
      });
    }

    if (!preview.selectedOption) {
      return NextResponse.json(
        { error: "Selected vehicle rate is not available." },
        { status: 404 },
      );
    }

    const selected = preview.selectedOption;

    const quote = await Quote.create({
      ...parsed.data,
      pickup,
      dropoff,
      stops,
      vehicleCode: selected.vehicle.code,
      vehicleName: selected.vehicle.name,
      vehicleId: selected.vehicle.id,
      vehicleClass: selected.vehicle.code,
      waypoints: totalWaypoints,
      isNightRide: Boolean(
        selected.breakdown?.nightSurchargeApplied,
      ),
      breakdown: selected.breakdown,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    return NextResponse.json({
      mode: "reserved",
      quoteId: String(quote._id),
      expiresAt: quote.expiresAt,
      breakdown: selected.breakdown,
      vehicle: selected.vehicle,
      route: {
        pickup,
        dropoff,
        stops,
      },
    });
  } catch (error) {
    console.error("Quote API error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to calculate quote." },
      { status: 500 },
    );
  }
}
