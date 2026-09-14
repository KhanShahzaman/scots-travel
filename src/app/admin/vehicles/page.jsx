import { VehiclesManager } from "@/components/admin/vehicles-manager";
import { connectToDatabase } from "@/lib/db";
import { Vehicle } from "@/models/Vehicle";

export default async function AdminVehiclesPage() {
  await connectToDatabase();
  const vehicles = await Vehicle.find().sort({ order: 1, name: 1 }).lean().exec();

  return <VehiclesManager initialVehicles={vehicles} />;
}
