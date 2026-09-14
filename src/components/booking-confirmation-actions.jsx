"use client";

export function BookingConfirmationActions({ refs = [], tripGroupId = "" }) {
  function handleDownload() {
    const params = new URLSearchParams();
    if (refs.length > 0) {
      params.set("refs", refs.join(","));
    }
    if (tripGroupId) {
      params.set("group", tripGroupId);
    }

    const url = `/quote/success/print?${params.toString()}`;
    const nextWindow = window.open(url, "_blank", "noopener,noreferrer");

    if (!nextWindow) {
      window.location.href = url;
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="rounded-md bg-[rgba(255,255,255,0.08)] px-5 py-2.5 text-sm font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.14)]"
    >
      Download PDF
    </button>
  );
}
