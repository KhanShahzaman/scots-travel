import { connectToDatabase } from "@/lib/db";
import { CmsBookingFormContent } from "@/models/CmsBookingFormContent";
import { CmsGlobalSettings } from "@/models/CmsGlobalSettings";
import { CmsHomePage } from "@/models/CmsHomePage";

const HOME_SLUG = "home";
const GLOBAL_KEY = "global";
const DEFAULT_BOOKING_FORM_KEY = "default_booking_form";

export const defaultHomeContent = {
  status: "published",
  seo: {
    title: "Airport Transfers | Scot Travels",
    description: "Reliable airport transfer service with instant quote and fixed pricing.",
    canonicalUrl: "",
    ogImage: "",
  },
  hero: {
    eyebrow: "Scot Travels",
    heading: "Airport Transfers Across Scotland",
    description:
      "Private, business and family transfers with transparent pricing and professional chauffeurs.",
    primaryCtaLabel: "Book Now",
    primaryCtaHref: "/quote",
    secondaryCtaLabel: "Get Instant Quote",
    secondaryCtaHref: "/quote",
  },
  quoteSection: {
    title: "Instant Quote",
    subtitle: "Get a quick estimate for your transfer in seconds.",
  },
  fleetSection: {
    title: "Airport Cars",
    subtitle: "Premium vehicles available for solo, business and group travel.",
    cards: [
      {
        title: "Premium Sedan",
        description: "Comfortable and stylish airport transfer for up to 3 passengers.",
        order: 1,
      },
      {
        title: "Business Sedan",
        description: "Executive class vehicle for professional and corporate travel.",
        order: 2,
      },
      {
        title: "MPV",
        description: "Spacious option for families and group airport transfers.",
        order: 3,
      },
    ],
  },
  infoSection: {
    title: "Airport Transfer Services",
    paragraphs: [
      "Scot Travels offers airport pickup and drop-off services with fixed and transparent pricing.",
      "Our drivers track flights and adjust pickup timing to reduce waiting stress for passengers.",
    ],
    bulletTitle: "Why choose Scot Travels",
    bullets: [
      "24/7 booking support",
      "Professional licensed drivers",
      "Comfortable and clean vehicles",
      "Fixed and transparent fares",
    ],
  },
  faqSection: {
    title: "Frequently Asked Questions",
    items: [
      {
        question: "Can I pre-book my airport transfer?",
        answer: "Yes, you can pre-book online and receive instant quote confirmation.",
        order: 1,
      },
      {
        question: "Do you include meet and greet service?",
        answer: "Meet and greet can be added during quote creation before checkout.",
        order: 2,
      },
      {
        question: "What happens if my flight is delayed?",
        answer: "We monitor flight timings and adjust pickup scheduling when possible.",
        order: 3,
      },
    ],
  },
  contactSection: {
    title: "Need help with your booking?",
    description: "Contact our support team for custom transfers and urgent travel requests.",
    primaryCtaLabel: "Call Support",
    primaryCtaHref: "tel:+440000000000",
    secondaryCtaLabel: "Email Support",
    secondaryCtaHref: "mailto:support@scottravels.co.uk",
  },
};

export const defaultGlobalContent = {
  siteName: "Scot Travels",
  supportEmail: "support@scottravels.co.uk",
  supportPhone: "+44 0000 000000",
  navLinks: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/#services" },
    { label: "Our Fleet", href: "/#fleet" },
    { label: "Locations", href: "/#locations" },
    { label: "Contact", href: "/#contact" },
  ],
  footerText: "Copyright Scot Travels. All Rights Reserved.",
  navLabels: {
    quote: "Book Now",
    dashboard: "Dashboard",
    admin: "Admin",
    login: "Login",
    signup: "Sign Up",
    logout: "Sign Out",
  },
  defaultSeo: {
    title: "Scot Travels",
    description: "Luxury airport transfers with transparent pricing.",
    canonicalUrl: "",
    ogImage: "",
  },
};

