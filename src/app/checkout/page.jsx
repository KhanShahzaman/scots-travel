import { redirect } from "next/navigation";
import { createBookingFromQuoteAction } from "@/actions/booking-actions";
import { getAuthSession } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/db";
import { locationToText } from "@/lib/location-utils";
import { Quote } from "@/models/Quote";

export default async function CheckoutPage({ searchParams }) {
  const session = await getAuthSession();
  const params = await searchParams;
  const quoteId = typeof params.quoteId === "string" ? params.quoteId : "";

  if (!session?.user) {
    redirect(`/login?next=/checkout?quoteId=${quoteId}`);
  }

  if (!quoteId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Missing quote ID. Start from the quote page.
      </div>
    );
  }

  await connectToDatabase();
  const quote = await Quote.findById(quoteId).lean().exec();

  if (!quote) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        Quote not found. Please generate a new quote.
      </div>
    );
  }

  const pickupText = locationToText(quote.pickup);
  const dropoffText = locationToText(quote.dropoff);
  const stops = Array.isArray(quote.stops) ? quote.stops : [];
  const vehicleName = quote.vehicleName || quote.vehicleClass || quote.vehicleCode || "Selected Vehicle";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Complete Reservation</h1>
        <p className="mt-2 text-sm text-slate-600">Signed in as {session.user.email}</p>

        <dl className="mt-6 space-y-3 text-sm text-slate-700">
          <div className="flex justify-between gap-4">
            <dt>Route</dt>
            <dd className="text-right">{pickupText} → {dropoffText}</dd>
          </div>
          {stops.length > 0 ? (
            <div className="flex justify-between gap-4">
              <dt>Stops</dt>
              <dd className="text-right">
                {stops.map((stop, index) => (
                  <span key={`stop-${index}`}>
                    {locationToText(stop)}
                    {index < stops.length - 1 ? ", " : ""}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt>Vehicle</dt>
            <dd>{vehicleName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Distance</dt>
            <dd>{Number(quote.miles || quote.breakdown.billableMiles).toFixed(2)} miles</dd>
          </div>
          <div className="flex justify-between gap-4 text-base font-semibold text-slate-900">
            <dt>Total</dt>
            <dd>
              {quote.breakdown.currency} {Number(quote.breakdown.total).toFixed(2)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Passenger & Trip Details</h2>
        <p className="mt-2 text-sm text-slate-600">
          Confirm details below. On submit, reservation will be created immediately.
        </p>

        <form action={createBookingFromQuoteAction} className="mt-5 space-y-4">
          <input type="hidden" name="quoteId" value={String(quote._id)} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Passenger full name</label>
            <input
              required
              name="passengerName"
              defaultValue={session.user.name || ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Passenger phone</label>
            <input
              required
              name="passengerPhone"
              type="tel"
              placeholder="+44 ..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Pickup date/time</label>
            <input
              required
              type="datetime-local"
              name="pickupAt"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Flight number (optional)</label>
              <input
                name="flightNumber"
                placeholder="e.g. BA145"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Stops count</label>
              <input
                readOnly
                value={stops.length}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Additional notes (optional)</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Pickup instructions, luggage notes, child seat request..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Confirm Reservation
          </button>
        </form>
      </section>
    </div>
  );
}
