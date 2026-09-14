import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-route";
import { getCmsBookingFormContent, saveCmsBookingFormContent } from "@/lib/cms-content";
import { cmsBookingFormSchema } from "@/lib/cms-schemas";

function resolveKey(request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("key") || "default_booking_form";
}

export async function GET(request) {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const key = resolveKey(request);
    const content = await getCmsBookingFormContent(key);
    return NextResponse.json({ key, content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load booking form content." }, { status: 500 });
  }
}

export async function PUT(request) {
  const { session, response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const key = resolveKey(request);
    const body = await request.json();
    const parsed = cmsBookingFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload for booking form content." }, { status: 400 });
    }

    const content = await saveCmsBookingFormContent(parsed.data, session?.user?.email, key);
    return NextResponse.json({ key, content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not save booking form content." }, { status: 500 });
  }
}
