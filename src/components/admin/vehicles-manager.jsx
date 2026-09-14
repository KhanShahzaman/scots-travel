"use client";

import Image from "next/image";
import { useState } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { requestJson } from "@/components/admin/request-json";

const initialForm = {
  name: "",
  code: "",
  description: "",
  variants: "",
  order: 0,
  seats: 4,
  luggage: 2,
  imageUrl: "",
  imageAlt: "",
  imagePublicId: "",
  active: true,
};

export function VehiclesManager({ initialVehicles }) {
  const [vehicles, setVehicles] = useState(initialVehicles || []);
  const [busy, setBusy] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);

  async function refreshVehicles() {
    const payload = await requestJson("/api/admin/vehicles");
    setVehicles(payload.vehicles || []);
  }

  function openCreate() {
    setEditingId("");
    setForm(initialForm);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEdit(vehicle) {
    setEditingId(String(vehicle._id));
    setForm({
      name: vehicle.name || "",
      code: vehicle.code || "",
      description: vehicle.description || "",
      variants: vehicle.variants || "",
      order: vehicle.order ?? 0,
      seats: vehicle.seats ?? 4,
      luggage: vehicle.luggage ?? 2,
      imageUrl: vehicle.image?.url || "",
      imageAlt: vehicle.image?.alt || "",
      imagePublicId: vehicle.image?.publicId || "",
      active: Boolean(vehicle.active),
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/uploads/vehicle-image", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Image upload failed.");
      }

      setForm((previous) => ({
        ...previous,
        imageUrl: payload.url,
        imagePublicId: payload.publicId || "",
        imageAlt: previous.imageAlt || previous.name,
      }));
      setNotice("Image uploaded to local server.");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Image upload failed.";
      setError(message);
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
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
        description: form.description.trim(),
        variants: form.variants.trim(),
        order: Number(form.order),
        seats: Number(form.seats),
        luggage: Number(form.luggage),
        active: Boolean(form.active),
        image: {
          url: form.imageUrl.trim(),
          alt: form.imageAlt.trim(),
          publicId: form.imagePublicId.trim(),
        },
      };

      if (editingId) {
        await requestJson(`/api/admin/vehicles/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/api/admin/vehicles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await refreshVehicles();
      setModalOpen(false);
      setEditingId("");
      setForm(initialForm);
      setNotice(editingId ? "Vehicle updated." : "Vehicle created.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save vehicle.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function removeVehicle(id) {
    if (!window.confirm("Delete this vehicle?")) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await requestJson(`/api/admin/vehicles/${id}`, { method: "DELETE" });
      await refreshVehicles();
      setNotice("Vehicle deleted.");
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "Failed to delete vehicle.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--admin-text)]">Vehicles</p>
          <span className="rounded-full bg-[var(--admin-bg-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--admin-text)]">
            {vehicles.length}
          </span>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="admin-primary-btn rounded-md px-3 py-1.5 text-sm font-medium"
        >
          New Vehicle
        </button>
      </div>

      {!modalOpen && notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      {!modalOpen && error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[var(--admin-bg-soft)]">
              <tr className="text-left">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Image</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Vehicle</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Specs</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={String(vehicle._id)} className="border-t border-[var(--admin-border)] align-top">
                  <td className="px-4 py-3">
                    {vehicle.image?.url ? (
                      <Image
                        src={vehicle.image.url}
                        alt={vehicle.image.alt || vehicle.name}
                        width={144}
                        height={80}
                        unoptimized
                        className="h-20 w-36 rounded-md bg-white object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-20 w-36 items-center justify-center rounded-md bg-[var(--admin-bg-soft)] text-[12px] text-[var(--admin-text-muted)]">
                        No image
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-text-muted)]">{vehicle.code}</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--admin-text)]">{vehicle.name}</p>
                    {vehicle.description ? (
                      <p className="mt-1 max-w-[320px] line-clamp-2 text-[13px] text-[var(--admin-text-muted)]">{vehicle.description}</p>
                    ) : null}
                    {vehicle.variants ? (
                      <p className="mt-1 text-[12px] text-[var(--admin-text-muted)]">Variants: {vehicle.variants}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-[12px] text-[var(--admin-text-muted)]">
                      <span className="rounded-full bg-[var(--admin-bg-soft)] px-2.5 py-1">
                        Order {vehicle.order ?? 0}
                      </span>
                      <span className="rounded-full bg-[var(--admin-bg-soft)] px-2.5 py-1">
                        Seats {vehicle.seats}
                      </span>
                      <span className="rounded-full bg-[var(--admin-bg-soft)] px-2.5 py-1">
                        Luggage {vehicle.luggage}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        vehicle.active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {vehicle.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(vehicle)}
                        className="admin-secondary-btn rounded px-2.5 py-1.5 text-[12px] font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeVehicle(String(vehicle._id))}
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
        title={editingId ? "Edit Vehicle" : "Create Vehicle"}
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
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Vehicle Name</span>
            <input
              required
              placeholder="e.g. Premium Sedan"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="admin-input w-full rounded-md px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Vehicle Code</span>
            <input
              required
              placeholder="e.g. premium_sedan"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              className="admin-input w-full rounded-md px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Description</span>
            <textarea
              rows={4}
              placeholder="Short vehicle description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="admin-input w-full rounded-md px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Variants</span>
            <input
              placeholder="e.g. Saloon, Estate"
              value={form.variants}
              onChange={(event) => setForm((prev) => ({ ...prev, variants: event.target.value }))}
              className="admin-input w-full rounded-md px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
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
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Seats</span>
              <input
                type="number"
                min={1}
                placeholder="4"
                value={form.seats}
                onChange={(event) => setForm((prev) => ({ ...prev, seats: Number(event.target.value || 1) }))}
                className="admin-input w-full rounded-md px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Luggage</span>
              <input
                type="number"
                min={0}
                placeholder="2"
                value={form.luggage}
                onChange={(event) => setForm((prev) => ({ ...prev, luggage: Number(event.target.value || 0) }))}
                className="admin-input w-full rounded-md px-3 py-2"
              />
            </label>
          </div>

          <div className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg-soft)] p-3">
            <label className="mb-2 block text-base font-medium text-[var(--admin-text)]">Upload Image (Local Server)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleImageUpload}
              disabled={busy || imageUploading}
              className="w-full text-base text-[var(--admin-text)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--admin-primary-end)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            {imageUploading ? <p className="mt-2 text-sm text-blue-700">Uploading image...</p> : null}
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Image URL</span>
            <input
              required
              type="text"
              placeholder="/uploads/vehicles/..."
              value={form.imageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
              className="admin-input w-full rounded-md px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Image Alt Text</span>
            <input
              placeholder="e.g. Premium Sedan"
              value={form.imageAlt}
              onChange={(event) => setForm((prev) => ({ ...prev, imageAlt: event.target.value }))}
              className="admin-input w-full rounded-md px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Image Public ID</span>
            <input
              placeholder="auto-filled on upload"
              value={form.imagePublicId}
              onChange={(event) => setForm((prev) => ({ ...prev, imagePublicId: event.target.value }))}
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
            disabled={busy || imageUploading}
            className="admin-primary-btn rounded-md px-4 py-2 font-medium disabled:opacity-60"
          >
            {editingId ? "Save Changes" : "Create Vehicle"}
          </button>
        </form>
      </AdminModal>
    </div>
  );
}
