"use client";

import { loadGoogleMapsClient } from "@/lib/google-maps-client";

const ROUTE_METRICS_CACHE_KEY = "route_metrics_cache_v1";
const MAX_CACHE_ITEMS = 40;

/**
 * Creates a stable signature for a location.
 */
function locationSignature(location) {
  if (!location) return "";

  const placeId = String(location.placeId || "")
    .trim()
    .toLowerCase();

  const address = String(
    location.address || location.label || ""
  )
    .trim()
    .toLowerCase();

  const lat = Number.isFinite(location.lat)
    ? Number(location.lat).toFixed(6)
    : "";

  const lng = Number.isFinite(location.lng)
    ? Number(location.lng).toFixed(6)
    : "";

  return [placeId, address, lat, lng].join("|");
}

/**
 * Builds a unique signature for the entire route.
 */
export function buildRouteSignature(
  pickup,
  dropoff,
  stops
) {
  return [
    locationSignature(pickup),
    locationSignature(dropoff),
    ...(stops || []).map((stop) =>
      locationSignature(stop)
    ),
  ].join("::");
}

/**
 * Converts a location into a Routes API location object.
 */
function toRoutesLocation(location) {
  if (!location) return null;

  if (typeof location === "string") {
    return location;
  }

  if (location.placeId) {
    return new window.google.maps.places.Place({
      id: String(location.placeId),
    });
  }

  if (
    typeof location.lat === "number" &&
    typeof location.lng === "number"
  ) {
    return {
      lat: location.lat,
      lng: location.lng,
    };
  }

  if (
    typeof location.latitude === "number" &&
    typeof location.longitude === "number"
  ) {
    return {
      lat: location.latitude,
      lng: location.longitude,
    };
  }

  if (location.address) {
    return location.address;
  }

  return null;
}

/**
 * Reads cached route metrics from sessionStorage.
 */
function readCache() {
  if (typeof window === "undefined") {
    return new Map();
  }

  try {
    const raw = window.sessionStorage.getItem(
      ROUTE_METRICS_CACHE_KEY
    );

    if (!raw) {
      return new Map();
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return new Map();
    }

    return new Map(parsed.slice(-MAX_CACHE_ITEMS));
  } catch {
    return new Map();
  }
}

/**
 * Writes route metrics to sessionStorage.
 */
function writeCache(cacheMap) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const entries = Array.from(cacheMap.entries()).slice(
      -MAX_CACHE_ITEMS
    );

    window.sessionStorage.setItem(
      ROUTE_METRICS_CACHE_KEY,
      JSON.stringify(entries)
    );
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Normalizes numeric metric values.
 */
function normalizeMetric(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return number;
}

/**
 * Calculates route distance and duration using
 * the new Google Maps Routes Library.
 *
 * Returns:
 * {
 *   miles: number,
 *   minutes: number
 * }
 */
export async function calculateRouteMetrics({
  pickup,
  dropoff,
  stops = [],
  apiKey,
}) {
  const signature = buildRouteSignature(
    pickup,
    dropoff,
    stops
  );

  const cache = readCache();
  const cached = cache.get(signature);

  if (
    cached &&
    Number.isFinite(cached.miles) &&
    Number.isFinite(cached.minutes)
  ) {
    return cached;
  }

  if (!apiKey) {
    throw new Error(
      "Google Maps key missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in env."
    );
  }

  // Load the Google Maps JavaScript API.
  await loadGoogleMapsClient(apiKey);

  if (!window.google?.maps?.importLibrary) {
    throw new Error(
      "Google Maps importLibrary is not available."
    );
  }

  // Load the new Routes Library.
  const routesLibrary =
    await window.google.maps.importLibrary("routes");

  const Route = routesLibrary?.Route;

  if (!Route?.computeRoutes) {
    throw new Error(
      "Google Maps Routes Library is not available. " +
        "Make sure the Routes Library is enabled."
    );
  }

  const origin = toRoutesLocation(pickup);
  const destination = toRoutesLocation(dropoff);

  if (!origin || !destination) {
    throw new Error(
      "Pickup and drop-off locations are required."
    );
  }

  const intermediates = (stops || [])
    .map(toRoutesLocation)
    .filter(Boolean);

  try {
    // Request route distance and duration.
    const { routes } = await Route.computeRoutes({
      origin,
      destination,
      intermediates,

      travelMode: "DRIVING",

      region: "uk",

      // Request only the fields required for metrics.
      fields: [
        "distanceMeters",
        "durationMillis",
      ],
    });

    const route = routes?.[0];

    if (!route) {
      throw new Error(
        "Unable to calculate route metrics for selected locations."
      );
    }

    const totalMeters = normalizeMetric(
      route.distanceMeters
    );

    const totalSeconds = normalizeMetric(
      route.durationMillis
    ) / 1000;

    if (totalMeters <= 0 || totalSeconds <= 0) {
      throw new Error(
        "Unable to calculate route metrics for selected locations."
      );
    }

    const miles = Math.max(
      0.1,
      Number((totalMeters / 1609.344).toFixed(2))
    );

    const minutes = Math.max(
      1,
      Math.round(totalSeconds / 60)
    );

    const result = {
      miles,
      minutes,
    };

    cache.set(signature, result);
    writeCache(cache);

    return result;
  } catch (error) {
    console.error(
      "GOOGLE_ROUTES_CALCULATION_ERROR",
      error
    );

    throw new Error(
      error?.message ||
        "Unable to calculate route metrics for selected locations."
    );
  }
}