"use client";

import { createContext, useMemo, useSyncExternalStore } from "react";
import {
  clearBookingFlowState,
  getBookingFlowServerSnapshot,
  getBookingFlowSnapshot,
  saveBookingFlowState,
  subscribeBookingFlow,
} from "@/lib/booking-flow-client";

export const BookingFlowContext = createContext(null);

export function BookingFlowProvider({ children }) {
  const state = useSyncExternalStore(
    subscribeBookingFlow,
    getBookingFlowSnapshot,
    getBookingFlowServerSnapshot,
  );
  const hydrated = useSyncExternalStore(
    subscribeBookingFlow,
    () => true,
    () => false,
  );

  const value = useMemo(
    () => ({
      state,
      hydrated,
      updateState(updater) {
        const current = getBookingFlowSnapshot();
        const next =
          typeof updater === "function"
            ? updater(current)
            : { ...current, ...(updater || {}) };
        saveBookingFlowState(next);
      },
      resetState() {
        clearBookingFlowState();
      },
    }),
    [hydrated, state],
  );

  return (
    <BookingFlowContext.Provider value={value}>
      {children}
    </BookingFlowContext.Provider>
  );
}
