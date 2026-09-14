"use client";

export function AdminModal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="admin-surface max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-4">
          <h3 className="text-xl font-semibold text-[var(--admin-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="admin-secondary-btn rounded px-3 py-1.5 text-sm font-medium"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
