import Link from "next/link";
import { connectToDatabase } from "@/lib/db";
import { Booking } from "@/models/Booking";
import "@/models/Vehicle";

const PAGE_SIZE = 5;

function formatPickupDate(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timeZone || "Europe/London",
    }).format(date);
  } catch {
    return date.toLocaleString("en-GB");
  }
}

function formatStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "BOOKING_CONFIRMED") {
    return "Confirmed";
  }
  return String(status || "").replaceAll("_", " ");
}

function parsePage(value) {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }
  return page;
}

function buildPageHref(page) {
  return page <= 1 ? "/admin/bookings" : `/admin/bookings?page=${page}`;
}

function shortText(value, limit = 30) {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

function compactLocation(location, fallback) {
  const source = location || {};
  const label = [source.city, source.zipcode].filter(Boolean).join(" ");
  const address = String(source.address || source.label || fallback || "").trim();
  const primary = label || address.split(",").slice(0, 2).join(", ").trim() || fallback || "Unknown";
  return shortText(primary, 34);
}

function stopLabel(count) {
  if (!count) return null;
  return `${count} stop${count === 1 ? "" : "s"}`;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 16h14l-1.3-5.2A2 2 0 0 0 15.76 9H8.24a2 2 0 0 0-1.94 1.8L5 16Z" />
      <path d="M4 16v2M20 16v2M7 18a1.5 1.5 0 1 0 0 .01M17 18a1.5 1.5 0 1 0 0 .01" />
    </svg>
  );
}

function PoundIcon() {
  return <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-[12px] font-semibold leading-none">£</span>;
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6h.01M6 12h.01M6 18h.01" />
      <path d="M10 6h8M10 12h8M10 18h8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default async function AdminBookingsPage({ searchParams }) {
  const params = await searchParams;
  const requestedPage = parsePage(typeof params?.page === "string" ? params.page : "1");

  await connectToDatabase();

  const totalBookings = await Booking.countDocuments().exec();
  const totalPages = Math.max(1, Math.ceil(totalBookings / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const bookings = await Booking.find()
    .populate({ path: "vehicleId", select: "name code" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .lean()
    .exec();

  const startItem = totalBookings === 0 ? 0 : skip + 1;
  const endItem = totalBookings === 0 ? 0 : Math.min(skip + bookings.length, totalBookings);
  const visiblePages = Array.from(new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])).filter(
    (page) => page >= 1 && page <= totalPages,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--admin-text)]">Bookings</p>
          <span className="rounded-full bg-[var(--admin-bg-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--admin-text)]">
            {totalBookings}
          </span>
        </div>
        <p className="text-xs text-[var(--admin-text-muted)]">
          Showing {startItem}-{endItem}
        </p>
      </div>

      <div className="admin-card overflow-hidden">
        {bookings.length === 0 ? (
          <div className="p-4">
            <p className="text-sm text-[var(--admin-text-muted)]">No bookings available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-[var(--admin-bg-soft)]">
                <tr className="text-left">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Order No</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Customer</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Journey</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Pickup</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Fare</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const stopCount = booking.route?.stops?.length || 0;
                  const pickupLabel = compactLocation(booking.route?.pickup, booking.pickup);
                  const dropoffLabel = compactLocation(booking.route?.dropoff, booking.dropoff);
                  const vehicleName = booking.vehicleId?.name || "Vehicle not found";

                  return (
                    <tr key={String(booking._id)} className="border-t border-[var(--admin-border)] align-top">
                      <td className="px-4 py-3.5">
                        <p className="text-lg font-semibold leading-none text-[var(--admin-text)]">
                          {booking.bookingNumber || "N/A"}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-[var(--admin-text)]">{shortText(booking.customerName, 24)}</p>
                        <p className="mt-1 max-w-[210px] break-words text-[13px] text-[var(--admin-text-muted)]">{booking.customerEmail}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-[var(--admin-text)]" title={`${booking.pickup} -> ${booking.dropoff}`}>
                            {pickupLabel} <span className="mx-1 text-[var(--admin-text-muted)]">→</span> {dropoffLabel}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--admin-text-muted)]">
                            <span className="rounded-full bg-[var(--admin-bg-soft)] px-2 py-0.5 uppercase tracking-[0.12em]">
                              {booking.legType || "single"}
                            </span>
                            {stopCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-bg-soft)] px-2 py-0.5">
                                <StopIcon />
                                {stopLabel(stopCount)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5 text-[13px] text-[var(--admin-text-muted)]">
                          <div className="inline-flex items-start gap-1.5">
                            <span className="mt-0.5 text-[var(--admin-primary-end)]">
                              <CalendarIcon />
                            </span>
                            <span>{formatPickupDate(booking.pickupAt, booking.pickupTimeZone)}</span>
                          </div>
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-[var(--admin-primary-end)]">
                              <CarIcon />
                            </span>
                            <span>{shortText(vehicleName, 24)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-full bg-[var(--admin-bg-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text)]">
                          {formatStatus(booking.status)}
                        </span>
                        {booking.assignedDriverName ? (
                          <p className="mt-1.5 text-[12px] text-emerald-700">{booking.assignedDriverName}</p>
                        ) : null}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--admin-text)]">
                          <span className="text-[var(--admin-primary-end)]">
                            <PoundIcon />
                          </span>
                          <span>{Number(booking.total).toFixed(2)}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/bookings/${booking._id}?page=${currentPage}`}
                          className="admin-primary-btn inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium"
                        >
                          <EyeIcon />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalBookings > 0 ? (
        <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-3">
          <p className="text-[12px] text-[var(--admin-text-muted)]">
            Page {currentPage} of {totalPages}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={buildPageHref(Math.max(1, currentPage - 1))}
              aria-disabled={currentPage === 1}
              className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium ${
                currentPage === 1 ? "pointer-events-none bg-slate-100 text-slate-400" : "admin-secondary-btn"
              }`}
            >
              Previous
            </Link>

            {visiblePages.map((page) => (
              <Link
                key={page}
                href={buildPageHref(page)}
                className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium ${
                  page === currentPage ? "admin-primary-btn" : "admin-secondary-btn"
                }`}
              >
                {page}
              </Link>
            ))}

            <Link
              href={buildPageHref(Math.min(totalPages, currentPage + 1))}
              aria-disabled={currentPage === totalPages}
              className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium ${
                currentPage === totalPages ? "pointer-events-none bg-slate-100 text-slate-400" : "admin-secondary-btn"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
