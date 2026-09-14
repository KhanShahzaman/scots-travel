"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { requestJson } from "@/components/admin/request-json";

const initialForm = {
  name: "",
  code: "",
  order: 0,
  active: true,
};

export function StatesManager({ initialStates }) {
  const [states, setStates] = useState(initialStates || []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);

  async function refreshStates() {
    const [statesPayload, ratesPayload] = await Promise.all([
      requestJson("/api/admin/states"),
      requestJson("/api/admin/state-vehicle-rates"),
    ]);

    const rateCountLookup = (ratesPayload.rates || []).reduce((accumulator, rate) => {
      const stateId = String(rate.stateId?._id || rate.stateId || "");
      if (!stateId) return accumulator;
      accumulator[stateId] = (accumulator[stateId] || 0) + 1;
      return accumulator;
    }, {});

    setStates(
      (statesPayload.states || []).map((state) => ({
        ...state,
        linkedVehicleRatesCount: rateCountLookup[String(state._id)] || 0,
      })),
    );
  }

  function openCreate() {
    setEditingId("");
    setForm(initialForm);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEdit(state) {
    setEditingId(String(state._id));
    setForm({
      name: state.name || "",
      code: state.code || "",
      order: state.order || 0,
      active: Boolean(state.active),
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
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        order: Number(form.order),
        active: Boolean(form.active),
      };

      if (editingId) {
        await requestJson(`/api/admin/states/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/api/admin/states", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await refreshStates();
      setModalOpen(false);
      setEditingId("");
      setForm(initialForm);
      setNotice(editingId ? "State updated." : "State created.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save state.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function removeState(id) {
    if (!window.confirm("Delete this state?")) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await requestJson(`/api/admin/states/${id}`, { method: "DELETE" });
      await refreshStates();
      setNotice("State deleted.");
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "Failed to delete state.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--admin-text)]">States</p>
          <span className="rounded-full bg-[var(--admin-bg-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--admin-text)]">
            {states.length}
          </span>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="admin-primary-btn rounded-md px-3 py-1.5 text-sm font-medium"
        >
          New State
        </button>
      </div>

      {!modalOpen && notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      {!modalOpen && error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <thead className="bg-[var(--admin-bg-soft)]">
              <tr className="text-left">
                <th className="w-[14%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Code</th>
                <th className="w-[26%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">State</th>
                <th className="w-[12%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Order</th>
                <th className="w-[16%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Linked Rates</th>
                <th className="w-[12%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Status</th>
                <th className="w-[20%] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {states.map((state) => (
                <tr key={String(state._id)} className="border-t border-[var(--admin-border)] align-top">
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--admin-text)]">{state.code}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--admin-text)]">{state.name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--admin-text-muted)]">{state.order}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--admin-bg-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--admin-text-muted)]">
                      {Number(state.linkedVehicleRatesCount || 0)} vehicles
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        state.active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {state.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(state)}
                        className="admin-secondary-btn rounded px-2.5 py-1.5 text-[12px] font-medium"
                      >
                        Edit
                      </button>
                      <Link
                        href={`/admin/rates/${state._id}`}
                        className="admin-primary-btn rounded px-2.5 py-1.5 text-[12px] font-medium"
                      >
                        View Rates
                      </Link>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeState(String(state._id))}
                        className="admin-danger-btn rounded px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModal
        open={modalOpen}
        title={editingId ? "Edit State" : "Create State"}
        onClose={() => {
          setModalOpen(false);
          setEditingId("");
          setForm(initialForm);
          setError("");
          setNotice("");
        }}
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
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">State Name</span>
            <input
              required
              placeholder="e.g. Scotland"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="admin-input w-full rounded-md px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">State Code</span>
            <input
              required
              placeholder="e.g. SCT"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              className="admin-input w-full rounded-md px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Display Order</span>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={form.order}
              onChange={(event) => setForm((prev) => ({ ...prev, order: Number(event.target.value || 0) }))}
              className="admin-input w-full rounded-md px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-[var(--admin-text)]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            />
            Active
          </label>

          <button
            type="submit"
            disabled={busy}
            className="admin-primary-btn rounded-md px-4 py-2 font-medium disabled:opacity-60"
          >
            {editingId ? "Save Changes" : "Create State"}
          </button>
        </form>
      </AdminModal>
    </div>
  );
}
