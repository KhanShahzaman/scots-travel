
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin-route";
import { connectToDatabase } from "@/lib/db";
import { normalizeAndValidateSlabs } from "@/lib/slab-utils";
import { VehicleRate } from "@/models/StateVehicleRate";
import { Vehicle } from "@/models/Vehicle";

const timeFieldSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format.");

const createRateSchema = z.object({
  vehicleId: z.string().min(1),
  minimumBillableMiles: z.number().int().min(1).default(3),
  slabs: z.array(
    z.object({
      fromMiles: z.number(),
      toMiles: z.number().nullable().optional(),
      ratePerMile: z.number(),
      order: z.number().optional(),
    }),
  ),
  airportPickupFee: z.number().min(0).default(0),
  meetAndGreetFee: z.number().min(0).default(0),
  waypointFee: z.number().min(0).default(0),
  nightWindowStart: timeFieldSchema.default("21:00"),
  nightWindowEnd: timeFieldSchema.default("04:00"),
  nightSurchargeFee: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(0.3).default(0.2),
  active: z.boolean().default(true),
});

export async function GET(request) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");
    const active = searchParams.get("active");

    const filter = {};

    if (vehicleId) {
      filter.vehicleId = vehicleId;
    }

    if (active === "true" || active === "false") {
      filter.active = active === "true";
    }

    const rates = await VehicleRate.find(filter)
      .populate({
        path: "vehicleId",
        select: "name code order active image",
      })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ rates });
  } catch (error) {
    console.error("Could not fetch vehicle rates:", error);

    return NextResponse.json(
      { error: "Could not fetch vehicle rates." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const body = await request.json();
    const parsed = createRateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const slabs = normalizeAndValidateSlabs(parsed.data.slabs);

    await connectToDatabase();

    const vehicleExists = await Vehicle.exists({
      _id: parsed.data.vehicleId,
    });

    if (!vehicleExists) {
      return NextResponse.json(
        { error: "Vehicle not found." },
        { status: 404 },
      );
    }

    const rate = await VehicleRate.create({
      ...parsed.data,
      slabs,
    });

    return NextResponse.json({ rate }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "A rate configuration already exists for this vehicle." },
        { status: 409 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload." },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    console.error("Could not create vehicle rate:", error);

    return NextResponse.json(
      { error: "Could not create vehicle rate." },
      { status: 500 },
    );
  }
}
