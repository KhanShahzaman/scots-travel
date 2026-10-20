
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

const updateRateSchema = z
  .object({
    vehicleId: z.string().min(1).optional(),

    minimumBillableMiles: z.number().int().min(1).optional(),

    slabs: z
      .array(
        z.object({
          fromMiles: z.number(),
          toMiles: z.number().nullable().optional(),
          ratePerMile: z.number(),
          order: z.number().optional(),
        }),
      )
      .optional(),

    airportPickupFee: z.number().min(0).optional(),
    meetAndGreetFee: z.number().min(0).optional(),
    waypointFee: z.number().min(0).optional(),

    nightWindowStart: timeFieldSchema.optional(),
    nightWindowEnd: timeFieldSchema.optional(),

    nightSurchargeFee: z.number().min(0).optional(),
    taxRate: z.number().min(0).max(0.3).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export async function GET(_request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    await connectToDatabase();

    const { id } = await params;

    const rate = await VehicleRate.findById(id)
      .populate({
        path: "vehicleId",
        select: "name code order active image",
      })
      .lean()
      .exec();

    if (!rate) {
      return NextResponse.json(
        { error: "Rate not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ rate });
  } catch (error) {
    console.error("Could not fetch vehicle rate:", error);

    return NextResponse.json(
      { error: "Could not fetch vehicle rate." },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const body = await request.json();
    const parsed = updateRateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const { id } = await params;
    const updatePayload = { ...parsed.data };

    if (updatePayload.vehicleId) {
      const vehicleExists = await Vehicle.exists({
        _id: updatePayload.vehicleId,
      });

      if (!vehicleExists) {
        return NextResponse.json(
          { error: "Vehicle not found." },
          { status: 404 },
        );
      }
    }

    if (updatePayload.slabs) {
      updatePayload.slabs = normalizeAndValidateSlabs(
        updatePayload.slabs,
      );
    }

    const rate = await VehicleRate.findByIdAndUpdate(
      id,
      updatePayload,
      {
        new: true,
        runValidators: true,
      },
    )
      .populate({
        path: "vehicleId",
        select: "name code order active image",
      })
      .lean()
      .exec();

    if (!rate) {
      return NextResponse.json(
        { error: "Rate not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ rate });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        {
          error:
            "A rate configuration already exists for this vehicle.",
        },
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

    console.error("Could not update vehicle rate:", error);

    return NextResponse.json(
      { error: "Could not update vehicle rate." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    await connectToDatabase();

    const { id } = await params;

    const deleted = await VehicleRate.findByIdAndDelete(id)
      .lean()
      .exec();

    if (!deleted) {
      return NextResponse.json(
        { error: "Rate not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not delete vehicle rate:", error);

    return NextResponse.json(
      { error: "Could not delete vehicle rate." },
      { status: 500 },
    );
  }
}
