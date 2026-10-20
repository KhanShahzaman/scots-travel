
"use client";

import { useMemo, useState } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { requestJson } from "@/components/admin/request-json";

const defaultSlabTemplate = `[
  {"fromMiles": 1, "toMiles": 10, "ratePerMile": 4.0, "order": 1},
  {"fromMiles": 11, "toMiles": null, "ratePerMile": 3.5, "order": 2}
]`;

function createInitialForm() {
  return {
    vehicleId: "",
    minimumBillableMiles: 3,
    airportPickupFee: 0,
    meetAndGreetFee: 0,
    waypointFee: 0,
    nightWindowStart: "21:00",
    nightWindowEnd: "04:00",
    nightSurchargeFee: 0,
    taxRate: 0.2,
    active: true,
    slabsText: defaultSlabTemplate,
  };
}

export function RatesManager({
  initialVehicles,
  initialRates,
}) {
  const [vehicles, setVehicles] = useState(initialVehicles || []);
  const [rates, setRates] = useState(initialRates || []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(createInitialForm);

  const vehicleLookup = useMemo(
    () =>
      vehicles.reduce((acc, current) => {
        acc[String(current._id)] = current;
        return acc;
      }, {}),
    [vehicles],
  );

  const sortedRates = useMemo(() => {
    return [...rates].sort((firstRate, secondRate) => {
      const firstVehicle =
        firstRate.vehicleId?.name
          ? firstRate.vehicleId
          : vehicleLookup[String(firstRate.vehicleId)] || {
              order: 0,
              name: "",
            };

      const secondVehicle =
        secondRate.vehicleId?.name
          ? secondRate.vehicleId
          : vehicleLookup[String(secondRate.vehicleId)] || {
              order: 0,
              name: "",
            };

      const firstOrder = Number(firstVehicle.order ?? 0);
      const secondOrder = Number(secondVehicle.order ?? 0);

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return String(firstVehicle.name || "").localeCompare(
        String(secondVehicle.name || ""),
      );
    });
  }, [rates, vehicleLookup]);

  async function refreshAll() {
    const [vehiclesPayload, ratesPayload] = await Promise.all([
      requestJson("/api/admin/vehicles"),
      requestJson("/api/admin/state-vehicle-rates"),
    ]);

    setVehicles(vehiclesPayload.vehicles || []);
    setRates(ratesPayload.rates || []);
  }

  function openCreate() {
    setEditingId("");
    setForm(createInitialForm());
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEdit(rate) {
    setEditingId(String(rate._id));

    setForm({
      vehicleId: String(
        rate.vehicleId?._id || rate.vehicleId || "",
      ),
      minimumBillableMiles: rate.minimumBillableMiles ?? 3,
      airportPickupFee: rate.airportPickupFee ?? 0,
      meetAndGreetFee: rate.meetAndGreetFee ?? 0,
      waypointFee: rate.waypointFee ?? 0,
      nightWindowStart: rate.nightWindowStart || "21:00",
      nightWindowEnd: rate.nightWindowEnd || "04:00",
      nightSurchargeFee: rate.nightSurchargeFee ?? 0,
      taxRate: rate.taxRate ?? 0.2,
      active: Boolean(rate.active),
      slabsText: JSON.stringify(rate.slabs || [], null, 2),
    });

    setError("");
    setNotice("");
    setModalOpen(true);
  }

  async function submit(event) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const slabsParsed = JSON.parse(form.slabsText);

      if (!Array.isArray(slabsParsed)) {
        throw new Error("Slabs must be a JSON array.");
      }

      const payload = {
        vehicleId: form.vehicleId,
        minimumBillableMiles: Number(form.minimumBillableMiles),
        airportPickupFee: Number(form.airportPickupFee),
        meetAndGreetFee: Number(form.meetAndGreetFee),
        waypointFee: Number(form.waypointFee),
        nightWindowStart: form.nightWindowStart,
        nightWindowEnd: form.nightWindowEnd,
        nightSurchargeFee: Number(form.nightSurchargeFee),
        taxRate: Number(form.taxRate),
        active: Boolean(form.active),
        slabs: slabsParsed,
      };

      if (editingId) {
        await requestJson(
          `/api/admin/state-vehicle-rates/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
        );
      } else {
        await requestJson("/api/admin/state-vehicle-rates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await refreshAll();

      setModalOpen(false);
      setEditingId("");
      setForm(createInitialForm());
      setNotice(editingId ? "Rate updated." : "Rate created.");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to save rate.";

      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function removeRate(id) {
    if (!window.confirm("Delete this rate?")) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await requestJson(
        `/api/admin/state-vehicle-rates/${id}`,
        { method: "DELETE" },
      );

      await refreshAll();
      setNotice("Rate deleted.");
    } catch (removeError) {
      const message =
        removeError instanceof Error
          ? removeError.message
          : "Failed to delete rate.";

      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function closeModal() {
    if (busy) return;

    setModalOpen(false);
    setEditingId("");
    setForm(createInitialForm());
    setError("");
    setNotice("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--admin-text)]">
            Global Vehicle Rates
          </p>

          <span className="rounded-full bg-[var(--admin-bg-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--admin-text)]">
            {sortedRates.length}
          </span>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="admin-primary-btn rounded-md px-3 py-1.5 text-sm font-medium"
        >
          New Rate
        </button>
      </div>

      {!modalOpen && notice ? (
        <p className="text-sm text-emerald-700">{notice}</p>
      ) : null}

      {!modalOpen && error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed border-collapse">
            <thead className="bg-[var(--admin-bg-soft)]">
              <tr className="text-left">
                <th className="w-[17%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                  Vehicle
                </th>

                <th className="w-[24%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                  Slabs
                </th>

                <th className="w-[17%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                  Fees
                </th>

                <th className="w-[15%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                  Night Hours
                </th>

                <th className="w-[10%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                  Status
                </th>

                <th className="w-[17%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedRates.map((rate) => {
                const vehicle = rate.vehicleId?.name
                  ? rate.vehicleId
                  : vehicleLookup[String(rate.vehicleId)] || {
                      name: "Unknown",
                      code: "",
                      order: 0,
                    };

                return (
                  <tr
                    key={String(rate._id)}
                    className="border-t border-[var(--admin-border)] align-top"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--admin-text)]">
                        {vehicle.name}
                      </p>

                      <p className="mt-1 text-[12px] text-[var(--admin-text-muted)]">
                        {String(vehicle.code || "").toUpperCase()} | Order{" "}
                        {vehicle.order ?? 0}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-[13px] leading-6 text-[var(--admin-text-muted)]">
                        {(rate.slabs || [])
                          .map(
                            (slab) =>
                              `${slab.fromMiles}-${slab.toMiles ?? "+"}: ${slab.ratePerMile}`,
                          )
                          .join(" | ")}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-1 text-[12px] text-[var(--admin-text-muted)]">
                        <p>
                          Min miles:{" "}
                          {Number(rate.minimumBillableMiles || 0).toFixed(0)}
                        </p>
                        <p>
                          Airport:{" "}
                          {Number(rate.airportPickupFee || 0).toFixed(2)}
                        </p>
                        <p>
                          Meet & greet:{" "}
                          {Number(rate.meetAndGreetFee || 0).toFixed(2)}
                        </p>
                        <p>
                          Waypoint:{" "}
                          {Number(rate.waypointFee || 0).toFixed(2)}
                        </p>
                        <p>
                          Night fee:{" "}
                          {Number(rate.nightSurchargeFee || 0).toFixed(2)}
                        </p>
                        <p>
                          Tax:{" "}
                          {(Number(rate.taxRate || 0) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-[13px] text-[var(--admin-text-muted)]">
                        {rate.nightWindowStart || "21:00"} to{" "}
                        {rate.nightWindowEnd || "04:00"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                          rate.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {rate.active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openEdit(rate)}
                          className="admin-secondary-btn rounded px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-60"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeRate(String(rate._id))}
                          className="admin-danger-btn rounded px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedRates.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]"
                  >
                    No vehicle rates configured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModal
        open={modalOpen}
        title={editingId ? "Edit Vehicle Rate" : "Create Vehicle Rate"}
        onClose={closeModal}
      >
        <form onSubmit={submit} className="space-y-3">
          {modalOpen && error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {modalOpen && notice ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
              Vehicle
            </span>

            <select
              required
              value={form.vehicleId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  vehicleId: event.target.value,
                }))
              }
              className="admin-input w-full rounded-md px-3 py-2"
            >
              <option value="">Select vehicle</option>

              {vehicles.map((vehicle) => (
                <option
                  key={String(vehicle._id)}
                  value={String(vehicle._id)}
                >
                  {vehicle.name} ({vehicle.code})
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
                Minimum Billable Miles
              </span>

              <input
                type="number"
                min={1}
                required
                value={form.minimumBillableMiles}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    minimumBillableMiles: Number(event.target.value || 1),
                  }))
                }
                className="admin-input w-full rounded-md px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
                Tax Rate (Max 0.30)
              </span>

              <input
                type="number"
                min={0}
                max={0.3}
                step="0.01"
                required
                value={form.taxRate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    taxRate: Math.min(
                      0.3,
                      Number(event.target.value || 0),
                    ),
                  }))
                }
                className="admin-input w-full rounded-md px-3 py-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
                Airport Pickup Fee
              </span>

              <input
                type="number"
                min={0}
                step="0.01"
                value={form.airportPickupFee}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    airportPickupFee: Number(event.target.value || 0),
                  }))
                }
                className="admin-input w-full rounded-md px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
                Night Surcharge Fee
              </span>

              <input
                type="number"
                min={0}
                step="0.01"
                value={form.nightSurchargeFee}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    nightSurchargeFee: Number(event.target.value || 0),
                  }))
                }
                className="admin-input w-full rounded-md px-3 py-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
                Night Window Start
              </span>

              <input
                type="time"
                required
                value={form.nightWindowStart}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    nightWindowStart: event.target.value,
                  }))
                }
                className="admin-input w-full rounded-md px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
                Night Window End
              </span>

              <input
                type="time"
                required
                value={form.nightWindowEnd}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    nightWindowEnd: event.target.value,
                  }))
                }
                className="admin-input w-full rounded-md px-3 py-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
                Meet & Greet Fee
              </span>

              <input
                type="number"
                min={0}
                step="0.01"
                value={form.meetAndGreetFee}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    meetAndGreetFee: Number(event.target.value || 0),
                  }))
                }
                className="admin-input w-full rounded-md px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
                Waypoint Fee
              </span>

              <input
                type="number"
                min={0}
                step="0.01"
                value={form.waypointFee}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    waypointFee: Number(event.target.value || 0),
                  }))
                }
                className="admin-input w-full rounded-md px-3 py-2"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
              Slabs JSON
            </span>

            <textarea
              rows={8}
              required
              value={form.slabsText}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  slabsText: event.target.value,
                }))
              }
              className="admin-input w-full rounded-md px-3 py-2 font-mono text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-[var(--admin-text)]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  active: event.target.checked,
                }))
              }
            />
            Active
          </label>

          <button
            type="submit"
            disabled={busy}
            className="admin-primary-btn rounded-md px-4 py-2 font-medium disabled:opacity-60"
          >
            {busy
              ? "Saving..."
              : editingId
                ? "Save Changes"
                : "Create Rate"}
          </button>
        </form>
      </AdminModal>
    </div>
  );
}
