import { QuoteBuilder } from "@/components/quote-builder";
import { defaultBookingFormContent, getCmsBookingFormContent } from "@/lib/cms-content";

export default async function QuotePage({ searchParams }) {
  let bookingFormContent = defaultBookingFormContent;
  const params = await searchParams;
  const prefill = params?.prefill === "1";

  try {
    bookingFormContent = await getCmsBookingFormContent("default_booking_form");
  } catch (error) {
    console.error("QUOTE_PAGE_CONTENT_LOAD_ERROR", error);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-white">{bookingFormContent.title}</h1>
        <p className="text-base text-slate-300">{bookingFormContent.subtitle}</p>
      </div>
      <QuoteBuilder content={bookingFormContent} variant="dark" prefill={prefill} />
    </div>
  );
}
