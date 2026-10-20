
import { connectToDatabase } from "@/lib/db";
import { Vehicle } from "@/models/Vehicle";
import { VehicleRate } from "@/models/StateVehicleRate";
import { RatesManager } from "@/components/admin/rates-manager";

export default async function AdminRatesPage() {
  await connectToDatabase();

  const [vehicles, rates] = await Promise.all([
    Vehicle.find()
      .sort({ order: 1, name: 1 })
      .lean()
      .exec(),

    VehicleRate.find()
      .populate({
        path: "vehicleId",
        select: "name code description variants order seats luggage active image",
      })
      .sort({ updatedAt: -1 })
      .lean()
      .exec(),
  ]);

  return (
    <div className="space-y-4">
      <div className="admin-card sticky top-0 z-20 p-4">
        <h1 className="text-3xl font-semibold text-[var(--admin-text)]">
          Rates
        </h1>

        <p className="admin-muted mt-2 text-base">
          Manage common pricing for all pickup and drop-off locations.
        </p>
      </div>

      <RatesManager
        initialVehicles={JSON.parse(JSON.stringify(vehicles))}
        initialRates={JSON.parse(JSON.stringify(rates))}
      />
    </div>
  );
}
