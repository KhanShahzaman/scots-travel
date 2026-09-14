"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadGooglePlacesLibrary } from "@/lib/google-maps-client";
import { normalizeClientLocation } from "@/lib/location-utils";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 400;
const MAX_SUGGESTIONS = 5;

function extractComponent(addressComponents, type) {
  const match = (addressComponents || []).find((component) => component.types?.includes(type));
  return match?.long_name || "";
}

function extractComponentShort(addressComponents, type) {
  const match = (addressComponents || []).find((component) => component.types?.includes(type));
  return match?.short_name || "";
}

function locationKindFromTypes(types, description = "") {
  const normalizedTypes = Array.isArray(types) ? types.map((item) => String(item).toLowerCase()) : [];
  const text = String(description || "").toLowerCase();

  if (
    normalizedTypes.includes("airport") ||
    /\b(airport|terminal|airfield|aerodrome)\b/.test(text)
  ) {
    return "airport";
  }

  if (
    normalizedTypes.includes("hospital") ||
    normalizedTypes.includes("health") ||
    /\b(hospital|clinic|medical)\b/.test(text)
  ) {
    return "hospital";
  }

  return "address";
}

function placeToLocation(place, fallbackText) {
  const formattedAddress = String(place?.formatted_address || place?.name || fallbackText || "").trim();
  const types = Array.isArray(place?.types) ? place.types : [];
  const kindHint = [place?.name, formattedAddress, fallbackText].filter(Boolean).join(" ");
  const kind = locationKindFromTypes(types, kindHint);

  return normalizeClientLocation({
    label: formattedAddress,
    address: formattedAddress,
    city:
      extractComponent(place?.address_components, "locality") ||
      extractComponent(place?.address_components, "postal_town") ||
      extractComponent(place?.address_components, "administrative_area_level_2"),
    state: extractComponent(place?.address_components, "administrative_area_level_1"),
    zipcode: extractComponent(place?.address_components, "postal_code"),
    country: extractComponent(place?.address_components, "country"),
    countryCode: extractComponentShort(place?.address_components, "country"),
    placeId: String(place?.place_id || ""),
    lat: typeof place?.geometry?.location?.lat === "function" ? place.geometry.location.lat() : null,
    lng: typeof place?.geometry?.location?.lng === "function" ? place.geometry.location.lng() : null,
    types,
    isAirport: kind === "airport",
    isHospital: kind === "hospital",
    type: kind,
  });
}

function textToLocation(value) {
  const description = String(value || "");
  const kind = locationKindFromTypes([], description);

  return normalizeClientLocation({
    label: description,
    address: description,
    city: "",
    state: "",
    zipcode: "",
    country: "",
    countryCode: "",
    placeId: "",
    types: [],
    isAirport: kind === "airport",
    isHospital: kind === "hospital",
    type: kind,
  });
}

function PinIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c3.8-4.6 6.5-8.1 6.5-11A6.5 6.5 0 1 0 5.5 10c0 2.9 2.7 6.4 6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

function AirportIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M2.5 13.2h7.7l6.2 7.4h2.8l-2.2-7.4H22a1.2 1.2 0 0 0 0-2.4h-4.9l2.2-7.4h-2.8l-6.2 7.4H2.5v2.4Z" />
    </svg>
  );
}

function HospitalIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v6M9 10h6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21v-4h8v4" />
    </svg>
  );
}

function KindIcon({ kind, className }) {
  if (kind === "airport") {
    return <AirportIcon className={className} />;
  }

  if (kind === "hospital") {
    return <HospitalIcon className={className} />;
  }

  return <PinIcon className={className} />;
}

function kindBadgeClass(kind, isDark = false) {
  if (kind === "airport") return isDark ? "bg-sky-400/16 text-sky-200" : "bg-sky-100 text-sky-700";
  if (kind === "hospital") return isDark ? "bg-rose-400/16 text-rose-200" : "bg-rose-100 text-rose-700";
  return isDark ? "bg-white/8 text-slate-200" : "bg-slate-100 text-slate-600";
}

