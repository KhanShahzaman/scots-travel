import Image from "next/image";
import { QuoteBuilder } from "@/components/quote-builder";
import {
  defaultBookingFormContent,
  defaultGlobalContent,
  defaultHomeContent,
  getCmsBookingFormContent,
  getCmsGlobalContent,
  getCmsHomeContent,
} from "@/lib/cms-content";
import { connectToDatabase } from "@/lib/db";
import { Vehicle } from "@/models/Vehicle";

const overviewSections = [
  {
    title: "Why Choose Our Airport Transfers UK Service?",
    lines: [
      "Fixed price airport transfers with no hidden fees",
      "24/7 availability across the UK",
      "Real-time flight monitoring for delays or early arrivals",
      "Fully licensed and experienced professional drivers",
      "Meet and greet service when requested",
      "Comfortable executive and family-friendly vehicles",
      "Private transfers only, no shared rides",
    ],
  },
  {
    title: "Frequently Asked Questions - Airport Transfers UK",
    lines: [
      "What is included in your UK airport transfer service?",
      "Our service includes door-to-door transportation, flight tracking, fixed pricing, professional drivers, luggage assistance, and private rides.",
      "Which airports do you cover in the UK?",
      "We provide transfers to and from all major UK airports including Heathrow, Gatwick, Stansted, Luton, London City, Birmingham, Manchester, Bristol, and regional airports nationwide.",
      "Are your airport transfers private or shared?",
      "All transfers are private. Your vehicle is reserved exclusively for you and your group.",
      "Do you monitor flight delays?",
      "Yes. We monitor flight status in real time and automatically adjust pickup times for delays or early arrivals.",
    ],
  },
  {
    title: "UK Airport Transfers to All Major Airports",
    lines: [
      "Heathrow Airport Transfers",
      "Gatwick Airport Transfers",
      "Stansted Airport Transfers",
      "Luton Airport Transfers",
      "London City Airport Transfers",
      "Birmingham Airport Transfers",
      "Bristol Airport Transfers",
      "All major UK airports",
    ],
  },
  {
    title: "Airport Transfers UK",
    lines: [
      "Our private airport transfers are ideal for individuals, families, business travellers, and groups.",
      "Enjoy exclusive use of your vehicle, ample luggage space, and a direct journey with no unnecessary stops.",
      "We provide airport pickups, corporate airport travel, family-friendly transfer options, group airport transfers, and long-distance routes across the UK.",
    ],
  },
  {
    title: "Airport Pickup & Drop-Off Services UK",
    lines: [
      "Airport Pickup",
      "Your driver will meet you in the arrivals hall, assist with your luggage, and escort you to your vehicle. Flight tracking ensures accurate pickup timing even if your flight is delayed.",
      "Airport Drop-Off",
      "For departures, we collect you from your home, hotel, or business address and ensure you reach the airport with plenty of time before your flight.",
    ],
  },
  {
    title: "Affordable Airport Transfers UK - Fixed Prices",
    lines: [
      "We believe in transparent, competitive pricing. Our fixed-fare structure means no hidden costs and no surprise charges.",
      "Our goal is to provide one of the most affordable airport transfer services in the UK without compromising quality or reliability.",
    ],
  },
  {
    title: "Airport Transfers for Business & Corporate Clients",
    lines: [
      "We provide dependable corporate airport transfers for professionals who value punctuality, discretion, and comfort.",
      "Our executive vehicles are ideal for airport runs, business meetings, conferences, and long-distance travel throughout the UK.",
    ],
  },
  {
    title: "Ready to Book Your UK Airport Transfer?",
    lines: [
      "Avoid long queues, unpredictable surge pricing, and last-minute stress.",
      "Get Your Instant Quote Today",
      "Use our online booking system to view fixed prices for your journey, enter your travel details, select your preferred vehicle, and confirm your booking in minutes.",
    ],
  },
  {
    title: "Contact Us",
    lines: [
      "Our support team is available 24/7 to assist with bookings and enquiries.",
      "Phone: +44 0000 000000",
      "Email: support@scottravels.co.uk",
      "Experience professional airport transfers you can trust.",
    ],
  },
];

const featureRows = [
  "Free Flight Monitoring",
  "Free One Hour Waiting",
  "24/7 Service Available",
  "Discounted Price on Return",
];

async function loadVehicles() {
  try {
    await connectToDatabase();
    return await Vehicle.find({ active: true }).sort({ order: 1, name: 1 }).limit(4).lean().exec();
  } catch (error) {
    console.error("HOME_VEHICLES_LOAD_ERROR", error);
    return [];
  }
}

