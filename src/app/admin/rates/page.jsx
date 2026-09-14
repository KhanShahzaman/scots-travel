import Link from "next/link";
import { connectToDatabase } from "@/lib/db";
import { State } from "@/models/State";
import { StateVehicleRate } from "@/models/StateVehicleRate";

export default async function AdminRatesStateSelectorPage() {
  await connectToDatabase();

  const [states, groupedCounts] = await Promise.all([
    State.find().sort({ order: 1, name: 1 }).lean().exec(),
    StateVehicleRate.aggregate([
      { $group: { _id: "$stateId", count: { $sum: 1 } } },
    ]),
  ]);

  const countsByStateId = groupedCounts.reduce((acc, row) => {
    acc[String(row._id)] = row.count;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="admin-card sticky top-0 z-20 p-4">
        <h1 className="text-3xl font-semibold text-[var(--admin-text)]">Rates</h1>
        <p className="admin-muted mt-2 text-base">
          Select a state to open its dedicated rates page.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {states.map((state) => (
          <Link
            key={String(state._id)}
            href={`/admin/rates/${state._id}`}
            className="admin-card admin-link-card p-5 transition"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--admin-text-muted)]">{state.code}</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--admin-text)]">{state.name}</h2>
            <p className="admin-muted mt-2 text-base">Rates configured: {countsByStateId[String(state._id)] || 0}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
