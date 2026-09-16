
"use client";

let mapsScriptPromise = null;
let placesLibraryPromise = null;

export function loadGoogleMapsClient(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps can only be loaded in the browser.")
    );
  }

  if (!apiKey) {
    return Promise.reject(
      new Error("Google Maps API key is missing.")
    );
  }

  // Already fully initialized
  if (
    window.google?.maps?.importLibrary &&
    window.google?.maps?.version
  ) {
    return Promise.resolve(window.google);
  }

  if (mapsScriptPromise) {
    return mapsScriptPromise;
  }

  mapsScriptPromise = new Promise((resolve, reject) => {
    // If another part of the app already added the script
    const existing = document.getElementById("google-maps-script");

    if (existing) {
      const checkReady = () => {
        if (
          window.google?.maps?.importLibrary &&
          window.google?.maps?.version
        ) {
          resolve(window.google);
          return true;
        }

        return false;
      };

      if (checkReady()) {
        return;
      }

      // Wait until Google's callback initializes the API
      const previousCallback = window.__googleMapsReady;

      window.__googleMapsReady = () => {
        previousCallback?.();

        if (checkReady()) {
          return;
        }

        reject(
          new Error(
            "Google Maps loaded, but the API did not initialize correctly."
          )
        );
      };

      return;
    }

    // Google's recommended dynamic bootstrap loader
    const callbackName = "__googleMapsInit";

    window[callbackName] = () => {
      if (
        window.google?.maps?.importLibrary &&
        window.google?.maps?.version
      ) {
        resolve(window.google);
      } else {
        reject(
          new Error(
            "Google Maps loaded, but importLibrary is unavailable."
          )
        );
      }

      delete window[callbackName];
    };

    const script = document.createElement("script");

    script.id = "google-maps-script";

    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(apiKey)}` +
      "&v=weekly" +
      `&callback=${callbackName}`;

    script.async = true;
    script.defer = true;

    script.onerror = () => {
      delete window[callbackName];

      mapsScriptPromise = null;

      reject(
        new Error(
          "Failed to load Google Maps JavaScript API."
        )
      );
    };

    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

export function loadGooglePlacesLibrary(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Places can only be loaded in the browser.")
    );
  }

  if (placesLibraryPromise) {
    return placesLibraryPromise;
  }

  placesLibraryPromise = loadGoogleMapsClient(apiKey)
    .then(async () => {
      if (!window.google?.maps?.importLibrary) {
        throw new Error(
          "Google Maps importLibrary is unavailable."
        );
      }

      const places =
        await window.google.maps.importLibrary("places");

      if (!places?.AutocompleteSuggestion) {
        throw new Error(
          "Google Places API (New) is not available. " +
          "Make sure Places API (New) is enabled in Google Cloud."
        );
      }

      return places;
    })
    .catch((error) => {
      placesLibraryPromise = null;
      throw error;
    });

  return placesLibraryPromise;
}

