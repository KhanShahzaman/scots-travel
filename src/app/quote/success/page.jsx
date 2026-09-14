import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingConfirmationActions } from "@/components/booking-confirmation-actions";
import { getAuthSession } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/db";
import { locationToText } from "@/lib/location-utils";
import { Booking } from "@/models/Booking";
import { User } from "@/models/User";
import "@/models/Vehicle";

function parseRefs(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function legSortValue(legType) {
  switch (legType) {
    case "single":
      return 0;
    case "outbound":
      return 1;
    case "inbound":
      return 2;
    default:
      return 9;
  }
}

function getLegLabel(booking, totalBookings) {
  if (booking.legType === "single") return "Confirmed Booking";
  if (booking.legType === "outbound") return totalBookings > 1 ? "Outbound Journey" : "Primary Journey";
  if (booking.legType === "inbound") return "Return Journey";
  return "Booking";
}

function getLegBadgeClasses(legType) {
  if (legType === "inbound") {
    return "bg-[rgba(115,85,178,0.18)] text-violet-100 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.26)]";
  }

  if (legType === "outbound") {
    return "bg-[rgba(25,117,164,0.2)] text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,200,238,0.24)]";
  }

  return "bg-[rgba(42,145,107,0.2)] text-emerald-100 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.22)]";
}

function formatMoney(value, currency = "GBP") {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

function formatPickupDate(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Pickup schedule unavailable";
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

function detailText(value, fallback = "Not provided") {
  const text = String(value || "").trim();
  return text || fallback;
}

function ConfirmationCard({ booking, totalBookings }) {
  const bookingNumber = booking.bookingNumber || booking.bookingRef;
  const vehicleName =
    booking?.vehicleId && typeof booking.vehicleId === "object" && "name" in booking.vehicleId
      ? booking.vehicleId.name
      : "Vehicle not found";

  return (
    <article className="rounded-2xl bg-[linear-gradient(180deg,rgba(27,43,63,0.96),rgba(18,31,47,0.92))] p-5 text-white shadow-[0_24px_56px_rgba(2,9,18,0.32),inset_0_1px_0_rgba(255,255,255,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#8fd9f4]">{getLegLabel(booking, totalBookings)}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-white">{bookingNumber}</h2>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className={`rounded-full px-3 py-1.5 ${getLegBadgeClasses(booking.legType)}`}>
            {booking.legType === "inbound" ? "Return" : booking.legType === "outbound" ? "Outbound" : "Single"}
          </span>
          <span className="rounded-full bg-[rgba(255,255,255,0.08)] px-3 py-1.5 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {booking.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl bg-[linear-gradient(180deg,rgba(11,23,37,0.88),rgba(16,28,42,0.78))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#67c8ee]">Journey</p>
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <div className="rounded-lg bg-[rgba(47,140,66,0.22)] px-4 py-3">
              <span className="mr-2 font-semibold text-emerald-200">From:</span>
              <span>{locationToText(booking.route?.pickup)}</span>
            </div>
            <div className="rounded-lg bg-[rgba(168,79,85,0.22)] px-4 py-3">
              <span className="mr-2 font-semibold text-rose-200">To:</span>
              <span>{locationToText(booking.route?.dropoff)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[rgba(255,255,255,0.06)] px-4 py-3">
                <span className="mr-2 font-semibold text-white">Pickup:</span>
                <span>{formatPickupDate(booking.pickupAt, booking.pickupTimeZone)}</span>
              </div>
              <div className="rounded-lg bg-[rgba(255,255,255,0.06)] px-4 py-3">
                <span className="mr-2 font-semibold text-white">Vehicle:</span>
                <span>{vehicleName}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-[linear-gradient(180deg,rgba(11,23,37,0.88),rgba(16,28,42,0.78))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#67c8ee]">Passenger</p>
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Lead Passenger</p>
              <p className="mt-1 text-base font-medium text-white">{detailText(booking.passengerName)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Contact</p>
              <p className="mt-1 text-base font-medium text-white">{detailText(booking.passengerPhone)}</p>
              <p className="mt-1 text-sm text-slate-300">{detailText(booking.customerEmail)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[rgba(255,255,255,0.06)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Passengers</p>
                <p className="mt-1 text-base font-medium text-white">{detailText(booking.passenger?.passengers, "1")}</p>
              </div>
              <div className="rounded-lg bg-[rgba(255,255,255,0.06)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Fare</p>
                <p className="mt-1 text-base font-medium text-white">{formatMoney(booking.total, booking.currency)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

export default async function QuoteSuccessPage({ searchParams }) {
  const session = await getAuthSession();
  const params = await searchParams;
  const refs = parseRefs(typeof params.refs === "string" ? params.refs : "");
  const group = typeof params.group === "string" ? params.group : "";

  if (!session?.user?.email) {
    const next = `/quote/success${refs.length || group ? `?${new URLSearchParams({ refs: refs.join(","), group }).toString()}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (refs.length === 0 && !group) {
    redirect("/dashboard");
  }

  await connectToDatabase();

  const user = await User.findOne({ email: session.user.email.toLowerCase() }).select("_id").lean().exec();

  if (!user?._id) {
    redirect("/dashboard");
  }

  const bookings = await Booking.find({
    userId: user._id,
    ...(refs.length > 0 ? { bookingRef: { $in: refs } } : { tripGroupId: group }),
  })
    .populate({ path: "vehicleId", select: "name code" })
    .lean()
    .exec();

  bookings.sort((left, right) => legSortValue(left.legType) - legSortValue(right.legType));

  const firstBooking = bookings[0] || null;
  const bookingNumberList = bookings.map((booking) => booking.bookingNumber || booking.bookingRef).filter(Boolean);
  const hasReturnTrip = bookings.some((booking) => booking.legType === "inbound");

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <section className="rounded-[28px] bg-[linear-gradient(180deg,rgba(29,46,66,0.96),rgba(20,34,52,0.92))] p-6 text-white shadow-[0_28px_64px_rgba(2,9,18,0.34),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8fd9f4]">Reservation Confirmed</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-white">Your booking is locked in.</h1>
            <p className="mt-3 text-base text-slate-200">
              {hasReturnTrip
                ? "Both journey legs are confirmed. Keep these booking numbers handy for support and driver updates."
                : "Your journey is confirmed. Keep this booking number handy for support and driver updates."}
            </p>
          </div>

          <div className="min-w-[220px] rounded-2xl bg-[rgba(9,20,33,0.42)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Booking Numbers</p>
            <div className="mt-3 space-y-2">
              {bookingNumberList.length > 0 ? (
                bookingNumberList.map((bookingNumber) => (
                  <div
                    key={bookingNumber}
                    className="rounded-xl bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  >
                    {bookingNumber}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-300">We could not load the booking card yet. You can still check it in your dashboard.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {bookings.length > 0 ? (
        <div className="space-y-5">
          {bookings.map((booking) => (
            <ConfirmationCard
              key={String(booking._id)}
              booking={booking}
              totalBookings={bookings.length}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.96),rgba(20,34,52,0.92))] p-6 text-white shadow-[0_24px_54px_rgba(2,9,18,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <h2 className="text-2xl font-semibold">Booking created, but summary is not available here yet.</h2>
          <p className="mt-3 text-sm text-slate-200">
            The reservation may already exist. Open your dashboard to verify the latest booking record.
          </p>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[linear-gradient(180deg,rgba(27,43,63,0.96),rgba(18,31,47,0.92))] p-5 text-white shadow-[0_20px_48px_rgba(2,9,18,0.28),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div>
          <p className="text-lg font-semibold text-white">Next steps</p>
          <p className="mt-1 text-sm text-slate-300">You can track this booking in your dashboard or start a new quote.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {bookingNumberList.length > 0 ? (
            <BookingConfirmationActions
              refs={refs}
              tripGroupId={firstBooking?.tripGroupId || ""}
            />
          ) : null}
          <Link
            href="/dashboard"
            className="rounded-md bg-[rgba(255,255,255,0.08)] px-5 py-2.5 text-sm font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.14)]"
          >
            Open Dashboard
          </Link>
          <Link href="/quote" className="site-primary-btn rounded-md px-5 py-2.5 text-sm font-semibold">
            Book Another Ride
          </Link>
        </div>
      </section>
    </div>
  );
}
