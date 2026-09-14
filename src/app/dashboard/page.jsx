import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { connectToDatabase } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { User } from "@/models/User";

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    redirect("/login?next=/dashboard");
  }

  await connectToDatabase();

  const user = await User.findOne({ email: session.user.email.toLowerCase() }).lean().exec();

  const bookings = user
    ? await Booking.find({ userId: user._id })
        .populate({ path: "vehicleId", select: "name code" })
        .sort({ createdAt: -1 })
        .lean()
        .exec()
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Track your bookings and ride status.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Bookings</h2>
        </div>
        <div className="p-5">
          {bookings.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">No bookings yet.</p>
              <Link
                href="/quote"
                className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Get a Quote
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <article key={String(booking._id)} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{booking.bookingNumber || booking.bookingRef}</p>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {booking.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Internal Ref: {booking.bookingRef}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {booking.pickup} → {booking.dropoff}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Pickup: {new Date(booking.pickupAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Journey: {booking.legType || "single"} {booking.tripGroupId ? `| ${booking.tripGroupId}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Vehicle: {booking.vehicleId?.name || "Vehicle not found"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {booking.currency} {Number(booking.total).toFixed(2)}
                  </p>
                  {booking.assignedDriverName ? (
                    <p className="mt-1 text-sm text-emerald-700">Driver: {booking.assignedDriverName}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
