"use client";

import { usePathname } from "next/navigation";

export function SiteFooter({ globalContent }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/quote/success/print")) {
    return null;
  }

  if (pathname === "/" || pathname === "/quote/vehicles") {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 bg-[var(--site-dark)]">
      <div className="mx-auto w-full px-4 py-8 text-sm text-slate-200">
        <p>{globalContent.footerText}</p>
        <p className="mt-1">Support: {globalContent.supportEmail} | {globalContent.supportPhone}</p>
      </div>
    </footer>
  );
}
