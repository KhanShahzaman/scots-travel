import { z } from "zod";

const requiredText = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.string().trim().max(max).default("");
const urlLike = z.string().trim().max(500).default("");

export const cmsHomeSchema = z.object({
  status: z.enum(["draft", "published"]).default("draft"),
  seo: z.object({
    title: requiredText(120),
    description: requiredText(300),
    canonicalUrl: urlLike,
    ogImage: urlLike,
  }),
  hero: z.object({
    eyebrow: optionalText(80),
    heading: requiredText(160),
    description: requiredText(500),
    primaryCtaLabel: requiredText(80),
    primaryCtaHref: requiredText(300),
    secondaryCtaLabel: requiredText(80),
    secondaryCtaHref: requiredText(300),
  }),
  quoteSection: z.object({
    title: requiredText(160),
    subtitle: optionalText(500),
  }),
  fleetSection: z.object({
    title: requiredText(160),
    subtitle: optionalText(500),
    cards: z
      .array(
        z.object({
          title: requiredText(120),
          description: requiredText(400),
          order: z.number().int().min(0).max(9999).default(0),
        }),
      )
      .min(1),
  }),
  infoSection: z.object({
    title: requiredText(160),
    paragraphs: z.array(requiredText(500)).min(1),
    bulletTitle: requiredText(160),
    bullets: z.array(requiredText(260)).min(1),
  }),
  faqSection: z.object({
    title: requiredText(160),
    items: z
      .array(
        z.object({
          question: requiredText(220),
          answer: requiredText(800),
          order: z.number().int().min(0).max(9999).default(0),
        }),
      )
      .min(1),
  }),
  contactSection: z.object({
    title: requiredText(160),
    description: requiredText(500),
    primaryCtaLabel: requiredText(80),
    primaryCtaHref: requiredText(300),
    secondaryCtaLabel: requiredText(80),
    secondaryCtaHref: requiredText(300),
  }),
});

export const cmsGlobalSchema = z.object({
  siteName: requiredText(120),
  supportEmail: z.string().trim().email().max(180),
  supportPhone: optionalText(60),
  footerText: requiredText(240),
  navLabels: z.object({
    quote: requiredText(50),
    dashboard: requiredText(50),
    admin: requiredText(50),
    login: requiredText(50),
    signup: requiredText(50),
    logout: requiredText(50),
  }),
  defaultSeo: z.object({
    title: requiredText(120),
    description: requiredText(300),
    canonicalUrl: urlLike,
    ogImage: urlLike,
  }),
});

export const cmsBookingFormSchema = z.object({
  status: z.enum(["draft", "published"]).default("draft"),
  title: requiredText(120),
  subtitle: optionalText(300),
  submitLabel: requiredText(80),
  helperText: requiredText(240),
  resultTitle: requiredText(120),
  resultEmptyText: requiredText(220),
  expiresPrefix: requiredText(120),
  continueLabel: requiredText(120),
  fields: z.object({
    pickupLabel: requiredText(100),
    pickupPlaceholder: requiredText(160),
    dropoffLabel: requiredText(100),
    dropoffPlaceholder: requiredText(160),
    milesLabel: requiredText(100),
    milesPlaceholder: requiredText(60),
    vehicleLabel: requiredText(100),
    waypointsLabel: requiredText(100),
    meetAndGreetLabel: requiredText(120),
    nightRideLabel: requiredText(120),
  }),
  breakdownLabels: z.object({
    billableMiles: requiredText(120),
    perMile: requiredText(120),
    distanceCharge: requiredText(120),
    airportPickupFee: requiredText(120),
    meetAndGreetFee: requiredText(120),
    waypointFee: requiredText(120),
    surchargeTotal: requiredText(120),
    taxAmount: requiredText(120),
    total: requiredText(120),
  }),
  vehicleOptions: z
    .array(
      z.object({
        value: requiredText(80),
        label: requiredText(120),
        order: z.number().int().min(0).max(9999).default(0),
      }),
    )
    .min(1),
});
