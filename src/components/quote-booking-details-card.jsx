"use client";

function locationText(location) {
  return String(location?.address || location?.label || "").trim();
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

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function JourneySection({ legKey, label, route, renderLegActions }) {
  const actions = renderLegActions?.({ legKey, route }) || null;

  return (
    <section className="rounded-xl bg-[linear-gradient(180deg,rgba(14,24,37,0.9),rgba(18,31,46,0.76))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_28px_rgba(3,10,18,0.26)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#67c8ee]">{label}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-200">
        <div className="rounded-lg bg-[rgba(47,140,66,0.22)] px-4 py-3">
          <span className="mr-2 font-semibold text-emerald-200">From:</span>
          <span>{locationText(route?.pickup)}</span>
        </div>
        <div className="rounded-lg bg-[rgba(168,79,85,0.22)] px-4 py-3">
          <span className="mr-2 font-semibold text-rose-200">To:</span>
          <span>{locationText(route?.dropoff)}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-[rgba(255,255,255,0.06)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <span className="mr-2 font-semibold text-white">Estimated Time:</span>
            <span>{route?.metrics?.minutes || 0} minutes</span>
          </div>
          <div className="rounded-lg bg-[rgba(255,255,255,0.06)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <span className="mr-2 font-semibold text-white">Distance:</span>
            <span>{route?.metrics?.miles || 0} miles</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function QuoteBookingDetailsCard({
  title = "Booking Details",
  vehicleName = "",
  tripType = "single",
  outbound,
  inbound = null,
  fares = null,
  className = "",
  renderLegActions,
  headerActions = null,
  footerActions = null,
}) {
  const legs = [
    {
      legKey: "outbound",
      label: inbound ? "Outbound" : "Journey",
      route: outbound,
    },
    ...(inbound
      ? [
          {
            legKey: "inbound",
            label: "Inbound",
            route: inbound,
          },
        ]
      : []),
  ];

  return (
    <article
      className={cn(
        "rounded-2xl bg-[linear-gradient(180deg,rgba(28,45,66,0.94),rgba(24,39,58,0.9))] p-5 text-white shadow-[0_22px_52px_rgba(1,8,16,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#8fd9f4]">Booking Summary</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-white">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-medium">
          {vehicleName ? (
            <span className="rounded-full bg-[rgba(255,255,255,0.08)] px-3 py-1.5 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              Vehicle: {vehicleName}
            </span>
          ) : null}
          <span className="rounded-full bg-[#67c8ee]/12 px-3 py-1.5 text-[#c7effb] shadow-[inset_0_0_0_1px_rgba(103,200,238,0.22)]">
            {tripType === "return" ? "Return Trip" : "Single Trip"}
          </span>
          {headerActions ? <div className="flex flex-wrap gap-2">{headerActions}</div> : null}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {legs.map((leg) => (
          <JourneySection
            key={leg.legKey}
            legKey={leg.legKey}
            label={leg.label}
            route={leg.route}
            renderLegActions={renderLegActions}
          />
        ))}
      </div>

      {fares ? (
        <div className="mt-5 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-semibold text-white">Fare Summary</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-200">
            <div className="flex justify-between gap-4">
              <span>Outbound Fare</span>
              <span>{formatMoney(fares.outbound, fares.currency)}</span>
            </div>
            {inbound ? (
              <div className="flex justify-between gap-4">
                <span>Inbound Fare</span>
                <span>{formatMoney(fares.inbound, fares.currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 pt-3 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span>Total Fare</span>
              <span>{formatMoney(fares.total, fares.currency)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {footerActions ? (
        <div className="mt-5 flex flex-wrap gap-3 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {footerActions}
        </div>
      ) : null}
    </article>
  );
}
