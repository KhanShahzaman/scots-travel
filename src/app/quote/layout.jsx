import { BookingFlowProvider } from "@/components/booking-flow-provider";

export default function QuoteLayout({ children }) {
  return <BookingFlowProvider>{children}</BookingFlowProvider>;
}
