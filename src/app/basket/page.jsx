"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { QuoteBookingDetailsCard } from "@/components/quote-booking-details-card";
import {
  clearBookingFlowState,
  getBookingFlowServerSnapshot,
  getBookingFlowSnapshot,
  subscribeBookingFlow,
} from "@/lib/booking-flow-client";

function required(value) {
  return String(value || "").trim().length > 0;
}

function formatPickup(value, timeZone) {
  const text = String(value || "").trim();
  if (!text) {
    return "Not added yet";
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timeZone || "Europe/London",
    }).format(date);
  } catch {
    return date.toLocaleString("en-GB");
  }
}

function formatMoney(value, currency = "GBP") {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

function PenIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10-10-4-4L4 16v4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m12.5 7.5 4 4" />
    </svg>
  );
}

function CarIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 15.5v-2.1c0-.8.5-1.6 1.3-1.9l2.4-1 2-2.4c.5-.6 1.2-.9 2-.9h4.6c.7 0 1.3.2 1.8.7l2.4 2.4 1.8.6c1 .3 1.7 1.2 1.7 2.3v2.3"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15.5h14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.4 8.6h4.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.1 10.4h10.2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 15.5V17M17.5 15.5V17" />
      <circle cx="7.5" cy="16.4" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="16.4" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChevronIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function UserIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function ArrowIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m13 6 6 6-6 6" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V4h6v3" />
    </svg>
  );
}

function getSelectedPricing(state) {
  return (state?.pricing?.vehicles || []).find((item) => item.vehicle.code === state?.selection?.vehicleCode) || null;
}

function deriveBasketStatus(state) {
  const hasRoute = Boolean(state?.route?.pickup && state?.route?.dropoff);
  if (!hasRoute) {
    return { label: "Basket Empty", nextHref: "/quote", nextLabel: "Start Booking" };
  }

  const hasVehicle = Boolean(state?.selection?.vehicleCode && state?.selectedVehicle?.name);
  if (!hasVehicle) {
    return { label: "Vehicle Pending", nextHref: "/quote/vehicles", nextLabel: "Select Vehicle" };
  }

  const hasOutboundQuote = Boolean(state?.quotes?.outboundQuoteId);
  if (!hasOutboundQuote) {
    return { label: "Quote Pending", nextHref: "/quote/vehicles", nextLabel: "Get Quote" };
  }

  const outbound = state?.passenger?.outbound || {};
  const hasOutboundDetails =
    required(outbound.leadName) &&
    required(outbound.mobile) &&
    required(outbound.pickupAt);
  const isReturn = state?.selection?.tripType === "return" && state?.route?.isReturnJourney;
  const inbound = state?.passenger?.inbound || {};
  const hasInboundDetails =
    !isReturn ||
    (required(inbound.leadName) &&
      required(inbound.mobile) &&
      required(inbound.pickupAt));

  if (!hasOutboundDetails || !hasInboundDetails) {
    return { label: "Details Pending", nextHref: "/quote/details", nextLabel: "Add Passenger Details" };
  }

  return { label: "Ready to Pay", nextHref: "/quote/payment", nextLabel: "Continue to Payment" };
}

