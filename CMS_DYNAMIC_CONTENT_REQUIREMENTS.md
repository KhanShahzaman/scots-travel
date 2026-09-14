# Scot Travels - Dynamic Content from Admin (Requirements Draft)

## 1) Objective
Move all page content from hardcoded JSX into admin-managed content so non-developers can update copy, sections, CTAs, SEO, and selected configuration without code deployments.

## 2) Scope
In scope:
- Public pages: `/`, `/quote`, `/checkout`, `/login`, `/signup`
- Authenticated pages: `/dashboard`
- Global UI content: navbar brand text, nav labels, footer text, shared notices
- SEO per page: title, description, OG image, canonical
- Quote/business content that appears on pages (labels/help text/CTA text)

Out of scope (for phase 1):
- Core booking/auth logic changes
- Visual layout builder with arbitrary drag/drop components
- Multi-language support

## 3) Current-state gaps (from codebase)
- Home, quote, login, signup, checkout, dashboard headings/body text are hardcoded.
- Navbar brand text is hardcoded.
- Rate profiles are hardcoded in `src/lib/rates.js`.
- Metadata title is hardcoded in `src/app/layout.jsx`.

## 4) Functional requirements
FR-01 Content model:
- System must store page content as structured JSON in MongoDB.
- Each page record must include: `slug`, `status (draft/published)`, `version`, `seo`, `sections[]`, `updatedBy`, timestamps.

FR-02 Global settings:
- Admin must manage global fields: `siteName`, `supportEmail`, default SEO fields, nav items, footer text.

FR-03 Sectioned pages:
- Each page must render from `sections[]` using supported section types.
- Phase-1 section types:
  - `hero` (eyebrow, heading, subheading, primary/secondary CTA)
  - `richText` (sanitized markdown-like content)
  - `featureCards` (title + description list)
  - `notice` (info/warning/success blocks)
  - `formIntro` (title, helper text, submit label)
  - `emptyState` (title, text, CTA)

FR-04 Admin content editor:
- Admin can create/edit/publish/unpublish page content per slug.
- Admin can reorder sections.
- Admin can preview draft before publish.
- Admin can duplicate a page version and rollback to previous published version.

FR-05 Safe rendering:
- Server-side rendering should fetch published content by default.
- If page content is missing, app must render safe fallback + log warning.
- Sanitization must prevent script injection in rich text.

FR-06 Role access:
- Only `admin` role can manage CMS content.
- Non-admin users can only consume published content.

FR-07 Fare business-config from admin (aligned to existing fare docs):
- Rate profiles must move from static file to admin-managed collection.
- Admin manages fare-state configs in one profile/version:
  - `QUOTE_RATE_CONFIG`
  - `WAITING_RATE_CONFIG`
  - `CANCELLATION_RATE_CONFIG`
  - `NO_SHOW_RATE_CONFIG`
  - `ADJUSTMENT_RATE_CONFIG`
- Existing formula/rules stay the same (distance-only + minimum billable miles + immutable fare snapshot).
- New addition: `QUOTE_RATE_CONFIG` must support slab/tier per-mile pricing.
- Pricing mode is fixed to `slab_progressive` for all quote calculations (no flat per-mile mode).
- Admin can create/reorder slabs and define `fromMiles`, `toMiles` (or open-ended), and `ratePerMile`.
- Validation rules:
  - Slabs must be contiguous and non-overlapping.
  - First slab must start at `1` mile.
  - Last slab may be open-ended (`toMiles = null`) for all higher distances.
  - `ratePerMile > 0`.
- Rule/profile selection must be config-driven (vehicle/service/zone/time/version), not hardcoded by page/location string.

FR-08 Auditability:
- Every publish action stores `publishedBy`, `publishedAt`, `changeNote`.
- Keep at least last 20 versions per page.

FR-09 Reliability:
- If DB read fails, system should degrade gracefully with cached last-published snapshot where possible.

## 5) Data model (proposed)
- `CmsPage`
  - `slug` (unique)
  - `status`
  - `seo` { title, description, canonicalUrl, ogImage }
  - `sections` [{ id, type, props, order }]
  - `version`, `isLatest`, `publishedAt`, `publishedBy`, `updatedBy`
- `CmsGlobalSettings`
  - `siteName`, `supportEmail`, `defaultSeo`, `navItems[]`, `footer`
- `RateProfile`
  - `version`, `vehicleClass`, `serviceType`, `zoneScope`, `timeBucket`, `activeFrom`, `activeTo`, `status`
  - `quoteRateConfig`:
    - `minimumBillableMiles`, modifiers/surcharges/tax
    - `pricingMode` (`slab_progressive`) only
    - `slabs[]` with `{ fromMiles, toMiles|null, ratePerMile, order }` (required)
  - `waitingRateConfig`, `cancellationRateConfig`, `noShowRateConfig`, `adjustmentRateConfig`

## 6) Admin UX requirements
- New admin tabs:
  - `Bookings` (existing)
  - `Content` (pages + sections)
  - `Rates` (rate profile + fare-state configs)
  - `Global Settings`
- Content editor must include field-level validation and inline errors.
- Publish action requires confirmation modal.

## 7) API requirements
- `GET /api/cms/pages/:slug?mode=published|draft`
- `PUT /api/admin/cms/pages/:slug` (save draft)
- `POST /api/admin/cms/pages/:slug/publish`
- `GET /api/admin/cms/pages/:slug/versions`
- `POST /api/admin/cms/pages/:slug/rollback`
- `GET/PUT /api/admin/cms/global-settings`
- `GET/POST/PUT /api/admin/rate-profiles`
- Rate calculation endpoint response must always include slab breakdown lines (`slab_progressive` only mode).

## 8) Non-functional requirements
- P95 page content fetch <= 200ms (excluding initial cold DB connection).
- Validation with Zod for all admin payloads.
- Admin mutations must revalidate relevant routes.
- All dynamic content must be SSR-safe and hydration-stable.

## 9) Acceptance criteria
- Changing homepage hero text in admin updates `/` without code change.
- Changing login/signup helper text in admin updates auth pages.
- Changing dashboard empty-state text in admin updates `/dashboard`.
- Changing rate profile in admin affects new quotes that match that profile selection key.
- Slab example works correctly:
  - If slabs are `1-10 @ 4.0`, `11-15 @ 3.5`, `16+ @ 3.0` and distance is `15`,
    quote must compute `10*4.0 + 5*3.5` before surcharges/tax.
- Unpublished draft does not appear publicly.
- Rollback restores previous published content.

## 10) Implementation phases
Phase 1:
- Add CMS models, APIs, and render abstraction (`renderSection`).
- Migrate hardcoded copy for `/`, `/quote`, `/login`, `/signup`.

Phase 2:
- Add `/checkout` and `/dashboard` content-driven sections.
- Add global settings + SEO dynamic metadata.

Phase 3:
- Move rate profiles to DB + admin editor + caching strategy.
- Add slab-capable quote rate config inside rate profiles.

## 11) Decisions assumed in this draft
- You want admin-managed structured sections (not full WYSIWYG HTML everywhere).
- Existing page layouts stay mostly the same; content becomes dynamic.
- `admin` role is sufficient (no editor role yet).
- Existing fare model and state machine from the project docs remains the source of truth; slab pricing is an additive change.