export function GooglePlaceInput({
  id,
  label,
  placeholder,
  required = false,
  value,
  onChange,
  disabled = false,
  theme = "light",
}) {
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const requestSerialRef = useRef(0);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const placesApiRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const cacheRef = useRef(new Map());

  const [suggestions, setSuggestions] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const inputValue = value?.address || value?.label || "";
  const isDark = theme === "dark";

  const inputKind = useMemo(() => {
    if (value?.isAirport || value?.type === "airport") return "airport";
    if (value?.isHospital || value?.type === "hospital") return "hospital";
    return "address";
  }, [value?.isAirport, value?.isHospital, value?.type]);

  function resetSessionToken() {
    sessionTokenRef.current = null;
  }

  function getSessionToken() {
    const placesApi = placesApiRef.current;
    if (!placesApi?.AutocompleteSessionToken) {
      return undefined;
    }

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesApi.AutocompleteSessionToken();
    }

    return sessionTokenRef.current;
  }

  function clearSuggestions() {
    setSuggestions([]);
    setMenuOpen(false);
    setActiveIndex(-1);
    setLoadingSuggestions(false);
  }

  async function ensurePlacesServices() {
    if (!apiKey) {
      return false;
    }

    if (autocompleteServiceRef.current && placesServiceRef.current) {
      return true;
    }

    try {
      const placesApi = await loadGooglePlacesLibrary(apiKey);

      if (!placesApi?.AutocompleteService || !placesApi?.PlacesService) {
        return false;
      }

      placesApiRef.current = placesApi;

      if (!autocompleteServiceRef.current) {
        autocompleteServiceRef.current = new placesApi.AutocompleteService();
      }

      if (!placesServiceRef.current) {
        placesServiceRef.current = new placesApi.PlacesService(document.createElement("div"));
      }

      return true;
    } catch (error) {
      console.error("GOOGLE_PLACES_LOAD_ERROR", error);
      return false;
    }
  }

  function schedulePredictions(rawValue) {
    if (disabled) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const query = String(rawValue || "").trim();

    if (query.length < MIN_QUERY_LENGTH) {
      clearSuggestions();
      resetSessionToken();
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const cacheKey = query.toLowerCase();
      if (cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey);
        setSuggestions(cached);
        setMenuOpen(cached.length > 0);
        setActiveIndex(-1);
        return;
      }

      const ready = await ensurePlacesServices();
      if (!ready || !autocompleteServiceRef.current) {
        return;
      }

      const serial = requestSerialRef.current + 1;
      requestSerialRef.current = serial;
      setLoadingSuggestions(true);

      const sessionToken = getSessionToken();

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "gb" },
          sessionToken,
        },
        (predictions, status) => {
          const placesApi = placesApiRef.current;
          if (serial !== requestSerialRef.current) {
            return;
          }

          setLoadingSuggestions(false);

          const ok = status === placesApi?.PlacesServiceStatus?.OK && Array.isArray(predictions);
          if (!ok) {
            clearSuggestions();
            return;
          }

          const next = predictions.slice(0, MAX_SUGGESTIONS).map((prediction) => {
            const description = prediction.description;
            return {
              placeId: prediction.place_id,
              description,
              types: prediction.types || [],
              mainText: prediction.structured_formatting?.main_text || description,
              secondaryText: prediction.structured_formatting?.secondary_text || "",
              kind: locationKindFromTypes(prediction.types || [], description),
            };
          });

          cacheRef.current.set(cacheKey, next);
          setSuggestions(next);
          setMenuOpen(next.length > 0);
          setActiveIndex(-1);
        },
      );
    }, DEBOUNCE_MS);
  }

  async function selectSuggestion(suggestion) {
    const ready = await ensurePlacesServices();

    if (!ready || !placesServiceRef.current || !suggestion?.placeId) {
      const fallback = textToLocation(suggestion?.description || "");
      onChange?.(fallback);
      clearSuggestions();
      resetSessionToken();
      return;
    }

    setLoadingSuggestions(true);

    placesServiceRef.current.getDetails(
      {
        placeId: suggestion.placeId,
        fields: ["formatted_address", "address_components", "geometry", "name", "place_id", "types"],
        sessionToken: getSessionToken(),
      },
      (place, status) => {
        const placesApi = placesApiRef.current;
        setLoadingSuggestions(false);

        if (status !== placesApi?.PlacesServiceStatus?.OK || !place) {
          onChange?.(textToLocation(suggestion.description));
        } else {
          onChange?.(placeToLocation(place, suggestion.description));
        }

        clearSuggestions();
        resetSessionToken();
      },
    );
  }

  function handleInputChange(event) {
    const nextValue = event.target.value;
    onChange?.(textToLocation(nextValue));
    schedulePredictions(nextValue);
  }

  function handleKeyDown(event) {
    if (!menuOpen || suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((previous) => (previous + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((previous) => (previous <= 0 ? suggestions.length - 1 : previous - 1));
      return;
    }

    if (event.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        event.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      clearSuggestions();
    }
  }

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block">
        <span className={`mb-1.5 block text-sm font-semibold tracking-[0.01em] ${isDark ? "text-white" : "text-slate-700"}`}>
          {label}
        </span>
        <div
          className={`group relative rounded-xl border shadow-sm transition ${
            isDark
              ? "border-white/12 bg-[linear-gradient(180deg,rgba(16,28,42,0.94),rgba(18,31,46,0.86))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_30px_rgba(3,10,18,0.24)] focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-300/20"
              : "border-slate-300/90 bg-gradient-to-b from-white to-slate-50 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100"
          }`}
        >
          <span
            className={`pointer-events-none absolute inset-y-0 left-3 flex items-center ${isDark ? "text-slate-300" : "text-slate-500"}`}
          >
            <KindIcon kind={inputKind} className="h-4 w-4" />
          </span>
          <input
            id={id}
            required={required}
            disabled={disabled}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (inputValue.trim().length >= MIN_QUERY_LENGTH && suggestions.length > 0) {
                setMenuOpen(true);
                return;
              }
              schedulePredictions(inputValue);
            }}
            placeholder={placeholder}
            autoComplete="off"
            className={`w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-12 text-sm font-medium transition focus:outline-none disabled:cursor-not-allowed ${
              isDark
                ? "text-white placeholder:text-slate-500 disabled:text-slate-500"
                : "text-slate-800 placeholder:text-slate-400 disabled:text-slate-500"
            }`}
          />
          {loadingSuggestions ? (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sky-200">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200/25 border-t-sky-200" />
            </span>
          ) : null}
        </div>
      </label>

      {!apiKey ? (
        <p className="mt-1 text-xs text-amber-700">Google key missing: add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in env.</p>
      ) : (
        <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-500"}`}>
          UK only. Type at least {MIN_QUERY_LENGTH} characters for suggestions.
        </p>
      )}

      {menuOpen && suggestions.length > 0 ? (
        <div
          className={`absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl p-1.5 shadow-[0_20px_34px_rgba(15,23,42,0.22)] ${
            isDark
              ? "border border-white/10 bg-[linear-gradient(180deg,rgba(16,28,42,0.98),rgba(18,31,46,0.96))]"
              : "border border-slate-200 bg-white"
          }`}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.placeId}-${index}`}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                index === activeIndex
                  ? isDark
                    ? "bg-[linear-gradient(90deg,rgba(80,179,213,0.16),rgba(46,119,154,0.18))] text-white"
                    : "bg-gradient-to-r from-sky-50 to-cyan-50 text-slate-900"
                  : isDark
                    ? "text-slate-100 hover:bg-white/6"
                    : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className={`mt-0.5 rounded-md p-1.5 ${kindBadgeClass(suggestion.kind, isDark)}`}>
                <KindIcon kind={suggestion.kind} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className={`block truncate font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                  {suggestion.mainText}
                </span>
                {suggestion.secondaryText ? (
                  <span className={`block truncate text-xs ${isDark ? "text-slate-300" : "text-slate-500"}`}>{suggestion.secondaryText}</span>
                ) : (
                  <span className={`block truncate text-xs ${isDark ? "text-slate-300" : "text-slate-500"}`}>{suggestion.description}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
