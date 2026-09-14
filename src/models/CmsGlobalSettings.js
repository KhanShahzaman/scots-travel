import { Schema, model, models } from "mongoose";

const navLabelsSchema = new Schema(
  {
    quote: { type: String, default: "Quote", trim: true, maxlength: 50 },
    dashboard: { type: String, default: "Dashboard", trim: true, maxlength: 50 },
    admin: { type: String, default: "Admin", trim: true, maxlength: 50 },
    login: { type: String, default: "Login", trim: true, maxlength: 50 },
    signup: { type: String, default: "Sign Up", trim: true, maxlength: 50 },
    logout: { type: String, default: "Sign Out", trim: true, maxlength: 50 },
  },
  { _id: false },
);

const seoDefaultsSchema = new Schema(
  {
    title: { type: String, default: "Scot Travels", trim: true, maxlength: 120 },
    description: { type: String, default: "Airport transfer service", trim: true, maxlength: 300 },
    canonicalUrl: { type: String, default: "", trim: true, maxlength: 500 },
    ogImage: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { _id: false },
);

const cmsGlobalSettingsSchema = new Schema(
  {
    key: { type: String, required: true, default: "global", trim: true, lowercase: true },
    siteName: { type: String, required: true, default: "Scot Travels", trim: true, maxlength: 120 },
    supportEmail: { type: String, required: true, default: "support@scottravels.co.uk", trim: true, maxlength: 180 },
    supportPhone: { type: String, default: "+44 0000 000000", trim: true, maxlength: 60 },
    footerText: {
      type: String,
      default: "Copyright Scot Travels. All Rights Reserved.",
      trim: true,
      maxlength: 240,
    },
    navLabels: { type: navLabelsSchema, required: true, default: {} },
    defaultSeo: { type: seoDefaultsSchema, required: true, default: {} },
    updatedBy: { type: String, default: "system", trim: true, maxlength: 180 },
  },
  { timestamps: true },
);

cmsGlobalSettingsSchema.index({ key: 1 }, { unique: true });

export const CmsGlobalSettings =
  models.CmsGlobalSettings || model("CmsGlobalSettings", cmsGlobalSettingsSchema);
