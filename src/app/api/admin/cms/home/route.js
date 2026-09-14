import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-route";
import { getCmsHomeContent, saveCmsHomeContent } from "@/lib/cms-content";
import { cmsHomeSchema } from "@/lib/cms-schemas";

export async function GET() {
  const { response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const content = await getCmsHomeContent();
    return NextResponse.json({ content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load home content." }, { status: 500 });
  }
}

export async function PUT(request) {
  const { session, response } = await requireAdminApiSession();
  if (response) return response;

  try {
    const body = await request.json();
    const parsed = cmsHomeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload for home content." }, { status: 400 });
    }

    const content = await saveCmsHomeContent(parsed.data, session?.user?.email);
    return NextResponse.json({ content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not save home content." }, { status: 500 });
  }
}
