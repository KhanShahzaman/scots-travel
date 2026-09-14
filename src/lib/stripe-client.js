"use client";

import { loadStripe } from "@stripe/stripe-js";

let stripePromise = null;

export function getStripeClient() {
  if (!stripePromise) {
    const publishableKey =
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_dummy_replace_me";
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}


