"use client";

let mapsScriptPromise = null;
let placesLibraryPromise = null;

function getLegacyPlacesApi() {
  return window.google?.maps?.places || null;
}

export function loadGoogleMapsClient(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is missing."));
  }

  if (mapsScriptPromise) {
    return mapsScriptPromise;
  }

  mapsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-maps-script");
    if (existing) {
      if (window.google?.maps) {
        resolve(window.google);
        return;
      }
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script.")));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps API is not available."));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps script."));
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

export function loadGooglePlacesLibrary(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Places can only be loaded in browser."));
  }

  const legacyPlacesApi = getLegacyPlacesApi();
  if (
    legacyPlacesApi?.AutocompleteService &&
    legacyPlacesApi?.PlacesService &&
    legacyPlacesApi?.PlacesServiceStatus
  ) {
    return Promise.resolve(legacyPlacesApi);
  }

  if (placesLibraryPromise) {
    return placesLibraryPromise;
  }

  placesLibraryPromise = loadGoogleMapsClient(apiKey).then(async () => {
    if (window.google?.maps?.importLibrary) {
      const placesLibrary = await window.google.maps.importLibrary("places");
      if (placesLibrary?.AutocompleteService && placesLibrary?.PlacesService) {
        return placesLibrary;
      }
    }

    const fallbackPlacesApi = getLegacyPlacesApi();
    if (
      fallbackPlacesApi?.AutocompleteService &&
      fallbackPlacesApi?.PlacesService &&
      fallbackPlacesApi?.PlacesServiceStatus
    ) {
      return fallbackPlacesApi;
    }

    throw new Error("Google Places API is not available.");
  });

  return placesLibraryPromise;
}
