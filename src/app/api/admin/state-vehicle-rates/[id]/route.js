import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin-route";
import { connectToDatabase } from "@/lib/db";
import { normalizeAndValidateSlabs } from "@/lib/slab-utils";
import { State } from "@/models/State";
import { StateVehicleRate } from "@/models/StateVehicleRate";
import { Vehicle } from "@/models/Vehicle";

const timeFieldSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format.");

const updateRateSchema = z.object({
  stateId: z.string().min(1).optional(),
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
});

export async function GET(_request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  await connectToDatabase();
  const { id } = await params;

  const rate = await StateVehicleRate.findById(id)
    .populate({ path: "stateId", select: "name code active" })
    .populate({ path: "vehicleId", select: "name code order active image" })
    .lean()
    .exec();

  if (!rate) {
    return NextResponse.json({ error: "Rate not found." }, { status: 404 });
  }

  return NextResponse.json({ rate });
}

export async function PUT(request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const body = await request.json();
    const parsed = updateRateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    await connectToDatabase();
    const { id } = await params;

    if (parsed.data.stateId) {
      const stateExists = await State.exists({ _id: parsed.data.stateId });
      if (!stateExists) {
        return NextResponse.json({ error: "State not found." }, { status: 404 });
      }
    }

    if (parsed.data.vehicleId) {
      const vehicleExists = await Vehicle.exists({ _id: parsed.data.vehicleId });
      if (!vehicleExists) {
        return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
      }
    }

    const updatePayload = { ...parsed.data };
    if (parsed.data.slabs) {
      updatePayload.slabs = normalizeAndValidateSlabs(parsed.data.slabs);
    }

    const rate = await StateVehicleRate.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    if (!rate) {
      return NextResponse.json({ error: "Rate not found." }, { status: 404 });
    }

    return NextResponse.json({ rate });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "Rate already exists for this state and vehicle." },
        { status: 409 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not update rate." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  await connectToDatabase();
  const { id } = await params;

  const deleted = await StateVehicleRate.findByIdAndDelete(id).lean().exec();
  if (!deleted) {
    return NextResponse.json({ error: "Rate not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
