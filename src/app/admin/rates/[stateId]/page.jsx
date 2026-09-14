import { notFound } from "next/navigation";
import { RatesManager } from "@/components/admin/rates-manager";
import { connectToDatabase } from "@/lib/db";
import { State } from "@/models/State";
import { StateVehicleRate } from "@/models/StateVehicleRate";
import { Vehicle } from "@/models/Vehicle";

export default async function AdminStateRatesPage({ params }) {
  await connectToDatabase();
  const { stateId } = await params;

  const [state, vehicles, rates] = await Promise.all([
    State.findById(stateId).lean().exec(),
    Vehicle.find().sort({ order: 1, name: 1 }).lean().exec(),
    StateVehicleRate.find({ stateId })
      .populate({ path: "stateId", select: "name code active" })
      .populate({ path: "vehicleId", select: "name code order active image" })
      .sort({ updatedAt: -1 })
      .lean()
      .exec(),
  ]);

  if (!state) {
    notFound();
  }

  return (
    <RatesManager
      initialStates={[state]}
      initialVehicles={vehicles}
      initialRates={rates}
      lockedStateId={String(state._id)}
      lockedStateName={state.name}
      lockedStateCode={state.code}
    />
  );
}
