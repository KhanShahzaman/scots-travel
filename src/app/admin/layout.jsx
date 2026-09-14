import { AdminFrame } from "@/components/admin/admin-frame";
import { requireAdminPage } from "@/lib/admin-page";

export default async function AdminLayout({ children }) {
  const session = await requireAdminPage();
  const displayName = session.user.name || session.user.email || "Admin";

  return (
    <AdminFrame displayName={displayName} email={session.user.email || ""}>
      {children}
    </AdminFrame>
  );
}
