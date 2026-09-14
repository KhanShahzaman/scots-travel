"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

function isBookingDetailsPath(pathname) {
  return /^\/admin\/bookings\/[^/]+$/.test(pathname || "");
}

export function AdminFrame({ children, displayName, email }) {
  const pathname = usePathname();
  const fullScreenDetails = isBookingDetailsPath(pathname);

  if (fullScreenDetails) {
    return (
      <div className="admin-theme relative left-1/2 min-h-screen w-screen -translate-x-1/2">
        <main className="min-h-screen px-4 py-4 lg:px-6 lg:py-5">{children}</main>
      </div>
    );
  }

  return (
    <div className="admin-theme relative left-1/2 min-h-screen w-screen -translate-x-1/2 lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[228px_minmax(0,1fr)]">
        <AdminSidebar />

        <div className="min-w-0 lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
          <header className="admin-topbar z-30 backdrop-blur lg:shrink-0">
            <div className="flex items-center justify-between gap-4 px-6 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300">Control Center</p>
                <p className="mt-1 text-lg font-semibold text-white">Admin</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{displayName}</p>
                  <p className="text-[13px] text-slate-300">{email}</p>
                </div>
                <AdminLogoutButton />
              </div>
            </div>
          </header>

          <main className="px-6 py-5 lg:flex-1 lg:overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
