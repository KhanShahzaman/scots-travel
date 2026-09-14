import { Schema, model, models } from "mongoose";

const homeSeoSchema = new Schema(
  {
    title: { type: String, default: "Scot Travels", trim: true, maxlength: 120 },
    description: { type: String, default: "Luxury airport transfers", trim: true, maxlength: 300 },
    canonicalUrl: { type: String, default: "", trim: true, maxlength: 500 },
    ogImage: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { _id: false },
);

const homeHeroSchema = new Schema(
  {
    eyebrow: { type: String, default: "Scot Travels", trim: true, maxlength: 80 },
    heading: { type: String, default: "Book Your Airport Transfer", trim: true, maxlength: 160 },
    description: { type: String, default: "Private transfers with fixed transparent pricing.", trim: true, maxlength: 500 },
    primaryCtaLabel: { type: String, default: "Book now", trim: true, maxlength: 80 },
    primaryCtaHref: { type: String, default: "/quote", trim: true, maxlength: 300 },
    secondaryCtaLabel: { type: String, default: "Get a quote", trim: true, maxlength: 80 },
    secondaryCtaHref: { type: String, default: "/quote", trim: true, maxlength: 300 },
  },
  { _id: false },
);

const titledSectionSchema = new Schema(
  {
    title: { type: String, default: "", trim: true, maxlength: 160 },
    subtitle: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { _id: false },
);

const fleetCardSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 400 },
    order: { type: Number, default: 0, min: 0, max: 9999 },
  },
  { _id: false },
);

const faqItemSchema = new Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 220 },
    answer: { type: String, required: true, trim: true, maxlength: 800 },
    order: { type: Number, default: 0, min: 0, max: 9999 },
  },
  { _id: false },
);

const homePageSchema = new Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true, default: "home" },
    status: { type: String, enum: ["draft", "published"], default: "published", required: true },
    seo: { type: homeSeoSchema, required: true, default: {} },
    hero: { type: homeHeroSchema, required: true, default: {} },
    quoteSection: { type: titledSectionSchema, required: true, default: { title: "Instant Quote" } },
    fleetSection: {
      type: new Schema(
        {
          title: { type: String, default: "Airport Cars", trim: true, maxlength: 160 },
          subtitle: { type: String, default: "Choose from our premium fleet.", trim: true, maxlength: 500 },
          cards: { type: [fleetCardSchema], default: [] },
        },
        { _id: false },
      ),
      required: true,
      default: {},
    },
    infoSection: {
      type: new Schema(
        {
          title: { type: String, default: "Airport Transfer Services", trim: true, maxlength: 160 },
          paragraphs: { type: [String], default: [] },
          bulletTitle: { type: String, default: "Why choose us", trim: true, maxlength: 160 },
          bullets: { type: [String], default: [] },
        },
        { _id: false },
      ),
      required: true,
      default: {},
    },
    faqSection: {
      type: new Schema(
        {
          title: { type: String, default: "Frequently Asked Questions", trim: true, maxlength: 160 },
          items: { type: [faqItemSchema], default: [] },
        },
        { _id: false },
      ),
      required: true,
      default: {},
    },
    contactSection: {
      type: new Schema(
        {
          title: { type: String, default: "Need help with your booking?", trim: true, maxlength: 160 },
          description: { type: String, default: "Our team is available 24/7.", trim: true, maxlength: 500 },
          primaryCtaLabel: { type: String, default: "Call Us", trim: true, maxlength: 80 },
          primaryCtaHref: { type: String, default: "tel:+440000000000", trim: true, maxlength: 300 },
          secondaryCtaLabel: { type: String, default: "Email Us", trim: true, maxlength: 80 },
          secondaryCtaHref: { type: String, default: "mailto:info@example.com", trim: true, maxlength: 300 },
        },
        { _id: false },
      ),
      required: true,
      default: {},
    },
    updatedBy: { type: String, default: "system", trim: true, maxlength: 180 },
  },
  { timestamps: true },
);

homePageSchema.index({ slug: 1 }, { unique: true });
homePageSchema.index({ status: 1, updatedAt: -1 });

export const CmsHomePage = models.CmsHomePage || model("CmsHomePage", homePageSchema);
