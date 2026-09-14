import { getRateProfile } from "@/lib/rates";

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

export function calculateFare(input) {
  const rate = getRateProfile(input.vehicleClass);

  if (!rate) {
    throw new Error("Rate profile not found for selected vehicle class.");
  }

  const billableMiles = Math.max(input.miles, rate.minimumBillableMiles);
  const distanceCharge = billableMiles * rate.perMile;
  const meetAndGreetFee = input.includeMeetAndGreet ? rate.meetAndGreetFee : 0;
  const waypointFee = input.waypoints > 0 ? input.waypoints * rate.waypointFee : 0;

  const baseSubtotal =
    distanceCharge + rate.airportPickupFee + meetAndGreetFee + waypointFee;

  const surchargeTotal = input.isNightRide
    ? baseSubtotal * (rate.nightMultiplier - 1)
    : 0;

  const subtotal = baseSubtotal + surchargeTotal;
  const taxAmount = subtotal * rate.taxRate;
  const total = subtotal + taxAmount;

  return {
    billableMiles: roundCurrency(billableMiles),
    perMile: roundCurrency(rate.perMile),
    distanceCharge: roundCurrency(distanceCharge),
    airportPickupFee: roundCurrency(rate.airportPickupFee),
    meetAndGreetFee: roundCurrency(meetAndGreetFee),
    waypointFee: roundCurrency(waypointFee),
    surchargeTotal: roundCurrency(surchargeTotal),
    subtotal: roundCurrency(subtotal),
    taxAmount: roundCurrency(taxAmount),
    total: roundCurrency(total),
    currency: rate.currency,
  };
}
