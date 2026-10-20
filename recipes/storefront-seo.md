---
name: "Storefront SEO audit with Vendure"
category: frontend
description: "Audit product and collection page SEO and map missing storefront features to Vendure data integration."
---

# Storefront SEO audit with Vendure

## Scope
Audit rendered product and collection pages. Give the user a prioritized list of missing or incorrect SEO features and explain how each should be implemented using Vendure data. Do not modify code unless separately requested.

## Ask first
- Which URLs, storefront/channel, locales, and environment should be audited?
- Is `noindex` intentional for this environment? Never remove it without approval.
- Does the user want an audit only or implementation afterward?

## Audit
1. Inspect the rendered HTML, not only source components.
2. Record HTTP status and validate:
   - One descriptive `<title>` and one H1.
   - Unique meta description.
   - Absolute self-referencing canonical URL.
   - `<html lang>` and reciprocal localized `hreflang`, including `x-default`.
   - Intentional robots directive; flag `noindex` as the likely cause of a Lighthouse SEO drop.
   - Open Graph: title, description, image, type, URL, locale, site name.
   - Twitter: card, title, description, image.
   - Descriptive image alt text rather than asset filenames; intrinsic image dimensions.
3. Parse every `application/ld+json` block and validate page-specific schema:
   - Product: `Product`, `Offer` or `AggregateOffer`, `BreadcrumbList`; optionally `AggregateRating`, displayed `Review`, and `FAQPage`.
   - Collection: `CollectionPage`, `BreadcrumbList`, and `ItemList`.
4. Ensure schema matches visible/current data. Omit unknown values; never invent prices, stock, ratings, reviews, FAQs, or identifiers.
5. Report findings as concise bullets grouped by priority:
   - Blocking: indexing, status, canonical, invalid schema.
   - Important: missing title/description, hreflang, Product/Offer data.
   - Enhancement: social cards, richer ItemList data, alt text, dimensions.
6. For every missing item, state both what is missing and how to implement it with Vendure.

## Vendure integration
- Query localized product fields: `name`, `slug`, `description`, `translations`, `featuredAsset`, `assets`, `collections`, `variants`, and SEO custom fields such as `metaTitle` and `metaDescription`.
- Query variant `sku`, `currencyCode`, configured price (`price` or `priceWithTax`), and `stockLevel` for offers. Respect the storefront's tax-display configuration.
- Build product metadata from localized SEO custom fields. Fall back to trimmed product name and sanitized/truncated description.
- Build canonical and hreflang URLs from localized translation slugs and the configured public site URL; do not use the request host on local/staging environments.
- Build `Product` schema from product/variant data. Use `AggregateOffer` for multiple variants, with low/high prices, currency, offer count, and availability.
- Add `AggregateRating` and `Review` only from the actual review source. Include only reviews represented by initial page data and containing valid author, text, and rating.
- Parse localized FAQ custom-field content defensively. Add `FAQPage` only for valid, visible question/answer entries.
- Build product breadcrumbs from home, the selected collection, and product. Keep URLs consistent with canonical URL conventions.
- Query collection `name`, `slug`, `description`, `translations`, breadcrumbs, featured asset, SEO custom fields, and products.
- Build collection metadata from localized SEO custom fields, falling back to collection name and sanitized description.
- Build `ItemList` entries with position, absolute product URL, trimmed product name, and image when available. Deduplicate products.
- Use the product name for storefront-generated image alt text. Asset filenames are not suitable fallbacks.

## Verify
- Metadata values are present, unique, localized, and use absolute production URLs.
- Canonical and hreflang URLs use translated entity slugs and agree with navigation URLs.
- JSON-LD parses successfully and contains only supported, truthful fields.
- Product prices use major currency units, not Vendure minor units.
- Availability accurately summarizes variants.
- A production build and type check pass; report unrelated pre-existing failures separately.
- Optionally validate JSON-LD with Google Rich Results Test or Schema.org Validator; eligibility does not guarantee rich results.

## Limitations
- `noindex` intentionally retained by the user will continue to reduce Lighthouse SEO and prevent indexing despite other improvements.
- Storefront fallbacks cannot repair weak or missing localized content in Vendure.
- Google may ignore valid review or FAQ schema and applies additional eligibility policies.
