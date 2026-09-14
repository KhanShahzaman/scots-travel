"use client";

import { loadGoogleMapsClient } from "@/lib/google-maps-client";

const ROUTE_METRICS_CACHE_KEY = "route_metrics_cache_v1";
const MAX_CACHE_ITEMS = 40;

function locationSignature(location) {
  if (!location) return "";

  const placeId = String(location.placeId || "").trim().toLowerCase();
  const address = String(location.address || location.label || "").trim().toLowerCase();
  const lat = Number.isFinite(location.lat) ? Number(location.lat).toFixed(6) : "";
  const lng = Number.isFinite(location.lng) ? Number(location.lng).toFixed(6) : "";
  return [placeId, address, lat, lng].join("|");
}

export function buildRouteSignature(pickup, dropoff, stops) {
  return [
    locationSignature(pickup),
    locationSignature(dropoff),
    ...(stops || []).map((stop) => locationSignature(stop)),
  ].join("::");
}

function toDirectionsLocation(location) {
  if (location?.placeId) {
    return { placeId: location.placeId };
  }

  if (Number.isFinite(location?.lat) && Number.isFinite(location?.lng)) {
    return { lat: Number(location.lat), lng: Number(location.lng) };
  }

  return String(location?.address || location?.label || "").trim();
}

function readCache() {
  if (typeof window === "undefined") return new Map();

  try {
    const raw = window.sessionStorage.getItem(ROUTE_METRICS_CACHE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Map();
    return new Map(parsed.slice(-MAX_CACHE_ITEMS));
  } catch {
    return new Map();
  }
}

function writeCache(cacheMap) {
  if (typeof window === "undefined") return;
  const entries = Array.from(cacheMap.entries()).slice(-MAX_CACHE_ITEMS);
  window.sessionStorage.setItem(ROUTE_METRICS_CACHE_KEY, JSON.stringify(entries));
}

function normalizeMetric(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return number;
}

export async function calculateRouteMetrics({
  pickup,
  dropoff,
  stops = [],
  apiKey,
}) {
  const signature = buildRouteSignature(pickup, dropoff, stops);
  const cache = readCache();
  const cached = cache.get(signature);
  if (cached && Number.isFinite(cached.miles) && Number.isFinite(cached.minutes)) {
    return cached;
  }

  if (!apiKey) {
    throw new Error("Google Maps key missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in env.");
  }

  await loadGoogleMapsClient(apiKey);

  if (!window.google?.maps?.DirectionsService) {
    throw new Error("Google Directions service is not available.");
  }

  const directionsService = new window.google.maps.DirectionsService();
  const result = await new Promise((resolve, reject) => {
    directionsService.route(
      {
        origin: toDirectionsLocation(pickup),
        destination: toDirectionsLocation(dropoff),
        waypoints: (stops || []).map((stop) => ({
          location: toDirectionsLocation(stop),
          stopover: true,
        })),
        optimizeWaypoints: false,
        travelMode: window.google.maps.TravelMode.DRIVING,
        region: "uk",
      },
      (response, status) => {
        const ok = status === window.google.maps.DirectionsStatus.OK;
        const legs = response?.routes?.[0]?.legs || [];

        if (!ok || legs.length === 0) {
          reject(new Error("Unable to calculate route metrics for selected locations."));
          return;
        }

        const totalMeters = legs.reduce((sum, leg) => sum + normalizeMetric(leg?.distance?.value), 0);
        const totalSeconds = legs.reduce((sum, leg) => sum + normalizeMetric(leg?.duration?.value), 0);

        if (totalMeters <= 0 || totalSeconds <= 0) {
          reject(new Error("Unable to calculate route metrics for selected locations."));
          return;
        }

        const miles = Math.max(0.1, Number((totalMeters / 1609.344).toFixed(2)));
        const minutes = Math.max(1, Math.round(totalSeconds / 60));

        resolve({ miles, minutes });
      },
    );
  });

  cache.set(signature, result);
  writeCache(cache);
  return result;
}
