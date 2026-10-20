
import { StatesManager } from "@/components/admin/states-manager";
import { connectToDatabase } from "@/lib/db";
import { State } from "@/models/State";

export default async function AdminStatesPage() {
  await connectToDatabase();

  const states = await State.find()
    .sort({ order: 1, name: 1 })
    .lean()
    .exec();

  const serializedStates = JSON.parse(
    JSON.stringify(
      states.map((state) => ({
        ...state,
        linkedVehicleRatesCount: 0,
      })),
    ),
  );

  return <StatesManager initialStates={serializedStates} />;
}
