import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-route";
import { getCmsGlobalContent, saveCmsGlobalContent } from "@/lib/cms-content";
import { cmsGlobalSchema } from "@/lib/cms-schemas";

export async function GET() {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const content = await getCmsGlobalContent();
    return NextResponse.json({ content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load global content." }, { status: 500 });
  }
}

export async function PUT(request) {
  const { session, response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const body = await request.json();
    const parsed = cmsGlobalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload for global content." }, { status: 400 });
    }

    const content = await saveCmsGlobalContent(parsed.data, session?.user?.email);
    return NextResponse.json({ content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not save global content." }, { status: 500 });
  }
}