export const defaultBookingFormContent = {
  status: "published",
  title: "Get Instant Quote",
  subtitle: "Enter route details and compare rates by available vehicles.",
  submitLabel: "Get Rates",
  helperText: "Guests can quote freely. Login/signup is required at checkout.",
  resultTitle: "Available Vehicles",
  resultEmptyText: "Run a quote to view available vehicle options.",
  expiresPrefix: "Quote expires",
  continueLabel: "Continue to Checkout",
  fields: {
    pickupLabel: "Pickup",
    pickupPlaceholder: "Heathrow Airport",
    dropoffLabel: "Drop-off",
    dropoffPlaceholder: "Central London",
    waypointsLabel: "Waypoints",
    meetAndGreetLabel: "Include meet and greet",
    nightRideLabel: "Night ride surcharge",
  },
  breakdownLabels: {
    billableMiles: "Billable miles",
    perMile: "Per mile",
    distanceCharge: "Distance charge",
    airportPickupFee: "Airport pickup fee",
    meetAndGreetFee: "Meet and greet fee",
    waypointFee: "Waypoint fee",
    surchargeTotal: "Surcharges",
    taxAmount: "Tax",
    total: "Total",
  },
  vehicleOptions: [
    { value: "executive", label: "Executive Saloon", order: 1 },
    { value: "luxury", label: "Luxury Class", order: 2 },
    { value: "mpv", label: "MPV 6-8 Seater", order: 3 },
  ],
};

function plain(document) {
  const source = document?.toObject ? document.toObject() : document;
  if (!source) return null;
  const output = { ...source };
  delete output._id;
  delete output.__v;
  delete output.createdAt;
  delete output.updatedAt;
  return output;
}

export async function getCmsHomeContent() {
  await connectToDatabase();

  let doc = await CmsHomePage.findOne({ slug: HOME_SLUG }).exec();
  if (!doc) {
    doc = await CmsHomePage.create({ slug: HOME_SLUG, ...defaultHomeContent });
  }

  return plain(doc) || { ...defaultHomeContent };
}

export async function getCmsGlobalContent() {
  await connectToDatabase();

  let doc = await CmsGlobalSettings.findOne({ key: GLOBAL_KEY }).exec();
  if (!doc) {
    doc = await CmsGlobalSettings.create({ key: GLOBAL_KEY, ...defaultGlobalContent });
  }

  return plain(doc) || { ...defaultGlobalContent };
}

export async function getCmsBookingFormContent(key = DEFAULT_BOOKING_FORM_KEY) {
  await connectToDatabase();

  let doc = await CmsBookingFormContent.findOne({ key }).exec();
  if (!doc) {
    doc = await CmsBookingFormContent.create({ key, ...defaultBookingFormContent });
  }

  const content = plain(doc) || { ...defaultBookingFormContent };
  content.vehicleOptions = (content.vehicleOptions || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  return content;
}

export async function saveCmsHomeContent(content, updatedBy) {
  await connectToDatabase();
  const doc = await CmsHomePage.findOneAndUpdate(
    { slug: HOME_SLUG },
    {
      slug: HOME_SLUG,
      ...content,
      updatedBy: updatedBy || "admin",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  ).exec();

  return plain(doc);
}

export async function saveCmsGlobalContent(content, updatedBy) {
  await connectToDatabase();
  const doc = await CmsGlobalSettings.findOneAndUpdate(
    { key: GLOBAL_KEY },
    {
      key: GLOBAL_KEY,
      ...content,
      updatedBy: updatedBy || "admin",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  ).exec();

  return plain(doc);
}

export async function saveCmsBookingFormContent(content, updatedBy, key = DEFAULT_BOOKING_FORM_KEY) {
  await connectToDatabase();
  const doc = await CmsBookingFormContent.findOneAndUpdate(
    { key },
    {
      key,
      ...content,
      updatedBy: updatedBy || "admin",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  ).exec();

  const saved = plain(doc);
  saved.vehicleOptions = (saved.vehicleOptions || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  return saved;
}
