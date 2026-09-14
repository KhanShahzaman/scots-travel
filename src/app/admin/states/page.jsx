import { StatesManager } from "@/components/admin/states-manager";
import { connectToDatabase } from "@/lib/db";
import { State } from "@/models/State";
import { StateVehicleRate } from "@/models/StateVehicleRate";

export default async function AdminStatesPage() {
  await connectToDatabase();
  const [states, rateCounts] = await Promise.all([
    State.find().sort({ order: 1, name: 1 }).lean().exec(),
    StateVehicleRate.aggregate([
      { $group: { _id: "$stateId", count: { $sum: 1 } } },
    ]),
  ]);

  const rateCountLookup = rateCounts.reduce((accumulator, item) => {
    accumulator[String(item._id)] = Number(item.count || 0);
    return accumulator;
  }, {});

  const statesWithCounts = states.map((state) => ({
    ...state,
    linkedVehicleRatesCount: rateCountLookup[String(state._id)] || 0,
  }));

  return <StatesManager initialStates={statesWithCounts} />;
}
