"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const resourceChildren = [
  { href: "/admin/states", label: "States" },
  { href: "/admin/vehicles", label: "Vehicles" },
];

function isActive(pathname, href) {
  return pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const bookingsActive = isActive(pathname, "/admin/bookings");
  const resourcesActive =
    isActive(pathname, "/admin/resources") ||
    isActive(pathname, "/admin/rates") ||
    isActive(pathname, "/admin/states") ||
    isActive(pathname, "/admin/vehicles");

  return (
    <aside className="admin-sidebar lg:h-full">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-700/70 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white shadow-[0_8px_20px_rgba(0,0,0,0.28)]">
              <img src="/images/st-logo.jpeg" alt="Scot Travels" className="h-full w-full object-cover" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">Scot Travels</p>
              <p className="mt-0.5 text-sm font-semibold text-white">Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 p-2.5 lg:overflow-y-auto">
          <Link
            href="/admin/bookings"
            className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
              bookingsActive
                ? "admin-primary-btn shadow"
                : "text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-hover)] hover:text-white"
            }`}
          >
            Bookings
          </Link>

          <div className="rounded-lg border border-slate-700/60 bg-slate-900/20 p-2">
            <Link
              href="/admin/resources"
              className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                resourcesActive
                  ? "admin-primary-btn shadow"
                  : "text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-hover)] hover:text-white"
              }`}
            >
              Resources
            </Link>

            <div className="mt-2 space-y-1">
              {resourceChildren.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block rounded-md px-3 py-1.5 text-[13px] transition ${
                      active
                        ? "bg-slate-100 text-[var(--admin-text)]"
                        : "text-slate-300 hover:bg-[var(--admin-sidebar-hover)] hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}
