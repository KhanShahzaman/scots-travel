"use client";

import { Elements } from "@stripe/react-stripe-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { QuoteBookingDetailsCard } from "@/components/quote-booking-details-card";
import { StripePaymentForm } from "@/components/stripe-payment-form";
import { useBookingFlow } from "@/hooks/use-booking-flow";
import { getStripeClient } from "@/lib/stripe-client";

export default function QuotePaymentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { state, hydrated, resetState, updateState } = useBookingFlow();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [processing, setProcessing] = useState(false);
  const [redirectingToSuccess, setRedirectingToSuccess] = useState(false);
  const [intentLoading, setIntentLoading] = useState(false);

  const hasFlow = Boolean(state?.route && state?.selection?.vehicleCode && state?.quotes?.outboundQuoteId);

  const selectedPricing = useMemo(
    () => (state?.pricing?.vehicles || []).find((item) => item.vehicle.code === state.selection.vehicleCode) || null,
    [state?.pricing?.vehicles, state?.selection?.vehicleCode],
  );

  const paymentRequestKey = useMemo(
    () =>
      [
        state?.selection?.tripType || "single",
        state?.selection?.vehicleCode || "",
        state?.quotes?.outboundQuoteId || "",
        state?.quotes?.inboundQuoteId || "",
      ].join(":"),
    [state?.quotes?.inboundQuoteId, state?.quotes?.outboundQuoteId, state?.selection?.tripType, state?.selection?.vehicleCode],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (redirectingToSuccess) return;
    if (!hasFlow) {
      router.replace("/quote/details");
    }
  }, [hasFlow, hydrated, redirectingToSuccess, router]);

  useEffect(() => {
    if (!hydrated || !hasFlow || !session?.user?.email) {
      return;
    }

    const currentPayment = state?.payment || {};
    if (currentPayment.requestKey === paymentRequestKey && currentPayment.clientSecret) {
      return;
    }

    let cancelled = false;

    async function createPaymentIntent() {
      setIntentLoading(true);
      setError("");
      setNotice("");

      try {
        const response = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripType: state.selection.tripType,
            selectedVehicle: state.selectedVehicle,
            quoteIds: state.quotes,
          }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || "Unable to initialize Stripe payment.");
        }

        if (cancelled) {
          return;
        }

        updateState((previous) => ({
          ...previous,
          payment: {
            requestKey: paymentRequestKey,
            clientSecret: result.clientSecret || "",
            paymentIntentId: result.paymentIntentId || "",
            amount: Number(result.amount || 0),
            currency: String(result.currency || "GBP").toUpperCase(),
          },
        }));
      } catch (intentError) {
        const message =
          intentError instanceof Error ? intentError.message : "Unable to initialize payment.";
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIntentLoading(false);
        }
      }
    }

    createPaymentIntent();

    return () => {
      cancelled = true;
    };
  }, [
    hasFlow,
    hydrated,
    paymentRequestKey,
    session?.user?.email,
    state?.payment,
    state?.quotes,
    state?.selectedVehicle,
    state?.selection?.tripType,
    updateState,
  ]);

  async function confirmReservation(paymentIntentId) {
    if (!session?.user?.email) {
      setError("Please login/signup first to confirm reservation.");
      return;
    }

    setProcessing(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripType: state.selection.tripType,
          route: state.route,
          metrics: state.metrics,
          selectedVehicle: state.selectedVehicle,
          paymentIntentId,
          quoteIds: state.quotes,
          passenger:
            state.selection.tripType === "return"
              ? state.passenger
              : {
                  outbound: state.passenger?.outbound,
                },
          pricing: {
            singleTotal: selectedPricing?.singleTotal || 0,
            returnTotal: selectedPricing?.returnTotal || 0,
          },
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Failed to create reservation.");
      }

      const refs = Array.isArray(result.bookingRefs) ? result.bookingRefs.join(",") : "";
      const params = new URLSearchParams();
      if (refs) {
        params.set("refs", refs);
      }
      if (result.tripGroupId) {
        params.set("group", result.tripGroupId);
      }
      setRedirectingToSuccess(true);
      resetState();
      router.push(`/quote/success?${params.toString()}`, { scroll: false });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to confirm reservation.";
      setError(message);
    } finally {
      setProcessing(false);
    }
  }

  if (!hydrated || (!hasFlow && !redirectingToSuccess)) {
    return (
      <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(24,39,58,0.9))] p-6 text-sm text-slate-200 shadow-[0_20px_44px_rgba(2,9,18,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
        Loading payment screen...
      </div>
    );
  }

  if (redirectingToSuccess) {
    return (
      <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(24,39,58,0.9))] p-6 text-sm text-slate-200 shadow-[0_20px_44px_rgba(2,9,18,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
        Finalizing your reservation...
      </div>
    );
  }

  const isReturn = state.selection.tripType === "return" && state.route.isReturnJourney;
  const totalFare = isReturn ? selectedPricing?.returnTotal || 0 : selectedPricing?.singleTotal || 0;
  const nextPath = "/quote/payment";
  const isLoggedIn = Boolean(session?.user?.email);
  const route = state?.route;
  const metrics = state?.metrics;
  const stripeClient = getStripeClient();
  const clientSecret =
    state?.payment?.requestKey === paymentRequestKey ? state?.payment?.clientSecret || "" : "";
  const paymentReady = Boolean(clientSecret);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]  max-w-5xl py-10  mx-auto">
      <section className="space-y-4 rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(24,39,58,0.9))] p-5 text-white shadow-[0_24px_60px_rgba(2,9,18,0.34),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <h1 className="text-3xl font-semibold">Payment</h1>
        {isLoggedIn ? (
          <>
            <p className="text-sm text-slate-100">
              Pay securely with Stripe to complete your reservation.
            </p>
            <p className="text-sm text-emerald-200">Logged in as {session.user.email}</p>
            {intentLoading ? (
              <div className="rounded-xl bg-[linear-gradient(180deg,rgba(13,25,39,0.62),rgba(14,26,40,0.82))] p-4 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                Preparing secure Stripe payment...
              </div>
            ) : paymentReady ? (
              <Elements
                stripe={stripeClient}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#63c7ee",
                      colorBackground: "#0f1b29",
                      colorText: "#f8fafc",
                      colorDanger: "#fca5a5",
                      borderRadius: "12px",
                    },
                  },
                }}
              >
                <StripePaymentForm
                  billingEmail={session?.user?.email || ""}
                  clientSecret={clientSecret}
                  disabled={processing}
                  onSubmit={confirmReservation}
                  submitLabel={processing ? "Finalizing reservation..." : `Pay ${totalFare.toFixed(2)} GBP`}
                />
              </Elements>
            ) : (
              <div className="rounded-xl bg-[linear-gradient(180deg,rgba(13,25,39,0.62),rgba(14,26,40,0.82))] p-4 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                Stripe payment could not be prepared yet.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(13,25,39,0.62),rgba(14,26,40,0.82))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-base text-slate-100">Login or create account to continue to payment.</p>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}`}
                className="site-primary-btn rounded-md px-5 py-2.5 text-sm font-semibold"
              >
                Login
              </Link>
              <Link
                href={`/signup?next=${encodeURIComponent(nextPath)}`}
                className="rounded-md bg-[rgba(255,255,255,0.08)] px-5 py-2.5 text-sm font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.14)]"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <QuoteBookingDetailsCard
          title="Reservation Summary"
          vehicleName={state.selectedVehicle?.name || ""}
          tripType={state.selection?.tripType || "single"}
          outbound={{
            pickup: route?.pickup,
            dropoff: route?.dropoff,
            metrics: metrics?.outbound,
          }}
          inbound={
            isReturn
              ? {
                  pickup: route?.dropoff,
                  dropoff: route?.pickup,
                  metrics: metrics?.inbound,
                }
              : null
          }
          fares={{
            outbound: selectedPricing?.singleTotal || 0,
            inbound: selectedPricing?.inboundBreakdown?.total || 0,
            total: totalFare,
            currency: "GBP",
          }}
        />

        {isLoggedIn ? (
          <div className="flex items-center justify-between rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(23,37,55,0.9))] p-4 shadow-[0_18px_40px_rgba(1,8,16,0.28),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={() => router.push("/quote/details", { scroll: false })}
              className="rounded-md bg-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.14)]"
            >
              Back
            </button>
            <span className="text-sm font-semibold text-white">{totalFare.toFixed(2)} GBP</span>
          </div>
        ) : null}

        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
