"use client";

export const BOOKING_FLOW_STORAGE_KEY = "scot_booking_flow_v1";
const bookingFlowListeners = new Set();
const emptyBookingFlowSnapshot = createEmptyBookingFlow();
let cachedRaw = null;
let cachedSnapshot = emptyBookingFlowSnapshot;

export function createEmptyBookingFlow() {
  return {
    createdAt: "",
    route: null,
    metrics: null,
    pricing: null,
    selection: {
      vehicleCode: "",
      tripType: "single",
    },
    selectedVehicle: null,
    quotes: {
      outboundQuoteId: "",
      inboundQuoteId: "",
      expiresAt: "",
    },
    payment: {
      requestKey: "",
      clientSecret: "",
      paymentIntentId: "",
      amount: 0,
      currency: "GBP",
    },
    passenger: {
      outbound: {
        leadName: "",
        mobile: "",
        email: "",
        passengers: "1",
        luggage: "none",
        flightNumber: "",
        arrivingFrom: "",
        pickupAt: "",
        pickupTimeZone: "",
        meetAndGreet: "yes",
        specialInstructions: "",
      },
      inbound: {
        leadName: "",
        mobile: "",
        email: "",
        passengers: "1",
        luggage: "none",
        flightNumber: "",
        arrivingFrom: "",
        pickupAt: "",
        pickupTimeZone: "",
        meetAndGreet: "no",
        specialInstructions: "",
      },
    },
  };
}

function hasWindow() {
  return typeof window !== "undefined";
}

function normalizeBookingFlowState(parsed) {
  const fallback = createEmptyBookingFlow();

  return {
    ...fallback,
    ...(parsed || {}),
    selection: {
      ...fallback.selection,
      ...(parsed?.selection || {}),
    },
    quotes: {
      ...fallback.quotes,
      ...(parsed?.quotes || {}),
    },
    payment: {
      ...fallback.payment,
      ...(parsed?.payment || {}),
    },
    passenger: {
      ...fallback.passenger,
      ...(parsed?.passenger || {}),
      outbound: {
        ...fallback.passenger.outbound,
        ...(parsed?.passenger?.outbound || {}),
      },
      inbound: {
        ...fallback.passenger.inbound,
        ...(parsed?.passenger?.inbound || {}),
      },
    },
  };
}

export function getBookingFlowServerSnapshot() {
  return emptyBookingFlowSnapshot;
}

export function getBookingFlowSnapshot() {
  if (!hasWindow()) {
    return emptyBookingFlowSnapshot;
  }

  try {
    const raw = window.localStorage.getItem(BOOKING_FLOW_STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedSnapshot;
    }

    if (!raw) {
      cachedRaw = null;
      cachedSnapshot = emptyBookingFlowSnapshot;
      return cachedSnapshot;
    }

    cachedRaw = raw;
    cachedSnapshot = normalizeBookingFlowState(JSON.parse(raw));
    return cachedSnapshot;
  } catch {
    cachedRaw = null;
    cachedSnapshot = emptyBookingFlowSnapshot;
    return cachedSnapshot;
  }
}

export function readBookingFlowState() {
  return getBookingFlowSnapshot();
}

export function saveBookingFlowState(state) {
  if (!hasWindow()) return;
  const next = normalizeBookingFlowState(state || createEmptyBookingFlow());
  const raw = JSON.stringify(next);
  cachedRaw = raw;
  cachedSnapshot = next;
  window.localStorage.setItem(BOOKING_FLOW_STORAGE_KEY, raw);
  bookingFlowListeners.forEach((listener) => listener());
}

export function clearBookingFlowState() {
  if (!hasWindow()) return;
  cachedRaw = null;
  cachedSnapshot = emptyBookingFlowSnapshot;
  window.localStorage.removeItem(BOOKING_FLOW_STORAGE_KEY);
  bookingFlowListeners.forEach((listener) => listener());
}

export function subscribeBookingFlow(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  bookingFlowListeners.add(listener);
  return () => {
    bookingFlowListeners.delete(listener);
  };
}
