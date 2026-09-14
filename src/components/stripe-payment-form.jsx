"use client";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";

const cardElementOptions = {
  hidePostalCode: true,
  style: {
    base: {
      color: "#f8fafc",
      fontSize: "16px",
      fontFamily: "inherit",
      "::placeholder": {
        color: "rgba(226,232,240,0.6)",
      },
      iconColor: "#63c7ee",
    },
    invalid: {
      color: "#fca5a5",
      iconColor: "#fca5a5",
    },
  },
};

export function StripePaymentForm({
  billingEmail = "",
  clientSecret = "",
  disabled = false,
  onSubmit,
  submitLabel = "Pay now",
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!stripe || !elements || disabled || processing) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Secure card form is still loading. Please try again.");
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: billingEmail || undefined,
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Payment could not be confirmed.");
      }

      const paymentIntent = result.paymentIntent;
      if (!paymentIntent?.id) {
        throw new Error("Stripe payment confirmation did not return a payment intent.");
      }

      if (paymentIntent.status !== "succeeded") {
        throw new Error(`Payment status is ${paymentIntent.status}.`);
      }

      await onSubmit(paymentIntent.id);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Payment failed.";
      setError(message);
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl bg-[linear-gradient(180deg,rgba(13,25,39,0.62),rgba(14,26,40,0.82))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Card details</p>
            <p className="mt-1 text-sm text-slate-300">Enter your card securely to complete the booking.</p>
          </div>

          <div className="relative min-h-[72px] rounded-xl bg-[rgba(7,16,26,0.72)] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
            {!cardReady ? (
              <div className="absolute inset-0 flex items-center rounded-xl px-4 text-sm text-slate-300">
                Loading secure card form...
              </div>
            ) : null}
            <CardElement
              options={cardElementOptions}
              onReady={() => setCardReady(true)}
              onChange={(event) => {
                if (event.error?.message) {
                  setError(event.error.message);
                } else {
                  setError("");
                }
              }}
              className={cardReady ? "" : "opacity-0"}
            />
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={!stripe || !elements || disabled || processing || !cardReady}
        className="site-primary-btn w-full rounded-md px-4 py-3 text-sm font-semibold disabled:opacity-60"
      >
        {processing ? "Processing payment..." : submitLabel}
      </button>
    </form>
  );
}
