import Link from "next/link";
import { connectToDatabase } from "@/lib/db";
import { State } from "@/models/State";
import { Vehicle } from "@/models/Vehicle";

export default async function AdminResourcesPage() {
  await connectToDatabase();

  const [statesCount, vehiclesCount] = await Promise.all([
    State.countDocuments().exec(),
    Vehicle.countDocuments().exec(),
  ]);

  return (
    <div className="space-y-5">
      <div className="admin-card sticky top-0 z-20 p-4">
        <h1 className="text-3xl font-semibold text-[var(--admin-text)]">Resources</h1>
        <p className="admin-muted mt-2 text-base">
          Manage resources. Use the States section to open state-specific rates.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <Link href="/admin/states" className="admin-card admin-link-card p-5 transition">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--admin-text-muted)]">States</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--admin-text)]">{statesCount}</p>
          <p className="admin-muted mt-2 text-base">Create states and open state-specific rates from each card.</p>
        </Link>

        <Link href="/admin/vehicles" className="admin-card admin-link-card p-5 transition">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--admin-text-muted)]">Vehicles</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--admin-text)]">{vehiclesCount}</p>
          <p className="admin-muted mt-2 text-base">Create vehicles once and reuse in all states.</p>
        </Link>
      </div>
    </div>
  );
}
