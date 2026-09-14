import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin-route";
import { connectToDatabase } from "@/lib/db";
import { Vehicle } from "@/models/Vehicle";

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

const createVehicleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(40),
  description: z.string().trim().max(500).optional().default(""),
  variants: z.string().trim().max(300).optional().default(""),
  order: z.number().int().min(0).max(9999).default(0),
  seats: z.number().int().min(1).max(30).default(4),
  luggage: z.number().int().min(0).max(30).default(2),
  active: z.boolean().default(true),
  image: z.object({
    url: imageUrlSchema,
    alt: z.string().max(140).optional().default(""),
    publicId: z.string().max(240).optional().default(""),
  }),
});

export async function GET() {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  await connectToDatabase();
  const vehicles = await Vehicle.find().sort({ order: 1, name: 1 }).lean().exec();
  return NextResponse.json({ vehicles });
}

export async function POST(request) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const body = await request.json();
    const parsed = createVehicleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    await connectToDatabase();
    const vehicle = await Vehicle.create(parsed.data);
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "Vehicle code already exists." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not create vehicle." }, { status: 500 });
  }
}
