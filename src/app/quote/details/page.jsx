
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QuoteBookingDetailsCard } from "@/components/quote-booking-details-card";
import { useBookingFlow } from "@/hooks/use-booking-flow";
import { toApiLocationPayload } from "@/lib/location-utils";

const passengerOptions = ["1", "2", "3", "4", "5", "6", "7", "8"];
const luggageOptions = ["none", "1 bag", "2 bags", "3 bags", "4 bags", "5+ bags"];

function required(value) {
  return String(value || "").trim().length > 0;
}

function reverseStops(stops) {
  return [...(stops || [])].reverse();
}

async function requestQuote(payload) {
  const response = await fetch("/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Unable to refresh quote.");
  }

  return result;
}

function mergeVehiclePricing(outboundOptions, inboundOptions) {
  const inboundMap = new Map(
    (inboundOptions || []).map((option) => [
      String(option.vehicle?.code || "").toLowerCase(),
      option,
    ]),
  );

  return (outboundOptions || []).map((option) => {
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
}

function isCompleteDateTime(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(
    String(value || "").trim(),
  );
}

function createEmptyValidationState() {
  return {
    outbound: {
      leadName: false,
      mobile: false,
      pickupAt: false,
    },
    inbound: {
      leadName: false,
      mobile: false,
      pickupAt: false,
    },
  };
}

function inputClass(isInvalid) {
  return `w-full rounded-lg border bg-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-white placeholder-gray-400 backdrop-blur-sm focus:outline-none ${
    isInvalid
      ? "border-rose-400 ring-1 ring-rose-400/40 focus:border-rose-300"
      : "border-gray-600 focus:border-[#6ba5c7]"
  }`;
}

function prefixedInputClass(isInvalid) {
  return `w-full rounded-r-lg border bg-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-white placeholder-gray-400 backdrop-blur-sm focus:outline-none ${
    isInvalid
      ? "border-rose-400 focus:border-rose-300"
      : "border-gray-600 focus:border-[#6ba5c7]"
  }`;
}

function selectClass(isInvalid) {
  return `w-full rounded-lg border bg-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-white backdrop-blur-sm focus:outline-none ${
    isInvalid
      ? "border-rose-400 ring-1 ring-rose-400/40 focus:border-rose-300"
      : "border-gray-600 focus:border-[#6ba5c7]"
  }`;
}

function textareaClass(isInvalid) {
  return `w-full rounded-lg border bg-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-white placeholder-gray-400 backdrop-blur-sm focus:outline-none ${
    isInvalid
      ? "border-rose-400 ring-1 ring-rose-400/40 focus:border-rose-300"
      : "border-gray-600 focus:border-[#6ba5c7]"
  }`;
}

function fieldMessage(field) {
  switch (field) {
    case "leadName":
      return "Please enter passenger name.";
    case "mobile":
      return "Please enter mobile number.";
    case "pickupAt":
      return "Please select pickup date and time.";
    default:
      return "This field is required.";
  }
}

export default function QuoteDetailsPage() {
  const router = useRouter();
  const { state, hydrated, updateState } = useBookingFlow();

  const [error, setError] = useState("");
  const [copyBusy, setCopyBusy] = useState(false);
  const [pricingBusy, setPricingBusy] = useState(false);
  const [validation, setValidation] = useState(() =>
    createEmptyValidationState(),
  );

  const hasFlow = Boolean(
    state?.route &&
      state?.selectedVehicle &&
      state?.quotes?.outboundQuoteId,
  );

  useEffect(() => {
    if (!hydrated) return;

    if (!hasFlow) {
      router.replace("/quote/vehicles");
    }
  }, [hasFlow, hydrated, router]);

  useEffect(() => {
    if (!hydrated || !hasFlow) return;

    const browserTimeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "";

    if (!browserTimeZone) return;

    const outboundTimeZone =
      state?.passenger?.outbound?.pickupTimeZone || "";
    const inboundTimeZone =
      state?.passenger?.inbound?.pickupTimeZone || "";

    const expectedMeetAndGreet = state?.route?.includeMeetAndGreet
      ? "yes"
      : "no";

    const outboundMeetAndGreet =
      state?.passenger?.outbound?.meetAndGreet || "";
    const inboundMeetAndGreet =
      state?.passenger?.inbound?.meetAndGreet || "";

    const needsTimezone = !outboundTimeZone || !inboundTimeZone;

    const needsMeetAndGreetSync =
      outboundMeetAndGreet !== expectedMeetAndGreet ||
      inboundMeetAndGreet !== expectedMeetAndGreet;

    if (!needsTimezone && !needsMeetAndGreetSync) return;

    updateState((previous) => ({
      ...previous,
      passenger: {
        ...previous.passenger,
        outbound: {
          ...(previous.passenger?.outbound || {}),
          pickupTimeZone:
            previous.passenger?.outbound?.pickupTimeZone ||
            browserTimeZone,
          meetAndGreet: expectedMeetAndGreet,
        },
        inbound: {
          ...(previous.passenger?.inbound || {}),
          pickupTimeZone:
            previous.passenger?.inbound?.pickupTimeZone ||
            browserTimeZone,
          meetAndGreet: expectedMeetAndGreet,
        },
      },
    }));
  }, [
    hasFlow,
    hydrated,
    state?.passenger?.inbound?.meetAndGreet,
    state?.passenger?.inbound?.pickupTimeZone,
    state?.passenger?.outbound?.meetAndGreet,
    state?.passenger?.outbound?.pickupTimeZone,
    state?.route?.includeMeetAndGreet,
    updateState,
  ]);

  function updatePassenger(leg, field, value) {
    setValidation((previous) => ({
      ...previous,
      [leg]: {
        ...previous[leg],
        [field]: false,
      },
    }));

    updateState((previous) => ({
      ...previous,
      passenger: {
        ...previous.passenger,
        [leg]: {
          ...(previous.passenger?.[leg] || {}),
          [field]: value,
        },
      },
    }));
  }

  function copyOutboundToInbound() {
    const copiedOutbound = state?.passenger?.outbound || {};

    setCopyBusy(true);

    setValidation((previous) => ({
      ...previous,
      inbound: {
        leadName: !String(copiedOutbound.leadName || "").trim(),
        mobile: !String(copiedOutbound.mobile || "").trim(),
        pickupAt: !String(copiedOutbound.pickupAt || "").trim(),
      },
    }));

    updateState((previous) => ({
      ...previous,
      passenger: {
        ...previous.passenger,
        inbound: {
          ...copiedOutbound,
        },
      },
    }));

    setTimeout(() => setCopyBusy(false), 150);
  }

  async function refreshPricing({
    includeMeetAndGreet,
    outboundPickupAt,
    inboundPickupAt,
    meetAndGreetValue,
  }) {
    const route = state.route;
    const selectedVehicleCode =
      state.selection?.vehicleCode ||
      state.selectedVehicle?.code;

    const outboundMiles = Number(state.metrics?.outbound?.miles || 0);
    const inboundMiles = Number(state.metrics?.inbound?.miles || 0);

    const canRefreshReturn =
      state.selection?.tripType === "return" &&
      route?.isReturnJourney;

    if (!route?.pickup || !route?.dropoff) {
      setError("Journey locations are missing. Please select your journey again.");
      return;
    }

    if (!selectedVehicleCode) {
      setError("Please select a vehicle again.");
      return;
    }

    if (!Number.isFinite(outboundMiles) || outboundMiles <= 0) {
      setError("Unable to calculate the outbound route distance.");
      return;
    }

    if (canRefreshReturn && (!Number.isFinite(inboundMiles) || inboundMiles <= 0)) {
      setError("Unable to calculate the return route distance.");
      return;
    }

    setPricingBusy(true);
    setError("");

    try {
      const outboundStops = route.stops || [];

      const outboundBasePayload = {
        pickup: toApiLocationPayload(route.pickup),
        dropoff: toApiLocationPayload(route.dropoff),
        stops: outboundStops.map((item) =>
          toApiLocationPayload(item),
        ),
        miles: outboundMiles,
        includeMeetAndGreet,
        pickupAtLocal: outboundPickupAt,
      };

      const outboundPreview = await requestQuote(outboundBasePayload);

      let inboundPreview = null;
      let inboundReserved = null;

      const inboundBasePayload = {
        pickup: toApiLocationPayload(route.dropoff),
        dropoff: toApiLocationPayload(route.pickup),
        stops: reverseStops(route.stops).map((item) =>
          toApiLocationPayload(item),
        ),
        miles: inboundMiles,
        includeMeetAndGreet,
        pickupAtLocal: inboundPickupAt,
      };

      if (canRefreshReturn) {
        inboundPreview = await requestQuote(inboundBasePayload);
      }

      const outboundReserved = await requestQuote({
        ...outboundBasePayload,
        vehicleCode: selectedVehicleCode,
      });

      if (canRefreshReturn) {
        inboundReserved = await requestQuote({
          ...inboundBasePayload,
          vehicleCode: selectedVehicleCode,
        });
      }

      if (!outboundReserved?.quoteId) {
        throw new Error("Unable to reserve the updated outbound quote.");
      }

      if (canRefreshReturn && !inboundReserved?.quoteId) {
        throw new Error("Unable to reserve the updated return quote.");
      }

      const vehicles = mergeVehiclePricing(
        outboundPreview.options || [],
        inboundPreview?.options || [],
      );

      updateState((previous) => ({
        ...previous,
        route: {
          ...previous.route,
          includeMeetAndGreet,
        },
        pricing: {
          ...previous.pricing,
          vehicles,
        },
        quotes: {
          outboundQuoteId: outboundReserved.quoteId,
          inboundQuoteId: inboundReserved?.quoteId || "",
          expiresAt:
            outboundReserved.expiresAt ||
            previous.quotes?.expiresAt ||
            "",
        },
        passenger: {
          ...previous.passenger,
          outbound: {
            ...(previous.passenger?.outbound || {}),
            meetAndGreet: meetAndGreetValue,
          },
          inbound: {
            ...(previous.passenger?.inbound || {}),
            meetAndGreet: meetAndGreetValue,
          },
        },
      }));
    } catch (syncError) {
      const message =
        syncError instanceof Error
          ? syncError.message
          : "Unable to refresh fare.";

      setError(message);
    } finally {
      setPricingBusy(false);
    }
  }

  async function syncMeetAndGreet(value) {
    const includeMeetAndGreet = value === "yes";

    const outboundPickupAt =
      state.passenger?.outbound?.pickupAt || "";
    const inboundPickupAt =
      state.passenger?.inbound?.pickupAt || "";

    updatePassenger("outbound", "meetAndGreet", value);

    if (
      state.selection?.tripType === "return" &&
      state.route?.isReturnJourney
    ) {
      updatePassenger("inbound", "meetAndGreet", value);
    }

    await refreshPricing({
      includeMeetAndGreet,
      outboundPickupAt,
      inboundPickupAt,
      meetAndGreetValue: value,
    });
  }

  async function syncPickupAt(leg, value) {
    updatePassenger(leg, "pickupAt", value);

    if (!isCompleteDateTime(value)) {
      return;
    }

    const includeMeetAndGreet = Boolean(
      state.route?.includeMeetAndGreet,
    );

    const outboundPickupAt =
      leg === "outbound"
        ? value
        : state.passenger?.outbound?.pickupAt || "";

    const inboundPickupAt =
      leg === "inbound"
        ? value
        : state.passenger?.inbound?.pickupAt || "";

    await refreshPricing({
      includeMeetAndGreet,
      outboundPickupAt,
      inboundPickupAt,
      meetAndGreetValue: includeMeetAndGreet ? "yes" : "no",
    });
  }

  function continueToPayment() {
    const outbound = state.passenger?.outbound || {};
    const inbound = state.passenger?.inbound || {};

    const isReturn =
      state.selection?.tripType === "return" &&
      state.route?.isReturnJourney;

    const nextValidation = createEmptyValidationState();

    nextValidation.outbound.leadName = !required(outbound.leadName);
    nextValidation.outbound.mobile = !required(outbound.mobile);
    nextValidation.outbound.pickupAt = !required(outbound.pickupAt);

    if (isReturn) {
      nextValidation.inbound.leadName = !required(inbound.leadName);
      nextValidation.inbound.mobile = !required(inbound.mobile);
      nextValidation.inbound.pickupAt = !required(inbound.pickupAt);
    }

    const hasErrors =
      Object.values(nextValidation.outbound).some(Boolean) ||
      (isReturn &&
        Object.values(nextValidation.inbound).some(Boolean));

    if (hasErrors) {
      setValidation(nextValidation);
      return;
    }

    setError("");
    setValidation(createEmptyValidationState());
    router.push("/quote/payment", { scroll: false });
  }

  if (!hydrated || !hasFlow) {
    return (
      <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(24,39,58,0.9))] p-6 text-sm text-slate-200 shadow-[0_20px_44px_rgba(2,9,18,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
        Loading journey details...
      </div>
    );
  }

  const outbound = state.passenger?.outbound || {};
  const inbound = state.passenger?.inbound || {};

  const isReturn =
    state.selection?.tripType === "return" &&
    state.route?.isReturnJourney;

  const selectedVehiclePrice = state?.pricing?.vehicles?.find(
    (item) =>
      String(item.vehicle?.code || "").toLowerCase() ===
      String(state.selection?.vehicleCode || state.selectedVehicle?.code || "").toLowerCase(),
  );

  const outboundFare = Number(
    selectedVehiclePrice?.singleTotal || 0,
  ).toFixed(2);

  const inboundFare = Number(
    selectedVehiclePrice?.inboundBreakdown?.total || 0,
  ).toFixed(2);

  const totalFare = Number(
    isReturn
      ? selectedVehiclePrice?.returnTotal || 0
      : selectedVehiclePrice?.singleTotal || 0,
  ).toFixed(2);

  const outboundInvalid = validation.outbound;
  const inboundInvalid = validation.inbound;

  return (
    <div className="mx-auto grid max-w-5xl gap-5 py-10 lg:grid-cols-[1.35fr_1fr]">
      <section className="space-y-4 rounded-2xl border border-white/20 bg-[rgba(30,46,66,0.92)] p-5 text-white shadow-lg backdrop-blur-sm">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-white">
            Outbound Details
          </h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-200">
              Lead Passenger Name *
            </label>
            <input
              value={outbound.leadName || ""}
              onChange={(event) =>
                updatePassenger("outbound", "leadName", event.target.value)
              }
              className={inputClass(outboundInvalid.leadName)}
              aria-invalid={outboundInvalid.leadName}
              placeholder="Full name"
            />
            {outboundInvalid.leadName ? (
              <p className="mt-1 text-[11px] text-rose-300">
                {fieldMessage("leadName")}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-200">
              Passenger Mobile *
            </label>
            <div
              className={`flex overflow-hidden rounded-lg ${
                outboundInvalid.mobile ? "ring-1 ring-rose-400/40" : ""
              }`}
            >
              <span
                className={`inline-flex items-center border border-r-0 px-2.5 text-xs ${
                  outboundInvalid.mobile
                    ? "border-rose-400 bg-rose-500/10 text-rose-200"
                    : "border-gray-600 bg-[rgba(255,255,255,0.05)] text-gray-300"
                }`}
              >
                +44
              </span>
              <input
                value={outbound.mobile || ""}
                onChange={(event) =>
                  updatePassenger("outbound", "mobile", event.target.value)
                }
                className={prefixedInputClass(outboundInvalid.mobile)}
                aria-invalid={outboundInvalid.mobile}
                placeholder="Mobile Number"
              />
            </div>
            {outboundInvalid.mobile ? (
              <p className="mt-1 text-[11px] text-rose-300">
                {fieldMessage("mobile")}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-200">
            Passenger Email (Optional)
          </label>
          <input
            type="email"
            value={outbound.email || ""}
            onChange={(event) =>
              updatePassenger("outbound", "email", event.target.value)
            }
            className={inputClass(false)}
            placeholder="passenger@mail.com"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-200">
              Passengers (Inc. Children) *
            </label>
            <select
              value={outbound.passengers || "1"}
              onChange={(event) =>
                updatePassenger("outbound", "passengers", event.target.value)
              }
              className={selectClass(false)}
            >
              {passengerOptions.map((item) => (
                <option key={item} value={item} className="bg-[#1e2e42]">
                  {item} Person{item !== "1" ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-200">
              Luggage *
            </label>
            <select
              value={outbound.luggage || "none"}
              onChange={(event) =>
                updatePassenger("outbound", "luggage", event.target.value)
              }
              className={selectClass(false)}
            >
              {luggageOptions.map((item) => (
                <option key={item} value={item} className="bg-[#1e2e42]">
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-200">
              Flight Number
            </label>
            <input
              value={outbound.flightNumber || ""}
              onChange={(event) =>
                updatePassenger("outbound", "flightNumber", event.target.value)
              }
              className={inputClass(false)}
              placeholder="Flight Number"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-200">
              Arriving From
            </label>
            <input
              value={outbound.arrivingFrom || ""}
              onChange={(event) =>
                updatePassenger("outbound", "arrivingFrom", event.target.value)
              }
              className={inputClass(false)}
              placeholder="Point Of Origin"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-200">
              Pickup Date & Time *
            </label>
            <input
              type="datetime-local"
              value={outbound.pickupAt || ""}
              onChange={(event) =>
                syncPickupAt("outbound", event.target.value)
              }
              className={inputClass(outboundInvalid.pickupAt)}
              aria-invalid={outboundInvalid.pickupAt}
            />
            {outboundInvalid.pickupAt ? (
              <p className="mt-1 text-[11px] text-rose-300">
                {fieldMessage("pickupAt")}
              </p>
            ) : null}
            {pricingBusy ? (
              <p className="mt-1 text-xs text-slate-300">
                Updating quote...
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-200">
              Meet & Greet Service
            </label>
            <select
              value={outbound.meetAndGreet || "no"}
              onChange={(event) => syncMeetAndGreet(event.target.value)}
              disabled={pricingBusy}
              className={selectClass(false)}
            >
              <option value="yes" className="bg-[#1e2e42]">
                Yes
              </option>
              <option value="no" className="bg-[#1e2e42]">
                No
              </option>
            </select>
            {pricingBusy ? (
              <p className="mt-1 text-xs text-slate-300">
                Updating quote...
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-200">
            Special Instructions
          </label>
          <textarea
            rows={3}
            value={outbound.specialInstructions || ""}
            onChange={(event) =>
              updatePassenger(
                "outbound",
                "specialInstructions",
                event.target.value,
              )
            }
            className={textareaClass(false)}
            placeholder="Add any special instructions here"
          />
        </div>

        {isReturn ? (
          <div className="mt-5 space-y-3 rounded-xl border border-gray-600/50 bg-[rgba(0,0,0,0.2)] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[24px] font-semibold text-white">
                Inbound Details
              </h2>
              <button
                type="button"
                onClick={copyOutboundToInbound}
                className="rounded-lg border border-gray-500 bg-[rgba(255,255,255,0.05)] px-2.5 py-1.5 text-[11px] font-medium text-gray-200 hover:bg-[rgba(255,255,255,0.1)]"
              >
                {copyBusy ? "Copied!" : "Copy Above"}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-200">
                  Lead Passenger Name *
                </label>
                <input
                  value={inbound.leadName || ""}
                  onChange={(event) =>
                    updatePassenger("inbound", "leadName", event.target.value)
                  }
                  className={inputClass(inboundInvalid.leadName)}
                  aria-invalid={inboundInvalid.leadName}
                  placeholder="Full name"
                />
                {inboundInvalid.leadName ? (
                  <p className="mt-1 text-[11px] text-rose-300">
                    {fieldMessage("leadName")}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-200">
                  Passenger Mobile *
                </label>
                <div
                  className={`flex overflow-hidden rounded-lg ${
                    inboundInvalid.mobile ? "ring-1 ring-rose-400/40" : ""
                  }`}
                >
                  <span
                    className={`inline-flex items-center border border-r-0 px-2.5 text-xs ${
                      inboundInvalid.mobile
                        ? "border-rose-400 bg-rose-500/10 text-rose-200"
                        : "border-gray-600 bg-[rgba(255,255,255,0.05)] text-gray-300"
                    }`}
                  >
                    +44
                  </span>
                  <input
                    value={inbound.mobile || ""}
                    onChange={(event) =>
                      updatePassenger("inbound", "mobile", event.target.value)
                    }
                    className={prefixedInputClass(inboundInvalid.mobile)}
                    aria-invalid={inboundInvalid.mobile}
                    placeholder="Mobile Number"
                  />
                </div>
                {inboundInvalid.mobile ? (
                  <p className="mt-1 text-[11px] text-rose-300">
                    {fieldMessage("mobile")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-200">
                  Pickup Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={inbound.pickupAt || ""}
                  onChange={(event) =>
                    syncPickupAt("inbound", event.target.value)
                  }
                  className={inputClass(inboundInvalid.pickupAt)}
                  aria-invalid={inboundInvalid.pickupAt}
                />
                {inboundInvalid.pickupAt ? (
                  <p className="mt-1 text-[11px] text-rose-300">
                    {fieldMessage("pickupAt")}
                  </p>
                ) : null}
                {pricingBusy ? (
                  <p className="mt-1 text-xs text-slate-300">
                    Updating quote...
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-200">
                  Meet & Greet Service
                </label>
                <select
                  value={inbound.meetAndGreet || "no"}
                  onChange={(event) => syncMeetAndGreet(event.target.value)}
                  disabled={pricingBusy}
                  className={selectClass(false)}
                >
                  <option value="yes" className="bg-[#1e2e42]">
                    Yes
                  </option>
                  <option value="no" className="bg-[#1e2e42]">
                    No
                  </option>
                </select>
                {pricingBusy ? (
                  <p className="mt-1 text-xs text-slate-300">
                    Updating quote...
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-200">
                Special Instructions
              </label>
              <textarea
                rows={3}
                value={inbound.specialInstructions || ""}
                onChange={(event) =>
                  updatePassenger(
                    "inbound",
                    "specialInstructions",
                    event.target.value,
                  )
                }
                className={textareaClass(false)}
                placeholder="Add any special instructions here"
              />
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() =>
                router.push("/quote/vehicles?return=true", {
                  scroll: false,
                })
              }
              className="text-sm text-[#6ba5c7] hover:underline"
            >
              + Add Another Journey
            </button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <QuoteBookingDetailsCard
          title="Your Journey Details"
          vehicleName={state.selectedVehicle?.name || ""}
          tripType={state.selection?.tripType || "single"}
          outbound={{
            pickup: state.route.pickup,
            dropoff: state.route.dropoff,
            metrics: state.metrics.outbound,
          }}
          inbound={
            isReturn
              ? {
                  pickup: state.route.dropoff,
                  dropoff: state.route.pickup,
                  metrics: state.metrics.inbound,
                }
              : null
          }
          fares={{
            outbound: Number(outboundFare),
            inbound: Number(inboundFare),
            total: Number(totalFare),
            currency: "GBP",
          }}
        />

        <div className="flex items-center justify-between rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(23,37,55,0.9))] p-4 shadow-[0_20px_44px_rgba(2,9,18,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <button
            type="button"
            onClick={() =>
              router.push("/quote/vehicles", { scroll: false })
            }
            className="rounded-md bg-[rgba(255,255,255,0.08)] px-4 py-2 text-xs font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.14)]"
          >
            Back
          </button>

          <button
            type="button"
            onClick={continueToPayment}
            disabled={pricingBusy}
            className="site-primary-btn rounded-md bg-[#2e779a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1e5a7a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pricingBusy ? "Updating..." : "Continue Booking"}
          </button>
        </div>

        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : null}
      </section>
    </div>
  );
}
