import { State } from "@/models/State";
import { StateVehicleRate } from "@/models/StateVehicleRate";
import "@/models/Vehicle";

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function matchesState(state, pickup) {
  const stateName = normalizeText(state?.name);
  const stateCode = normalizeText(state?.code);
  const pickupState = normalizeText(pickup?.state);
  const pickupAddress = normalizeText(pickup?.address);

  if (!stateName && !stateCode) {
    return false;
  }

  if (stateCode && pickupState && pickupState === stateCode) {
    return true;
  }

  if (stateName && pickupState && pickupState === stateName) {
    return true;
  }

  if (stateName && pickupAddress.includes(stateName)) {
    return true;
  }

  return false;
}

function resolveStateForPickup(states, pickup) {
  const activeStates = (states || []).filter((state) => state.active);
  if (activeStates.length === 0) {
    return null;
  }

  const exactMatch = activeStates.find((state) => matchesState(state, pickup));
  if (exactMatch) {
    return exactMatch;
  }

  if (activeStates.length === 1) {
    return activeStates[0];
  }

  return null;
}

function computeDistanceChargeProgressive(billableMiles, slabsInput) {
  const slabs = [...(slabsInput || [])].sort((a, b) => (a.order || 0) - (b.order || 0) || a.fromMiles - b.fromMiles);
  let distanceCharge = 0;

  for (const slab of slabs) {
    const lowerBound = Number(slab.fromMiles) - 1;
    const upperBound = slab.toMiles == null ? Number.POSITIVE_INFINITY : Number(slab.toMiles);
    const coveredMiles = Math.max(0, Math.min(billableMiles, upperBound) - lowerBound);
    if (coveredMiles <= 0) {
      continue;
    }

    distanceCharge += coveredMiles * Number(slab.ratePerMile);
    if (billableMiles <= upperBound) {
      break;
    }
  }

  return roundCurrency(distanceCharge);
}

function parseTimeToMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function resolvePickupMinutes(pickupAtLocal) {
  const match = /T(\d{2}):(\d{2})/.exec(String(pickupAtLocal || "").trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isNightSurchargeApplicable(pickupAtLocal, rate) {
  const pickupMinutes = resolvePickupMinutes(pickupAtLocal);
  const startMinutes = parseTimeToMinutes(rate?.nightWindowStart);
  const endMinutes = parseTimeToMinutes(rate?.nightWindowEnd);

  if (pickupMinutes == null || startMinutes == null || endMinutes == null) {
    return false;
  }

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return pickupMinutes >= startMinutes && pickupMinutes < endMinutes;
  }

  return pickupMinutes >= startMinutes || pickupMinutes < endMinutes;
}

function calculateRateBreakdown({
  miles,
  includeMeetAndGreet,
  pickupAtLocal,
  waypoints,
  rate,
}) {
  const billableMiles = Math.max(Number(miles), Number(rate.minimumBillableMiles || 1));
  const distanceCharge = computeDistanceChargeProgressive(billableMiles, rate.slabs);
  const airportPickupFee = Number(rate.airportPickupFee || 0);
  const meetAndGreetFee = includeMeetAndGreet ? Number(rate.meetAndGreetFee || 0) : 0;
  const waypointFee = waypoints > 0 ? waypoints * Number(rate.waypointFee || 0) : 0;
  const baseSubtotal = distanceCharge + airportPickupFee + meetAndGreetFee + waypointFee;
  const nightSurchargeApplied = isNightSurchargeApplicable(pickupAtLocal, rate);
  const surchargeTotal = nightSurchargeApplied ? Number(rate.nightSurchargeFee || 0) : 0;
  const subtotal = baseSubtotal + surchargeTotal;
  const taxAmount = subtotal * Number(rate.taxRate || 0);
  const total = subtotal + taxAmount;

  return {
    billableMiles: roundCurrency(billableMiles),
    perMile: billableMiles > 0 ? roundCurrency(distanceCharge / billableMiles) : 0,
    distanceCharge: roundCurrency(distanceCharge),
    airportPickupFee: roundCurrency(airportPickupFee),
    meetAndGreetFee: roundCurrency(meetAndGreetFee),
    waypointFee: roundCurrency(waypointFee),
    surchargeTotal: roundCurrency(surchargeTotal),
    nightSurchargeApplied,
    subtotal: roundCurrency(subtotal),
    taxAmount: roundCurrency(taxAmount),
    total: roundCurrency(total),
    currency: "GBP",
  };
}

export async function getQuotePreview({ pickup, miles, stops, includeMeetAndGreet, pickupAtLocal, vehicleCode }) {
  const states = await State.find({ active: true }).sort({ order: 1, name: 1 }).lean().exec();

  const state = resolveStateForPickup(states, pickup);
  if (!state) {
    throw new Error("No matching active state found for pickup location.");
  }

  const rates = await StateVehicleRate.find({ active: true, stateId: state._id })
    .populate({ path: "stateId", select: "name code order active" })
    .populate({ path: "vehicleId", select: "name code description variants order seats luggage active image" })
    .lean()
    .exec();

  const stateRates = rates
    .filter((rate) => rate.vehicleId?.active)
    .sort((firstRate, secondRate) => {
      const firstOrder = Number(firstRate.vehicleId?.order ?? 0);
      const secondOrder = Number(secondRate.vehicleId?.order ?? 0);
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return String(firstRate.vehicleId?.name || "").localeCompare(String(secondRate.vehicleId?.name || ""));
    });

  if (stateRates.length === 0) {
    throw new Error(`No active rates configured for state ${state.name}.`);
  }

  const waypoints = Array.isArray(stops) ? stops.length : 0;
  const options = stateRates.map((rate) => {
    const breakdown = calculateRateBreakdown({
      miles,
      includeMeetAndGreet,
      pickupAtLocal,
      waypoints,
      rate,
    });

    return {
      vehicle: {
        id: String(rate.vehicleId._id),
        code: String(rate.vehicleId.code),
        name: String(rate.vehicleId.name),
        description: String(rate.vehicleId.description || ""),
        variants: String(rate.vehicleId.variants || ""),
        order: Number(rate.vehicleId.order || 0),
        seats: Number(rate.vehicleId.seats || 0),
        luggage: Number(rate.vehicleId.luggage || 0),
        image: rate.vehicleId.image || null,
      },
      rateId: String(rate._id),
      breakdown,
    };
  });

  const selectedOption = vehicleCode
    ? options.find((option) => option.vehicle.code === String(vehicleCode).toLowerCase())
    : null;

  return {
    state: {
      id: String(state._id),
      name: state.name,
      code: state.code,
    },
    options,
    selectedOption: selectedOption || null,
  };
}
