'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { QuoteBookingDetailsCard } from '@/components/quote-booking-details-card';
import { useBookingFlow } from '@/hooks/use-booking-flow';
import { toApiLocationPayload } from '@/lib/location-utils';

function reverseStops(stops) {
  return [...(stops || [])].reverse();
}

function formatMoney(value, currency = 'GBP') {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

function locationText(location) {
  return String(location?.address || location?.label || '').trim();
}

function buildGoogleMapsUrl({ pickup, dropoff, stops = [] }) {
  const origin = encodeURIComponent(locationText(pickup));
  const destination = encodeURIComponent(locationText(dropoff));
  const waypointText = (stops || [])
    .map((item) => locationText(item))
    .filter(Boolean)
    .join('|');
  const waypoints = waypointText
    ? `&waypoints=${encodeURIComponent(waypointText)}`
    : '';
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`;
}

function buildGoogleMapsEmbedUrl({ pickup, dropoff }) {
  const query = encodeURIComponent(
    `${locationText(pickup)} to ${locationText(dropoff)}`,
  );
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

async function reserveQuote(payload) {
  const response = await fetch('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'Unable to reserve selected vehicle.');
  }
  if (!result.quoteId) {
    throw new Error('Quote ID is missing in reserve response.');
  }
  return result;
}

export default function QuoteVehiclesPage() {
  const router = useRouter();
  const { state, hydrated, updateState } = useBookingFlow();
  const [selectedCode, setSelectedCode] = useState('');
  const [tripType, setTripType] = useState('single');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeMap, setActiveMap] = useState('');

  const hasData = Boolean(
    state?.route &&
    state?.pricing?.vehicles?.length > 0 &&
    state?.metrics?.outbound,
  );

  const selectedVehicle = useMemo(
    () =>
      (state?.pricing?.vehicles || []).find(
        (item) => item.vehicle?.code === selectedCode,
      ) || null,
    [selectedCode, state?.pricing?.vehicles],
  );

  const canReturn = useMemo(
    () =>
      (state?.pricing?.vehicles || []).some(
        (item) =>
          item?.inboundBreakdown &&
          Number(item?.inboundBreakdown?.total || 0) > 0,
      ),
    [state?.pricing?.vehicles],
  );

  const isReturn = tripType === 'return' && canReturn;

  const outboundRoute = useMemo(
    () => ({
      pickup: state?.route?.pickup,
      dropoff: state?.route?.dropoff,
      stops: state?.route?.stops || [],
      metrics: state?.metrics?.outbound || null,
    }),
    [
      state?.metrics?.outbound,
      state?.route?.dropoff,
      state?.route?.pickup,
      state?.route?.stops,
    ],
  );

  const inboundRoute = useMemo(
    () => ({
      pickup: state?.route?.dropoff,
      dropoff: state?.route?.pickup,
      stops: reverseStops(state?.route?.stops || []),
      metrics: state?.metrics?.inbound || null,
    }),
    [
      state?.metrics?.inbound,
      state?.route?.dropoff,
      state?.route?.pickup,
      state?.route?.stops,
    ],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!hasData) {
      router.replace('/quote');
      return;
    }

    const firstCode = state.pricing.vehicles[0]?.vehicle?.code || '';
    setSelectedCode(state.selection?.vehicleCode || firstCode);
    setTripType(
      canReturn && state.selection?.tripType === 'return' ? 'return' : 'single',
    );
  }, [canReturn, hydrated, hasData, router, state]);

  useEffect(() => {
    if (!canReturn && tripType === 'return') {
      setTripType('single');
    }
  }, [canReturn, tripType]);

  useEffect(() => {
    if (!isReturn && activeMap === 'inbound') {
      setActiveMap('');
    }
  }, [activeMap, isReturn]);

  async function continueToDetails() {
    if (!selectedVehicle) {
      setError('Please select a vehicle.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const route = state.route;
      const outboundMetrics = state.metrics.outbound;
      const inboundMetrics = state.metrics.inbound;

      const outboundPayload = {
        pickup: toApiLocationPayload(route.pickup),
        dropoff: toApiLocationPayload(route.dropoff),
        stops: (route.stops || []).map((item) => toApiLocationPayload(item)),
        miles: outboundMetrics.miles,
        includeMeetAndGreet: route.includeMeetAndGreet,
        isNightRide: route.isNightRide,
        vehicleCode: selectedVehicle.vehicle.code,
      };

      const outboundReserved = await reserveQuote(outboundPayload);
      let inboundReserved = null;

      if (isReturn && inboundMetrics) {
        inboundReserved = await reserveQuote({
          pickup: toApiLocationPayload(route.dropoff),
          dropoff: toApiLocationPayload(route.pickup),
          stops: reverseStops(route.stops).map((item) =>
            toApiLocationPayload(item),
          ),
          miles: inboundMetrics.miles,
          includeMeetAndGreet: route.includeMeetAndGreet,
          isNightRide: route.isNightRide,
          vehicleCode: selectedVehicle.vehicle.code,
        });
      }

      updateState((previous) => ({
        ...previous,
        selection: {
          vehicleCode: selectedVehicle.vehicle.code,
          tripType,
        },
        selectedVehicle: selectedVehicle.vehicle,
        quotes: {
          outboundQuoteId: outboundReserved.quoteId,
          inboundQuoteId: inboundReserved?.quoteId || '',
          expiresAt: outboundReserved.expiresAt || '',
        },
      }));

      router.push('/quote/details', { scroll: false });
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to continue.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated || !hasData) {
    return (
      <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(24,39,58,0.9))] p-6 text-sm text-slate-200 shadow-[0_20px_44px_rgba(2,9,18,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
        Loading vehicle options...
      </div>
    );
  }

  return (
    <div className="-mx-4 home-page-bg min-h-screen">
      <div className="mx-auto max-w-[1120px] px-4 pb-12 pt-[118px]">
        <div className="mx-auto max-w-[1720px]">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[8px] bg-[rgba(48,58,68,0.85)] p-6 text-white shadow-[0_20px_48px_rgba(0,0,0,0.25)] backdrop-blur-[2px]">
              <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-white">
                Select Your Vehicle Below
              </h1>

              <p className="mt-3 text-[15px] leading-6 text-gray-300">
                The fare includes any applicable Tax, Credit/Debit card charges
                and 60 minutes waiting time at the airports after flights lands.
              </p>

              <h2 className="mt-5 text-[18px] font-semibold text-white">
                Select Return and Save !
              </h2>

              <div className="mt-4 space-y-3">
                {(state.pricing.vehicles || []).map((item) => {
                  const code = item.vehicle?.code || '';
                  const currency = item.outboundBreakdown?.currency || 'GBP';
                  const singleChecked =
                    selectedCode === code && tripType === 'single';
                  const returnChecked =
                    selectedCode === code && tripType === 'return';
                  const isSelected = singleChecked || returnChecked;

                  return (
                    <article
                      key={code}
                      className={`rounded-[6px] border p-4 transition-colors ${
                        isSelected
                          ? 'border-[#6ba5c7] bg-[rgba(107,165,199,0.1)]'
                          : 'border-[#3a4753] bg-[rgba(48,58,68,0.6)]'
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        {/* Image and content row */}
                        <div className="flex gap-4">
                          {/* Vehicle image */}
                          <div className="shrink-0">
                            <div className="flex h-[80px] w-[120px] items-center justify-center rounded-[4px] bg-[#2a3743] p-2">
                              <div className="flex h-full w-full items-center justify-center">
                                {item.vehicle?.image?.url ? (
                                  <Image
                                    src={item.vehicle.image.url}
                                    alt={
                                      item.vehicle.image.alt ||
                                      item.vehicle.name
                                    }
                                    width={120}
                                    height={70}
                                    className="h-full w-full object-contain"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="text-xs text-gray-400">
                                    No image
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Price radios and vehicle details */}
                          <div className="flex flex-1 flex-col gap-2">
                            {/* Price row */}
                            <div className="flex flex-wrap items-center gap-4">
                              {/* Single price with radio */}
                              <label className="flex cursor-pointer items-center gap-2 text-white">
                                <input
                                  type="radio"
                                  name={`vehicle-choice-${code}`}
                                  checked={singleChecked}
                                  onChange={() => {
                                    setSelectedCode(code);
                                    setTripType('single');
                                  }}
                                  className="h-3.5 w-3.5 accent-[#6ba5c7]"
                                />
                                <span className="whitespace-nowrap text-base font-medium">
                                  Single:{' '}
                                  {formatMoney(item.singleTotal, currency)}
                                </span>
                              </label>

                              {/* Return price with radio */}
                              {canReturn && (
                                <label className="flex cursor-pointer items-center gap-2 text-white">
                                  <input
                                    type="radio"
                                    name={`vehicle-choice-${code}`}
                                    checked={returnChecked}
                                    onChange={() => {
                                      setSelectedCode(code);
                                      setTripType('return');
                                    }}
                                    className="h-3.5 w-3.5 accent-[#6ba5c7]"
                                  />
                                  <span className="whitespace-nowrap text-base font-medium">
                                    Return:{' '}
                                    {formatMoney(item.returnTotal, currency)}
                                  </span>
                                </label>
                              )}
                            </div>

                          </div>
                        </div>
                      </div>

                            {/* Vehicle name and description */}
                            <div>
                              <h3 className="text-[15px] font-medium border-b text-[#6ba5c7]">
                                {item.vehicle?.name} | {item.vehicle.variants}
                              </h3>
                              <p className="mt-0.5 text-[13px] leading-5 text-gray-300">
                                {item.vehicle?.description ||
                                  `This vehicle can accommodate up to ${item.vehicle?.seats || 0} passengers travelling with ${item.vehicle?.luggage || 0} luggage.`}
                              </p> 
                              <p className="mt-1 text-[12px] leading-5 text-gray-400">
                                Capacity: {item.vehicle?.seats || 0} passengers, {item.vehicle?.luggage || 0} luggage
                              </p>
                            </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <div className="space-y-6">
              <QuoteBookingDetailsCard
                title="Your Journey Details"
                vehicleName={selectedVehicle?.vehicle?.name || ''}
                tripType={tripType}
                outbound={outboundRoute}
                inbound={isReturn ? inboundRoute : null}
                renderLegActions={({ legKey }) => (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMap((previous) =>
                        previous === legKey ? '' : legKey,
                      )
                    }
                    className="rounded-md bg-[linear-gradient(180deg,#58bde0,#2f7ea0)] px-3 py-2 text-xs font-medium text-white hover:brightness-105"
                  >
                    {activeMap === legKey ? 'Hide Map' : 'Show Map'}
                  </button>
                )}
              />

              {activeMap && (
                <div className="rounded-[6px] bg-[rgba(38,48,58,0.95)] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">
                      {activeMap === 'inbound' ? 'Inbound map' : 'Journey map'}
                    </p>
                    <a
                      href={buildGoogleMapsUrl(
                        activeMap === 'inbound' ? inboundRoute : outboundRoute,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[4px] border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                  <div className="overflow-hidden rounded-[6px] border border-white/10">
                    <iframe
                      title={
                        activeMap === 'inbound'
                          ? 'Inbound route map'
                          : 'Journey route map'
                      }
                      src={buildGoogleMapsEmbedUrl(
                        activeMap === 'inbound' ? inboundRoute : outboundRoute,
                      )}
                      className="h-[280px] w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              )}

              <section className="rounded-[8px] bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(23,37,55,0.9))] p-4 shadow-[0_20px_44px_rgba(2,9,18,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Selection
                    </span>
                    <span className="rounded-full bg-[rgba(255,255,255,0.08)] px-3 py-1.5 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                      {selectedVehicle?.vehicle?.name ||
                        selectedVehicle?.name ||
                        'No vehicle selected'}
                    </span>
                    <span className="rounded-full bg-[#67c8ee]/12 px-3 py-1.5 text-sm font-semibold capitalize text-[#c7effb] shadow-[inset_0_0_0_1px_rgba(103,200,238,0.22)]">
                      {tripType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push('/quote', { scroll: false })}
                      className="rounded-[8px] bg-[rgba(255,255,255,0.08)] px-3 py-2 text-xs font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.14)]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={continueToDetails}
                      className="site-primary-btn rounded-[8px] px-4 py-2 text-xs font-semibold disabled:opacity-60"
                    >
                      {busy ? 'Preparing...' : 'Continue'}
                    </button>
                  </div>
                </div>
              </section>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
