import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin-route";
import { connectToDatabase } from "@/lib/db";
import { State } from "@/models/State";

const createStateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(12),
  active: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export async function GET() {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  await connectToDatabase();
  const states = await State.find().sort({ order: 1, name: 1 }).lean().exec();
  return NextResponse.json({ states });
}

export async function POST(request) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const body = await request.json();
    const parsed = createStateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    await connectToDatabase();

    const state = await State.create(parsed.data);
    return NextResponse.json({ state }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "State code already exists." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not create state." }, { status: 500 });
  }
}
