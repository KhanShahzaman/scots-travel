"use client";

import { useMemo, useState } from "react";
import { AdminModal } from "@/components/admin/admin-modal";
import { requestJson } from "@/components/admin/request-json";

const cmsDocuments = [
  {
    id: "home",
    title: "Main Page Content",
    description: "Homepage structure and section content.",
    endpoint: "/api/admin/cms/home",
  },
  {
    id: "global",
    title: "Global Content",
    description: "Site name, nav labels, footer text, and SEO defaults.",
    endpoint: "/api/admin/cms/global",
  },
  {
    id: "booking-form",
    title: "Booking Form Content",
    description: "Reusable quote/booking form labels and result labels.",
    endpoint: "/api/admin/cms/booking-form?key=default_booking_form",
  },
];

export function ContentCrmManager({ initialHome, initialGlobal, initialBookingForm }) {
  const [documents, setDocuments] = useState({
    home: initialHome,
    global: initialGlobal,
    "booking-form": initialBookingForm,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const editingConfig = useMemo(
    () => cmsDocuments.find((item) => item.id === editingDocId) || null,
    [editingDocId],
  );

  function openEditor(docId) {
    const current = documents[docId] || {};
    setEditingDocId(docId);
    setJsonText(JSON.stringify(current, null, 2));
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  async function save(event) {
    event.preventDefault();
    if (!editingConfig) return;

    setBusy(true);
    setNotice("");
    setError("");

    try {
      const parsed = JSON.parse(jsonText);
      const payload = await requestJson(editingConfig.endpoint, {
        method: "PUT",
        body: JSON.stringify(parsed),
      });

      setDocuments((previous) => ({
        ...previous,
        [editingDocId]: payload.content,
      }));
      setModalOpen(false);
      setEditingDocId("");
      setNotice(`${editingConfig.title} updated successfully.`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save content.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="admin-card sticky top-0 z-20 p-4">
        <h1 className="text-3xl font-semibold text-[var(--admin-text)]">Content CRM</h1>
        <p className="admin-muted mt-2 text-base">
          Main page, global content, and booking form are managed separately and saved in MongoDB.
        </p>
      </div>

      {notice ? <p className="text-base text-emerald-700">{notice}</p> : null}
      {error ? <p className="text-base text-red-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cmsDocuments.map((doc) => {
          const content = documents[doc.id] || {};
          const status = content.status || "published";
          const seoTitle = content.seo?.title || content.defaultSeo?.title || "-";

          return (
            <article key={doc.id} className="admin-card p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--admin-text-muted)]">{doc.id}</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--admin-text)]">{doc.title}</h2>
              <p className="admin-muted mt-2 text-base">{doc.description}</p>
              <p className="admin-muted mt-2 text-sm">SEO/Title: {seoTitle}</p>
              <p className={`mt-2 text-xs font-medium ${status === "published" ? "text-emerald-700" : "text-amber-700"}`}>
                {status}
              </p>

              <button
                type="button"
                onClick={() => openEditor(doc.id)}
                className="admin-primary-btn mt-4 rounded-md px-3 py-2 font-medium"
              >
                Edit JSON
              </button>
            </article>
          );
        })}
      </div>

      <AdminModal
        open={modalOpen}
        title={editingConfig ? `Edit ${editingConfig.title}` : "Edit Content"}
        onClose={() => {
          setModalOpen(false);
          setEditingDocId("");
          setError("");
        }}
      >
        <form onSubmit={save} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--admin-text)]">Content JSON</span>
            <textarea
              required
              rows={18}
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              className="admin-input w-full rounded-md px-3 py-2 font-mono text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="admin-primary-btn rounded-md px-4 py-2 font-medium disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save Content"}
          </button>
        </form>
      </AdminModal>
    </div>
  );
}