function VehicleCard({ vehicle }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded bg-white/6">
        {vehicle?.image?.url ? (
          <Image
            src={vehicle.image.url}
            alt={vehicle.image.alt || vehicle.name}
            width={52}
            height={30}
            className="h-auto w-11 object-contain"
            unoptimized
          />
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Car</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{vehicle?.name || "Airport Car"}</p>
        <p className="mt-0.5 text-[11px] leading-5 text-slate-300">
          {vehicle?.seats || 4} seats • {vehicle?.luggage || 2} luggage
        </p>
      </div>
    </div>
  );
}

function TextPanel({ title, lines }) {
  return (
    <section className="border border-[#bcc5cd] bg-[#f7f7f7] shadow-[0_1px_4px_rgba(0,0,0,0.18)]">
      <div className="border-b border-[#bcc5cd] bg-[#f3f3f3] px-3 py-2">
        <h2 className="text-[13px] font-semibold text-black">{title}</h2>
      </div>
      <div className="space-y-2 px-3 py-3 text-[11px] leading-[1.58] text-black">
        {lines.map((line, index) => (
          <p key={`${title}-${index}`}>{line}</p>
        ))}
      </div>
    </section>
  );
}

export async function generateMetadata() {
  let home = defaultHomeContent;
  let globalContent = defaultGlobalContent;

  try {
    [home, globalContent] = await Promise.all([getCmsHomeContent(), getCmsGlobalContent()]);
  } catch (error) {
    console.error("HOME_METADATA_LOAD_ERROR", error);
  }

  const title = home.seo?.title || globalContent.defaultSeo?.title || globalContent.siteName;
  const description = home.seo?.description || globalContent.defaultSeo?.description || "Airport transfers";
  const canonicalUrl = home.seo?.canonicalUrl || globalContent.defaultSeo?.canonicalUrl || "";
  const ogImage = home.seo?.ogImage || globalContent.defaultSeo?.ogImage || "";

  return {
    title,
    description,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function HomePage() {
  let bookingFormContent = defaultBookingFormContent;

  try {
    [, bookingFormContent] = await Promise.all([getCmsHomeContent(), getCmsBookingFormContent("default_booking_form")]);
  } catch (error) {
    console.error("HOME_PAGE_CONTENT_LOAD_ERROR", error);
  }

  const vehicles = await loadVehicles();

  return (
    <div className="-mx-4 home-page-bg min-h-screen">
      <div className="mx-auto max-w-[1120px] px-4 pb-14 pt-[86px]">
        <div className="mx-auto max-w-[980px]">
          <div className="grid gap-4 lg:grid-cols-[1.06fr_0.94fr]">
            <QuoteBuilder content={bookingFormContent} variant="hero" />

            <div className="space-y-4">
              <section className="rounded-[6px] border border-white/10 bg-[rgba(44,57,67,0.72)] p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-[2px]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/90">Airport Cars</p>
                <div className="mt-4 space-y-3">
                  {(vehicles.length > 0 ? vehicles : [{ name: "Saloon", seats: 4, luggage: 2 }, { name: "Estate", seats: 4, luggage: 3 }, { name: "Executive Car", seats: 4, luggage: 2 }, { name: "MPV", seats: 7, luggage: 5 }]).map((vehicle, index) => (
                    <VehicleCard key={`${vehicle.name}-${index}`} vehicle={vehicle} />
                  ))}
                </div>
              </section>

              <section className="rounded-[6px] border border-white/10 bg-[rgba(35,47,57,0.72)] p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-[2px]">
                <div className="grid gap-3 sm:grid-cols-2">
                  {featureRows.map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-[4px] bg-[#1b2732]/88 px-3 py-2 text-[11px] text-white">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]">+</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="mt-8">
            <div className="px-2 text-center text-[12px] tracking-[0.08em] text-white">
              Airport Transfers UK - Reliable, Affordable &amp; Professional Service
            </div>

            <div className="mt-3 space-y-4">
              {overviewSections.map((section) => (
                <TextPanel key={section.title} title={section.title} lines={section.lines} />
              ))}
            </div>
          </div>

          <section className="mt-8 bg-[rgba(0,0,0,0.38)] px-4 py-6 text-white">
            <div className="grid gap-5 lg:grid-cols-[170px_1fr_170px] lg:items-end">
              <div className="flex h-[120px] items-center justify-center rounded bg-black/36 text-center text-sm font-semibold leading-5">
                Good
                <br />
                Business
                <br />
                Charter
                <br />
                Accredited
              </div>

              <div className="space-y-4 text-[10px] leading-5 text-slate-200">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    Popular airport transfers: Heathrow, Gatwick, Stansted, Luton, London City, Manchester, Birmingham, Bristol, Edinburgh and Glasgow.
                  </div>
                  <div>
                    Popular cruise and ferry port transfers include Southampton, Dover, Harwich, Hull and Portsmouth with executive and family vehicle options.
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-white/90">
                  <span>About Us</span>
                  <span>Privacy Policy</span>
                  <span>Terms</span>
                  <span>Contact</span>
                </div>
                <div className="text-white/80">Copyright Scot Travels. All rights reserved.</div>
              </div>

              <div className="flex h-[120px] items-center justify-center rounded bg-black/36 text-center text-sm font-semibold leading-5">
                Licensed
                <br />
                Private Hire
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
