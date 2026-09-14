import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoPrintOnLoad } from "@/components/auto-print-on-load";
import { PrintPageActions } from "@/components/print-page-actions";
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

export default async function QuoteSuccessPrintPage({ searchParams }) {
  const session = await getAuthSession();
  const params = await searchParams;
  const refs = parseRefs(typeof params.refs === "string" ? params.refs : "");
  const group = typeof params.group === "string" ? params.group : "";

  if (!session?.user?.email) {
    const next = `/quote/success/print${refs.length || group ? `?${new URLSearchParams({ refs: refs.join(","), group }).toString()}` : ""}`;
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

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 print:bg-white print:px-0 print:py-0">
      <AutoPrintOnLoad />

      <style>{`
        @page {
          size: A4;
          margin: 14mm;
        }

        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-[28px] bg-white p-6 text-slate-900 shadow-[0_20px_48px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 print:shadow-none print:ring-slate-300">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
            style={{ backgroundImage: "url('/images/jewels-home-bg.jpg')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(241,245,249,0.94))]" />
          <div className="relative z-10">
            <div className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-white">
              Scot Travels Confirmation
            </div>
            <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-sky-700">Reservation Confirmed</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-slate-950">Booking confirmation</h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Use your browser print dialog to save this page as a PDF. Booking details are listed below.
            </p>
            {firstBooking?.tripGroupId ? (
              <p className="mt-4 text-sm text-slate-600">Trip group: {firstBooking.tripGroupId}</p>
            ) : null}
          </div>
        </section>

        <div className="no-print flex flex-wrap gap-3">
          <PrintPageActions />
          <Link
            href={`/quote/success?${new URLSearchParams({ refs: refs.join(","), group }).toString()}`}
            className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-slate-900 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
          >
            Back to confirmation
          </Link>
        </div>

        {bookings.map((booking) => {
          const vehicleName =
            booking?.vehicleId && typeof booking.vehicleId === "object" && "name" in booking.vehicleId
              ? booking.vehicleId.name
              : "Vehicle not found";

          return (
            <article
              key={String(booking._id)}
              className="overflow-hidden rounded-3xl bg-white p-6 text-slate-900 shadow-[0_20px_48px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 print:break-inside-avoid print:shadow-none print:ring-slate-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#8fd9f4]">
                    {getLegLabel(booking, bookings.length)}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-950">
                    {booking.bookingNumber || booking.bookingRef}
                  </h2>
                </div>
                <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white">
                  {String(booking.status || "").replaceAll("_", " ")}
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Journey</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div className="rounded-xl bg-emerald-50 px-4 py-3">
                      <span className="mr-2 font-semibold text-emerald-700">From:</span>
                      <span>{locationToText(booking.route?.pickup)}</span>
                    </div>
                    <div className="rounded-xl bg-rose-50 px-4 py-3">
                      <span className="mr-2 font-semibold text-rose-700">To:</span>
                      <span>{locationToText(booking.route?.dropoff)}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                        <span className="mr-2 font-semibold text-slate-900">Pickup:</span>
                        <span>{formatPickupDate(booking.pickupAt, booking.pickupTimeZone)}</span>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                        <span className="mr-2 font-semibold text-slate-900">Vehicle:</span>
                        <span>{vehicleName}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Passenger</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">Lead Passenger:</span> {booking.passengerName}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Phone:</span> {booking.passengerPhone}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Email:</span> {booking.customerEmail}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Passengers:</span> {booking.passenger?.passengers || "1"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Fare:</span> {formatMoney(booking.total, booking.currency)}
                    </p>
                  </div>
                </section>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
