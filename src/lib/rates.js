export const RATE_PROFILES = [
  {
    vehicleClass: "executive",
    label: "Executive Saloon",
    perMile: 4.2,
    minimumBillableMiles: 3,
    airportPickupFee: 8,
    meetAndGreetFee: 12,
    waypointFee: 6,
    nightMultiplier: 1.1,
    taxRate: 0.2,
    currency: "GBP",
  },
  {
    vehicleClass: "luxury",
    label: "Luxury Class",
    perMile: 6.5,
    minimumBillableMiles: 3,
    airportPickupFee: 10,
    meetAndGreetFee: 15,
    waypointFee: 8,
    nightMultiplier: 1.15,
    taxRate: 0.2,
    currency: "GBP",
  },
  {
    vehicleClass: "mpv",
    label: "MPV 6-8 Seater",
    perMile: 5.3,
    minimumBillableMiles: 3,
    airportPickupFee: 9,
    meetAndGreetFee: 14,
    waypointFee: 7,
    nightMultiplier: 1.12,
    taxRate: 0.2,
    currency: "GBP",
  },
];

export function getRateProfile(vehicleClass) {
  return RATE_PROFILES.find((profile) => profile.vehicleClass === vehicleClass);
}
