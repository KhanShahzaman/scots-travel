import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";

export async function requireAdminPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/login?next=/admin");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return session;
}
