"use client";

import { signOut } from "next-auth/react";

export function AdminLogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm("Logout from admin panel?")) return;
        signOut({ callbackUrl: "/login" });
      }}
      title="Logout"
      aria-label="Logout"
      className="admin-secondary-btn inline-flex h-9 w-9 items-center justify-center rounded-full"
    >
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 7V5.75C14 4.78 13.22 4 12.25 4h-5.5C5.78 4 5 4.78 5 5.75v12.5C5 19.22 5.78 20 6.75 20h5.5c.97 0 1.75-.78 1.75-1.75V17" />
        <path d="M10 12h9" />
        <path d="m16 8 4 4-4 4" />
      </svg>
      <span className="sr-only">Logout</span>
    </button>
  );
}
