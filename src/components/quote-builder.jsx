"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GooglePlaceInput } from "@/components/google-place-input";
import { createEmptyBookingFlow, readBookingFlowState, saveBookingFlowState } from "@/lib/booking-flow-client";
import { isUkLocation, normalizeClientLocation, toApiLocationPayload } from "@/lib/location-utils";
import { calculateRouteMetrics } from "@/lib/route-metrics-client";

const defaultContent = {
  title: "Start Your Journey",
  subtitle: "Add route details to continue to vehicle selection.",
  submitLabel: "Continue to Vehicles",
  helperText: "Prices shown on next step are generated from state and vehicle rates.",
  fields: {
    pickupLabel: "Pickup",
    pickupPlaceholder: "Airport or address",
    dropoffLabel: "Drop-off",
    dropoffPlaceholder: "Destination",
    waypointsLabel: "Waypoints",
    meetAndGreetLabel: "Include meet and greet",
    nightRideLabel: "Night ride surcharge",
  },
};

function mergeContent(content) {
  return {
    ...defaultContent,
    ...(content || {}),
    fields: {
      ...defaultContent.fields,
      ...(content?.fields || {}),
    },
  };
}

function emptyLocation() {
  return normalizeClientLocation({
    label: "",
    address: "",
    city: "",
    state: "",
    zipcode: "",
    country: "",
    countryCode: "",
    placeId: "",
    lat: null,
    lng: null,
    types: [],
    isAirport: false,
  });
}

function reverseStops(stops) {
  return [...(stops || [])].reverse();
}

function getPrefillFlowState(enabled) {
  if (!enabled) {
    return null;
  }

  const flow = readBookingFlowState();
  if (!flow?.route?.pickup || !flow?.route?.dropoff) {
    return null;
  }

  return {
    pickup: normalizeClientLocation(flow.route.pickup),
    dropoff: normalizeClientLocation(flow.route.dropoff),
    stops: Array.isArray(flow.route.stops) ? flow.route.stops.map((item) => normalizeClientLocation(item)) : [],
    includeMeetAndGreet: Boolean(flow.route.includeMeetAndGreet),
  };
}

async function requestPreview(payload) {
  const response = await fetch("/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Unable to fetch vehicle rates.");
  }

  if (!Array.isArray(result.options) || result.options.length === 0) {
    throw new Error("No active rates available for this route.");
  }

  return result;
}

