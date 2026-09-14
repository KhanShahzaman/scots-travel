"use client";

import { useContext } from "react";
import { BookingFlowContext } from "@/components/booking-flow-provider";

export function useBookingFlow() {
  const context = useContext(BookingFlowContext);

  if (!context) {
    throw new Error("useBookingFlow must be used within BookingFlowProvider.");
  }

  return context;
}
