const UK_COUNTRY_CODES = new Set(["GB", "UK"]);
const UK_COUNTRY_NAMES = new Set(["UNITED KINGDOM", "GREAT BRITAIN", "ENGLAND", "SCOTLAND", "WALES", "NORTHERN IRELAND"]);

export function locationToText(location) {
  if (!location) return "";
  if (typeof location === "string") return location;

  const address = String(location.address || location.label || "").trim();
  if (address) return address;

  const cityState = [location.city, location.state].filter(Boolean).join(", ");
  return cityState || "";
}

export function normalizeClientLocation(location) {
  const source = location || {};
  const address = String(source.address || source.label || "");
  const label = String(source.label || address || "");
  const countryCode = String(source.countryCode || "").trim().toUpperCase();
  const country = String(source.country || "").trim();
  const normalizedCountryName = country.toUpperCase();
  const types = Array.isArray(source.types) ? source.types.map((item) => String(item)) : [];
  const isAirport = Boolean(source.isAirport) || types.includes("airport") || /\bairport\b/i.test(address);
  const isHospital =
    Boolean(source.isHospital) ||
    types.includes("hospital") ||
    types.includes("health") ||
    /\b(hospital|clinic|medical)\b/i.test(address);
  const isUk =
    UK_COUNTRY_CODES.has(countryCode) ||
    UK_COUNTRY_NAMES.has(normalizedCountryName) ||
    /\b(UK|UNITED KINGDOM|ENGLAND|SCOTLAND|WALES|NORTHERN IRELAND)\b/i.test(address);

  return {
    label,
    address,
    city: String(source.city || "").trim(),
    state: String(source.state || "").trim(),
    zipcode: String(source.zipcode || "").trim(),
    country,
    countryCode,
    placeId: String(source.placeId || "").trim(),
    lat: Number.isFinite(source.lat) ? Number(source.lat) : null,
    lng: Number.isFinite(source.lng) ? Number(source.lng) : null,
    types,
    isAirport,
    isHospital,
    isUk,
    type: isAirport ? "airport" : isHospital ? "hospital" : "address",
  };
}

export function toApiLocationPayload(location) {
  const normalized = normalizeClientLocation(location);
  return {
    label: normalized.label,
    address: normalized.address,
    city: normalized.city,
    state: normalized.state,
    zipcode: normalized.zipcode || "",
    country: normalized.country,
    countryCode: normalized.countryCode,
    placeId: normalized.placeId,
    lat: normalized.lat,
    lng: normalized.lng,
    types: normalized.types,
    isAirport: normalized.isAirport,
    isHospital: normalized.isHospital,
    isUk: normalized.isUk,
    type: normalized.type,
  };
}

export function isUkLocation(location) {
  const normalized = normalizeClientLocation(location);
  return Boolean(normalized.isUk);
}