export function QuoteBuilder({ content, variant = "default", prefill = false }) {
  const router = useRouter();
  const uiContent = useMemo(() => mergeContent(content), [content]);
  const prefillState = useMemo(() => getPrefillFlowState(prefill), [prefill]);

  const [pickup, setPickup] = useState(() => prefillState?.pickup || emptyLocation());
  const [dropoff, setDropoff] = useState(() => prefillState?.dropoff || emptyLocation());
  const [stops, setStops] = useState(() => prefillState?.stops || []);
  const [includeMeetAndGreet, setIncludeMeetAndGreet] = useState(() => prefillState?.includeMeetAndGreet || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  function addStop() {
    setStops((previous) => {
      if (previous.length >= 4) return previous;
      return [...previous, emptyLocation()];
    });
  }

  function removeStop(index) {
    setStops((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  }

  function updateStop(index, value) {
    setStops((previous) => previous.map((item, currentIndex) => (currentIndex === index ? value : item)));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const normalizedPickup = normalizeClientLocation(pickup);
      const normalizedDropoff = normalizeClientLocation(dropoff);
      const normalizedStops = (stops || [])
        .map((item) => normalizeClientLocation(item))
        .filter((item) => item.address.length > 0);
      const payloadPickup = toApiLocationPayload(normalizedPickup);
      const payloadDropoff = toApiLocationPayload(normalizedDropoff);
      const payloadStops = normalizedStops.map((item) => toApiLocationPayload(item));

      if (!normalizedPickup.address) {
        throw new Error("Pickup location is required.");
      }
      if (!normalizedDropoff.address) {
        throw new Error("Drop-off location is required.");
      }
      if (normalizedStops.length > 4) {
        throw new Error("Maximum 4 stop locations are allowed.");
      }

      // if (!isUkLocation(normalizedPickup) || !isUkLocation(normalizedDropoff)) {
      //   throw new Error("Pickup and drop-off must be within UK.");
      // }
      if (normalizedStops.some((item) => !isUkLocation(item))) {
        throw new Error("All stop locations must be within UK.");
      }

      const outboundMetrics = await calculateRouteMetrics({
        pickup: normalizedPickup,
        dropoff: normalizedDropoff,
        stops: normalizedStops,
        apiKey: googleApiKey,
      });

      const outboundPreview = await requestPreview({
        pickup: payloadPickup,
        dropoff: payloadDropoff,
        stops: payloadStops,
        miles: outboundMetrics.miles,
        includeMeetAndGreet,
      });

      let inboundMetrics = null;
      let inboundPreview = null;
      try {
        const inboundStops = reverseStops(normalizedStops);
        inboundMetrics = await calculateRouteMetrics({
          pickup: normalizedDropoff,
          dropoff: normalizedPickup,
          stops: inboundStops,
          apiKey: googleApiKey,
        });

        inboundPreview = await requestPreview({
          pickup: payloadDropoff,
          dropoff: payloadPickup,
          stops: inboundStops.map((item) => toApiLocationPayload(item)),
          miles: inboundMetrics.miles,
          includeMeetAndGreet,
        });
      } catch {
        inboundMetrics = null;
        inboundPreview = null;
      }

      const inboundMap = new Map(
        (inboundPreview?.options || []).map((option) => [String(option.vehicle?.code || "").toLowerCase(), option]),
      );

      const vehicles = (outboundPreview.options || []).map((option) => {
        const code = String(option.vehicle?.code || "").toLowerCase();
        const inboundOption = inboundMap.get(code) || null;
        const outboundTotal = Number(option.breakdown?.total || 0);
        const inboundTotal = Number(inboundOption?.breakdown?.total || 0);

        return {
          vehicle: option.vehicle,
          outboundBreakdown: option.breakdown,
          inboundBreakdown: inboundOption?.breakdown || null,
          singleTotal: Number(outboundTotal.toFixed(2)),
          returnTotal: Number((outboundTotal + inboundTotal).toFixed(2)),
        };
      });

      if (vehicles.length === 0) {
        throw new Error("No vehicles available for this route.");
      }

      const flow = createEmptyBookingFlow();
      flow.createdAt = new Date().toISOString();
      flow.route = {
        pickup: payloadPickup,
        dropoff: payloadDropoff,
        stops: payloadStops,
        includeMeetAndGreet,
        isNightRide: false,
        isReturnJourney: true,
      };
      flow.metrics = {
        outbound: outboundMetrics,
        inbound: inboundMetrics,
      };
      flow.pricing = {
        outboundState: outboundPreview.state || null,
        inboundState: inboundPreview?.state || null,
        vehicles,
      };
      flow.selection = {
        vehicleCode: vehicles[0]?.vehicle?.code || "",
        tripType: "single",
      };

      saveBookingFlowState(flow);
      router.push("/quote/vehicles", { scroll: false });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to continue.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const isHero = variant === "hero";
  const isDark = variant === "hero" || variant === "dark";

  return (
    <form
      onSubmit={onSubmit}
      className={
        isHero
          ? "space-y-3 rounded-[6px] border border-white/8 bg-[linear-gradient(180deg,rgba(36,47,57,0.74),rgba(24,34,44,0.7))] p-3.5 text-white shadow-[0_20px_44px_rgba(0,0,0,0.22)] sm:p-4"
          : isDark
            ? "space-y-4 rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(24,39,58,0.9))] p-6 text-white shadow-[0_24px_60px_rgba(2,9,18,0.34),inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "site-panel space-y-4 rounded-2xl p-6"
      }
    >
      <div>
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-200" : "text-slate-500"}`}>
          Airport Transfers Cost - Instant Quote
        </p>
        <h2 className={`mt-2 font-semibold ${isDark ? "text-[1.9rem] tracking-[-0.02em] text-white" : "text-[1.05rem] text-slate-900"}`}>{uiContent.title}</h2>
        <p className={`mt-1 ${isDark ? "text-sm text-slate-300" : "text-xs text-slate-600"}`}>{uiContent.subtitle}</p>
      </div>

      <GooglePlaceInput
        id="pickup"
        required
        label={uiContent.fields.pickupLabel}
        placeholder={uiContent.fields.pickupPlaceholder}
        value={pickup}
        onChange={setPickup}
        theme={isDark ? "dark" : "light"}
      />

      <GooglePlaceInput
        id="dropoff"
        required
        label={uiContent.fields.dropoffLabel}
        placeholder={uiContent.fields.dropoffPlaceholder}
        value={dropoff}
        onChange={setDropoff}
        theme={isDark ? "dark" : "light"}
      />

      <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-500"}`}>
        Only UK locations are allowed for pickup, drop-off and stops.
      </p>

      <div
        className={`space-y-2 rounded-xl border p-3 ${
          isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-700"}`}>{uiContent.fields.waypointsLabel}</p>
          <button
            type="button"
            onClick={addStop}
            disabled={stops.length >= 4}
            className={
              isDark
                ? "rounded-md border border-white/16 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-60"
                : "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            }
          >
            Add Stop
          </button>
        </div>

        {stops.length === 0 ? <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-500"}`}>No stops added.</p> : null}

        <div className="space-y-3">
          {stops.map((stop, index) => (
            <div
              key={`stop-${index}`}
              className={`rounded-md border p-3 ${isDark ? "border-white/12 bg-white/6" : "border-slate-200 bg-white"}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                  Stop {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeStop(index)}
                  className={
                    isDark
                      ? "rounded border border-red-300/30 px-2 py-1 text-xs font-medium text-red-100 hover:bg-red-500/10"
                      : "rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  }
                >
                  Remove
                </button>
              </div>

              <GooglePlaceInput
                id={`stop-${index}`}
                label={`Stop Location ${index + 1}`}
                placeholder="Enter stop address"
                value={stop}
                onChange={(value) => updateStop(index, value)}
                theme={isDark ? "dark" : "light"}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={`grid gap-3 text-sm ${isDark ? "sm:grid-cols-2 text-slate-100" : "text-slate-700"}`}>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeMeetAndGreet}
            onChange={(event) => setIncludeMeetAndGreet(event.target.checked)}
          />
          {uiContent.fields.meetAndGreetLabel}
        </label>
      </div>

      <div className={`flex flex-col gap-3 ${isDark ? "sm:flex-row sm:items-center sm:justify-between" : ""}`}>
        <button
          type="submit"
          disabled={loading}
          className={`site-primary-btn rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
            isDark ? "w-full sm:min-w-[200px]" : "w-full"
          }`}
        >
          {loading ? "Checking routes and fares..." : uiContent.submitLabel}
        </button>
        <p className={`text-xs leading-5 ${isDark ? "text-slate-300 sm:max-w-[260px]" : "text-slate-500"}`}>{uiContent.helperText}</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
