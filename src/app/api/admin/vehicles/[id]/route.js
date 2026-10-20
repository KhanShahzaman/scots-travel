import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin-route";
import { connectToDatabase } from "@/lib/db";
import { Vehicle } from "@/models/Vehicle";
import { VehicleRate } from "@/models/StateVehicleRate";

function isValidImageUrl(value) {
  if (!value) return false;
  if (value.startsWith("/uploads/")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const imageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(isValidImageUrl, {
    message: "Image URL must be an http(s) URL or /uploads/* path.",
  });

const updateVehicleSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  code: z.string().trim().min(2).max(40).optional(),
  description: z.string().trim().max(500).optional(),
  variants: z.string().trim().max(300).optional(),
  order: z.number().int().min(0).max(9999).optional(),
  seats: z.number().int().min(1).max(30).optional(),
  luggage: z.number().int().min(0).max(30).optional(),
  active: z.boolean().optional(),
  image: z
    .object({
      url: imageUrlSchema,
      alt: z.string().max(140).optional().default(""),
      publicId: z.string().max(240).optional().default(""),
    })
    .optional(),
});

export async function GET(_request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  await connectToDatabase();
  const { id } = await params;
  const vehicle = await Vehicle.findById(id).lean().exec();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  }

  return NextResponse.json({ vehicle });
}

export async function PUT(request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const body = await request.json();
    const parsed = updateVehicleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    await connectToDatabase();
    const { id } = await params;

    const vehicle = await Vehicle.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "Vehicle code already exists." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not update vehicle." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  await connectToDatabase();
  const { id } = await params;

  const linkedRatesCount = await StateVehicleRate.countDocuments({ vehicleId: id }).exec();
  if (linkedRatesCount > 0) {
    return NextResponse.json(
      { error: "Vehicle has linked rate records. Delete rates first." },
      { status: 409 },
    );
  }

  const deleted = await Vehicle.findByIdAndDelete(id).lean().exec();
  if (!deleted) {
    return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
