"use client";

export function PrintPageActions() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
    >
      Save as PDF
    </button>
  );
}
