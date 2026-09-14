import Link from "next/link";
import { notFound } from "next/navigation";
import { assignDriverAction, completeRideAction } from "@/actions/booking-actions";
import { AdminConfirmActionButton } from "@/components/admin/admin-confirm-action-button";
import { connectToDatabase } from "@/lib/db";
import { locationToText } from "@/lib/location-utils";
import { Booking } from "@/models/Booking";

function formatPickupDate(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timeZone || "Europe/London",
    }).format(date);
  } catch {
    return date.toLocaleString("en-GB");
  }
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "BOOKING_CONFIRMED") {
    return "Confirmed";
  }
  return String(status || "").replaceAll("_", " ");
}

function formatMoney(value, currency = "GBP") {
  if (String(currency || "").toUpperCase() === "GBP") {
    return Number(value || 0).toFixed(2);
  }
  return `${currency} ${Number(value || 0).toFixed(2)}`;
}

function formatLegType(legType) {
  if (legType === "inbound") return "Return";
  if (legType === "outbound") return "Outbound";
  return "Single";
}

function ShellCard({ children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-[18px] border border-[#b7c9d8] bg-[#eef4f8] shadow-[0_12px_28px_rgba(30,46,66,0.09)] ${className}`}>
      {children}
    </section>
  );
}

function SectionCard({ title, children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-[18px] border border-[#b7c9d8] bg-[#eef4f8] shadow-[0_12px_28px_rgba(30,46,66,0.09)] ${className}`}>
      <div className="border-b border-[#33456a] bg-[linear-gradient(180deg,#33456a_0%,#2b355d_100%)] px-5 py-3.5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] px-3 py-1.5 text-[12px] text-white/95">
      <span className="mr-1.5 text-white/60">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function InfoBlock({ label, value, subvalue = "", compact = false }) {
  return (
    <div className={`rounded-2xl border border-[#cad7e2] bg-[#f6fafc] px-4 ${compact ? "py-3" : "py-3.5"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#55697e]">{label}</p>
      <p className="mt-1 text-[15px] font-semibold leading-snug text-[var(--admin-text)]">{value}</p>
      {subvalue ? <p className="mt-1 text-[13px] leading-snug text-[var(--admin-text-muted)]">{subvalue}</p> : null}
    </div>
  );
}

function SummaryBlock({ label, value, icon = null }) {
  return (
    <div className="rounded-2xl border border-[#cad7e2] bg-[#f6fafc] px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#55697e]">{label}</p>
      <div className="mt-1.5 flex items-start gap-2 text-[15px] font-semibold leading-snug text-[var(--admin-text)]">
        {icon ? <span className="mt-0.5 text-[var(--admin-primary-end)]">{icon}</span> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function RouteBlock({ label, value, tone, icon }) {
  const toneClass =
    tone === "pickup"
      ? "border-emerald-200 bg-[linear-gradient(180deg,rgba(47,140,66,0.10),rgba(47,140,66,0.06))]"
      : "border-rose-200 bg-[linear-gradient(180deg,rgba(168,79,85,0.10),rgba(168,79,85,0.06))]";

  return (
    <div className={`rounded-2xl border px-4 py-3.5 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-full bg-[#f6fafc] p-2 text-[var(--admin-text)] shadow-[0_1px_2px_rgba(15,23,42,0.05)]">{icon}</span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#55697e]">{label}</p>
          <p className="mt-1 text-[16px] font-semibold leading-snug text-[var(--admin-text)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, currency = "GBP", money = true, emphasize = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 border-b border-[#d4dee7] py-2.5 last:border-b-0 ${emphasize ? "font-semibold" : ""}`}>
      <span className={`text-[14px] ${emphasize ? "text-[var(--admin-text)]" : "text-[var(--admin-text-muted)]"}`}>{label}</span>
      <span className={`inline-flex items-center gap-1.5 ${emphasize ? "text-[16px]" : "text-[14px]"} font-semibold text-[var(--admin-text)]`}>
        {money && String(currency || "").toUpperCase() === "GBP" ? <PoundIcon /> : null}
        <span>{money ? formatMoney(value, currency) : value}</span>
      </span>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function PickupIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function DropoffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v18" />
      <path d="M12 4h7l-2.5 4L19 12h-7" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6h.01M6 12h.01M6 18h.01" />
      <path d="M10 6h8M10 12h8M10 18h8" />
    </svg>
  );
}

function PoundIcon() {
  return <span className="inline-flex h-4 w-4 items-center justify-center text-[13px] font-semibold leading-none">£</span>;
}

export default async function AdminBookingDetailsPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const page = typeof query?.page === "string" && Number(query.page) > 1 ? query.page : "";

  await connectToDatabase();
  const booking = await Booking.findById(id)
    .populate({ path: "vehicleId", select: "name code seats luggage variants description" })
    .populate({ path: "linkedBookingId", select: "bookingRef bookingNumber legType" })
    .lean()
    .exec();

  if (!booking) {
    notFound();
  }

  const breakdown = booking.pricingBreakdown || null;
  const stops = Array.isArray(booking.route?.stops) ? booking.route.stops : [];

  return (
    <div className="mx-auto max-w-[1680px] space-y-5">
      <ShellCard className="bg-[linear-gradient(180deg,#33456a_0%,#2b355d_100%)] text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/88">Booking #</p>
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[var(--admin-text)]">
              {booking.bookingNumber || booking.bookingRef}
            </span>
            <StatChip label="Status" value={formatStatus(booking.status)} />
            <StatChip label="Type" value={formatLegType(booking.legType)} />
          </div>

          <Link href={page ? `/admin/bookings?page=${page}` : "/admin/bookings"} className="rounded-md bg-white px-3.5 py-2 text-sm font-medium text-[var(--admin-text)] shadow-[0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#f3f7fa]">
            Back to bookings
          </Link>
        </div>
      </ShellCard>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="space-y-5">
          <SectionCard title="Reservation Overview">
            <div className="grid gap-4 lg:grid-cols-3">
              <SummaryBlock label="Created At" value={formatDateTime(booking.createdAt)} />
              <SummaryBlock label="Pickup Time" value={formatPickupDate(booking.pickupAt, booking.pickupTimeZone)} icon={<CalendarIcon />} />
              <SummaryBlock label="Journey Summary" value={`${Number(booking.miles || 0).toFixed(2)} miles${stops.length ? ` • ${stops.length} stop${stops.length === 1 ? "" : "s"}` : ""}`} />
            </div>

            <div className="mt-5 space-y-3">
              <RouteBlock label="Pickup" value={locationToText(booking.route?.pickup)} tone="pickup" icon={<PickupIcon />} />
              <RouteBlock label="Drop-off" value={locationToText(booking.route?.dropoff)} tone="dropoff" icon={<DropoffIcon />} />
            </div>

            {stops.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-[#cad7e2] bg-[#e4edf3] p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
                  <StopIcon />
                  <span>Waypoints</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {stops.map((stop, index) => (
                    <div key={`${booking._id}-stop-${index}`} className="rounded-xl border border-[#cad7e2] bg-[#f6fafc] px-4 py-3 text-[14px] font-medium text-[var(--admin-text)]">
                      Stop {index + 1}: {locationToText(stop)}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {booking.linkedBookingId ? (
              <div className="mt-5 rounded-2xl border border-[#cad7e2] bg-[#e4edf3] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">Linked Reservation</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[18px] font-semibold text-[var(--admin-text)]">
                    {booking.linkedBookingId.bookingNumber || booking.linkedBookingId.bookingRef}
                  </p>
                  <Link href={`/admin/bookings/${booking.linkedBookingId._id}`} className="text-sm font-semibold text-sky-700 hover:text-sky-800">
                    Open linked journey
                  </Link>
                </div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Payment Breakdown">
            {breakdown ? (
              <div className="rounded-2xl border border-[#cad7e2] bg-[#e4edf3] px-4">
                <BreakdownRow label="Billable Miles" value={`${Number(breakdown.billableMiles || 0).toFixed(2)} mi`} money={false} />
                <BreakdownRow label="Distance Charge" value={breakdown.distanceCharge} currency={breakdown.currency} />
                <BreakdownRow label="Airport Pickup Fee" value={breakdown.airportPickupFee} currency={breakdown.currency} />
                <BreakdownRow label="Meet & Greet Fee" value={breakdown.meetAndGreetFee} currency={breakdown.currency} />
                <BreakdownRow label="Waypoint Fee" value={breakdown.waypointFee} currency={breakdown.currency} />
                <BreakdownRow label="Night Surcharge" value={breakdown.surchargeTotal} currency={breakdown.currency} />
                <BreakdownRow label="Subtotal" value={breakdown.subtotal} currency={breakdown.currency} />
                <BreakdownRow label="Tax" value={breakdown.taxAmount} currency={breakdown.currency} />
                <BreakdownRow label="Total" value={breakdown.total} currency={breakdown.currency} emphasize />
              </div>
            ) : (
              <p className="text-sm text-[var(--admin-text-muted)]">No pricing breakdown stored for this booking.</p>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Passenger Details">
            <div className="grid gap-3">
              <InfoBlock label="Customer" value={booking.customerName} subvalue={booking.customerEmail} />
              <InfoBlock label="Lead Passenger" value={booking.passengerName} subvalue={booking.passengerPhone} />
              <InfoBlock label="Passengers / Luggage" value={`${booking.passenger?.passengers || "1"} passenger(s)`} subvalue={booking.passenger?.luggage || "No luggage set"} />
              <InfoBlock label="Flight / Arrival" value={booking.passenger?.flightNumber || "No flight number"} subvalue={booking.passenger?.arrivingFrom || "No arrival origin"} />
              <InfoBlock label="Meet & Greet" value={booking.passenger?.meetAndGreet || "no"} compact />
              {booking.passenger?.specialInstructions ? <InfoBlock label="Special Instructions" value={booking.passenger.specialInstructions} /> : null}
            </div>
          </SectionCard>

          <SectionCard title="Vehicle Details">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <InfoBlock label="Vehicle Type" value={booking.vehicleId?.name || "Vehicle not found"} compact />
              <InfoBlock label="Vehicle Code" value={booking.vehicleId?.code || "N/A"} compact />
              <InfoBlock label="Seats" value={String(booking.vehicleId?.seats || 0)} compact />
              <InfoBlock label="Luggage" value={String(booking.vehicleId?.luggage || 0)} compact />
              {booking.vehicleId?.variants || booking.vehicleId?.description ? (
                <InfoBlock label="Vehicle Notes" value={[booking.vehicleId?.variants, booking.vehicleId?.description].filter(Boolean).join(" | ")} />
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Admin Actions">
            <div className="space-y-4">
              <form action={assignDriverAction} className="space-y-3">
                <input type="hidden" name="bookingId" value={String(booking._id)} />
                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-[var(--admin-text)]">Driver Name</span>
                  <input
                    required
                    name="driverName"
                    placeholder="Driver name"
                    defaultValue={booking.assignedDriverName || ""}
                    className="admin-input w-full rounded-md px-3 py-2"
                  />
                </label>
                <div className="flex flex-wrap gap-2.5">
                  <button type="submit" className="admin-primary-btn rounded-md px-4 py-2 font-medium">
                    {booking.assignedDriverName ? "Reassign Driver" : "Assign Driver"}
                  </button>
                  <AdminConfirmActionButton
                    formAction={completeRideAction}
                    confirmMessage="Mark this booking as completed?"
                    className="admin-secondary-btn rounded-md px-4 py-2 font-medium"
                  >
                    Mark Completed
                  </AdminConfirmActionButton>
                </div>
              </form>

              {booking.assignedDriverName ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  Assigned driver: {booking.assignedDriverName}
                </div>
              ) : null}

              {booking.notes ? (
                <div className="rounded-xl border border-[#cad7e2] bg-[#e4edf3] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">Booking Notes</p>
                  <p className="mt-1 text-[14px] text-[var(--admin-text)]">{booking.notes}</p>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
