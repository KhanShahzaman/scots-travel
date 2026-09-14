import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signup payload." }, { status: 400 });
    }

    await connectToDatabase();

    const normalizedEmail = parsed.data.email.toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }).lean().exec();

    if (existing) {
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const bootstrapAdminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();

    await User.create({
      name: parsed.data.name,
      email: normalizedEmail,
      passwordHash,
      role: bootstrapAdminEmail === normalizedEmail ? "admin" : "customer",
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create user." }, { status: 500 });
  }
}