function BasketInfoCard({ title, defaultOpen = false, children }) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(24,39,58,0.9))] p-4 text-white shadow-[0_18px_40px_rgba(2,9,18,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#8fd9f4]">{title}</p>
        <ChevronIcon className="h-4 w-4 text-slate-300 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export default function BasketPage() {
  const state = useSyncExternalStore(
    subscribeBookingFlow,
    getBookingFlowSnapshot,
    getBookingFlowServerSnapshot,
  );

  const hasBasket = Boolean(state?.route?.pickup && state?.route?.dropoff);
  const selectedPricing = getSelectedPricing(state);
  const isReturn = state?.selection?.tripType === "return" && state?.route?.isReturnJourney;
  const totalFare = isReturn ? selectedPricing?.returnTotal || 0 : selectedPricing?.singleTotal || 0;
  const status = deriveBasketStatus(state);

  if (!hasBasket) {
    return (
      <div className="mx-auto max-w-5xl py-8">
        <section className="rounded-[28px] bg-[linear-gradient(180deg,rgba(29,46,66,0.96),rgba(20,34,52,0.92))] p-5 text-white shadow-[0_24px_56px_rgba(2,9,18,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#8fd9f4]">My Basket</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-white">No active booking in basket.</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">
            Start a journey, select your route, and your current booking will appear here automatically.
          </p>
          <div className="mt-5">
            <Link
              href="/quote"
              className="inline-flex rounded-md bg-[#2e99c8] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(46,153,200,0.28)] hover:bg-[#34a7da]"
            >
              Start Booking
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-8">
      <section className="rounded-[28px] bg-[linear-gradient(180deg,rgba(29,46,66,0.96),rgba(20,34,52,0.92))] p-5 text-white shadow-[0_24px_56px_rgba(2,9,18,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8fd9f4]">My Basket</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-white">Current booking summary.</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-200">
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Status</span>
                <span className="font-semibold text-white">{status.label}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Est Total</span>
                <span className="font-semibold text-white">{formatMoney(totalFare, "GBP")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <QuoteBookingDetailsCard
          title="Active Basket"
          vehicleName=""
          tripType={state?.selection?.tripType || "single"}
          outbound={{
            pickup: state?.route?.pickup,
            dropoff: state?.route?.dropoff,
            metrics: state?.metrics?.outbound,
          }}
          inbound={
            isReturn
              ? {
                  pickup: state?.route?.dropoff,
                  dropoff: state?.route?.pickup,
                  metrics: state?.metrics?.inbound,
                }
              : null
          }
          fares={{
            outbound: selectedPricing?.singleTotal || 0,
            inbound: selectedPricing?.inboundBreakdown?.total || 0,
            total: totalFare,
            currency: "GBP",
          }}
          headerActions={
            <>
              <Link
                href="/quote?prefill=1"
                aria-label="Edit journey"
                title="Edit journey"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.14)]"
              >
                <PenIcon className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/quote/vehicles"
                aria-label={state?.selectedVehicle?.name ? "Change vehicle" : "Select vehicle"}
                title={state?.selectedVehicle?.name ? "Change vehicle" : "Select vehicle"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2e99c8] text-white shadow-[0_12px_24px_rgba(46,153,200,0.28)] hover:bg-[#34a7da]"
              >
                <CarIcon className="h-5 w-5" />
              </Link>
              <Link
                href="/quote/details"
                aria-label="Edit passenger details"
                title="Edit passenger details"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.14)]"
              >
                <UserIcon className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={status.nextHref}
                aria-label={status.nextLabel}
                title={status.nextLabel}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2e99c8] text-white shadow-[0_12px_24px_rgba(46,153,200,0.28)] hover:bg-[#34a7da]"
              >
                <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => clearBookingFlowState()}
                aria-label="Clear basket"
                title="Clear basket"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(157,44,60,0.24)] text-rose-100 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.18)] hover:bg-[rgba(157,44,60,0.36)]"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </>
          }
        />

        <div className="space-y-4">
          <BasketInfoCard title="Vehicle Snapshot" defaultOpen>
            <div className="space-y-2.5 text-xs text-slate-200">
              <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                <span className="font-semibold text-white">Trip Type:</span> {isReturn ? "Return" : "Single"}
              </div>
              <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                <span className="font-semibold text-white">Stops:</span> {(state?.route?.stops || []).length}
              </div>
              <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                <span className="font-semibold text-white">Vehicle:</span> {state?.selectedVehicle?.name || "Not selected yet"}
              </div>
              <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                <span className="font-semibold text-white">Quote Expires:</span> {state?.quotes?.expiresAt || "Not reserved yet"}
              </div>
            </div>
          </BasketInfoCard>

          <BasketInfoCard title="Outbound Passenger" defaultOpen={false}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Lead Passenger</p>
                <p className="mt-1 text-xs font-medium text-white">{state?.passenger?.outbound?.leadName || "Not added yet"}</p>
              </div>
              <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Mobile</p>
                <p className="mt-1 text-xs font-medium text-white">{state?.passenger?.outbound?.mobile || "Not added yet"}</p>
              </div>
              <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Outbound Pickup</p>
                <p className="mt-1 text-xs font-medium text-white">
                  {formatPickup(state?.passenger?.outbound?.pickupAt, state?.passenger?.outbound?.pickupTimeZone)}
                </p>
              </div>
              <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Passengers / Luggage</p>
                <p className="mt-1 text-xs font-medium text-white">
                  {(state?.passenger?.outbound?.passengers || "1")} / {state?.passenger?.outbound?.luggage || "none"}
                </p>
              </div>
            </div>
          </BasketInfoCard>

          {isReturn ? (
            <BasketInfoCard title="Inbound Passenger" defaultOpen={false}>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Lead Passenger</p>
                  <p className="mt-1 text-xs font-medium text-white">{state?.passenger?.inbound?.leadName || "Not added yet"}</p>
                </div>
                <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Mobile</p>
                  <p className="mt-1 text-xs font-medium text-white">{state?.passenger?.inbound?.mobile || "Not added yet"}</p>
                </div>
                <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Inbound Pickup</p>
                  <p className="mt-1 text-xs font-medium text-white">
                    {formatPickup(state?.passenger?.inbound?.pickupAt, state?.passenger?.inbound?.pickupTimeZone)}
                  </p>
                </div>
                <div className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Passengers / Luggage</p>
                  <p className="mt-1 text-xs font-medium text-white">
                    {(state?.passenger?.inbound?.passengers || "1")} / {state?.passenger?.inbound?.luggage || "none"}
                  </p>
                </div>
              </div>
            </BasketInfoCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
