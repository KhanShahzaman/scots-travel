import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin-route";
import { connectToDatabase } from "@/lib/db";
import { State } from "@/models/State";
import { StateVehicleRate } from "@/models/StateVehicleRate";

const updateStateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  code: z.string().trim().min(2).max(12).optional(),
  active: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export async function GET(_request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  await connectToDatabase();
  const { id } = await params;
  const state = await State.findById(id).lean().exec();

  if (!state) {
    return NextResponse.json({ error: "State not found." }, { status: 404 });
  }

  return NextResponse.json({ state });
}

export async function PUT(request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const body = await request.json();
    const parsed = updateStateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    await connectToDatabase();
    const { id } = await params;

    const state = await State.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    if (!state) {
      return NextResponse.json({ error: "State not found." }, { status: 404 });
    }

    return NextResponse.json({ state });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "State code already exists." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not update state." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  await connectToDatabase();
  const { id } = await params;

  const linkedRatesCount = await StateVehicleRate.countDocuments({ stateId: id }).exec();
  if (linkedRatesCount > 0) {
    return NextResponse.json(
      { error: "State has linked rate records. Delete rates first." },
      { status: 409 },
    );
  }

  const deleted = await State.findByIdAndDelete(id).lean().exec();
  if (!deleted) {
    return NextResponse.json({ error: "State not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
