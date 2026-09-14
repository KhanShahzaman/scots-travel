export const metadata = {
  title: "Terms & Conditions | Scot Travels",
  description: "Terms and conditions for Scot Travels bookings and services.",
};

const sections = [
  {
    title: "Bookings",
    body:
      "All bookings are subject to availability and are confirmed once payment has been successfully received and a reservation number has been issued.",
  },
  {
    title: "Pricing",
    body:
      "Quotes are based on the selected route, vehicle, distance, configured extras, and applicable tax. Final pricing is shown before payment.",
  },
  {
    title: "Changes and cancellations",
    body:
      "Booking changes and cancellation handling can vary depending on notice period and journey status. Please contact support if any reservation needs to be changed.",
  },
  {
    title: "Passenger responsibility",
    body:
      "Passengers are responsible for providing accurate pickup, drop-off, flight, and contact details so the assigned journey can be managed correctly.",
  },
  {
    title: "Support",
    body:
      "If you need help with an active booking, contact Scot Travels support using the contact details shown on the website.",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-white">
      <section className="rounded-3xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(24,39,58,0.9))] p-6 shadow-[0_24px_60px_rgba(2,9,18,0.34),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">Scot Travels</p>
        <h1 className="mt-3 text-3xl font-semibold">Terms & Conditions</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
          This page gives a simple overview of the booking terms used on the website. If you want a more detailed legal
          version later, we can replace this page with your final approved content without changing the route.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl bg-[linear-gradient(180deg,rgba(29,46,66,0.94),rgba(24,39,58,0.9))] p-5 shadow-[0_18px_44px_rgba(2,9,18,0.26),inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-200">{section.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
