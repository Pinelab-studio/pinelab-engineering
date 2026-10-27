---
name: "Storefront SEO audit with Vendure"
category: frontend
description: "Audit product and collection page SEO and map missing storefront features to Vendure data integration."
---

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
6. Check `/robots.txt` for intentional crawl rules and an absolute sitemap URL. Check `/sitemap.xml` for complete, canonical, indexable product and collection URLs.
7. For every missing item, state both what is missing and how to implement it using the integration guidance below.

## Vendure integration
- Add nullable, public `metaTitle` (`localeString`) and `metaDescription` (`localeText`) custom fields to both `Product` and `Collection` when missing. Group them under the SEO tab in the editor. Generate and run a database migration before saving values.
- Query localized product fields: `name`, `slug`, `description`, `translations`, `featuredAsset`, `assets`, `collections`, `variants`, and SEO custom fields such as `metaTitle` and `metaDescription`.
- Query variant `sku`, `currencyCode`, configured price (`price` or `priceWithTax`), and `stockLevel` for offers. Respect the storefront's tax-display configuration.
- Build product metadata from trimmed, localized SEO custom fields. Fall back to trimmed product name and sanitized/truncated description. Render metadata through the shared page layout.
- Build canonical and hreflang URLs from localized translation slugs and the configured public site URL; do not use the request host on local/staging environments.
- Build `Product` schema from product/variant data, including SKU and images. Use `Offer` for a single variant and `AggregateOffer` for multiple variants, with low/high prices, currency, offer count, and availability.
- Convert Vendure minor-unit prices to major currency units before formatting offers (divide by 100 for two-decimal currencies). Map `OUT_OF_STOCK` to `https://schema.org/OutOfStock` and available stock levels to `https://schema.org/InStock`; ensure availability accurately reflects the variants.
- Add `AggregateRating` and `Review` only from the actual review source. Include only reviews represented by initial page data and containing valid author, text, and rating.
- Parse localized FAQ custom-field content defensively. Add `FAQPage` only for valid, visible question/answer entries.
- Build `BreadcrumbList` from collection breadcrumbs, including home and the product where applicable. Use absolute URLs consistent with canonical URL conventions and keep the trail synchronized with the visible breadcrumb component.
- Query collection `name`, `slug`, `description`, `translations`, breadcrumbs, featured asset, SEO custom fields, and products.
- Build collection metadata from trimmed, localized SEO custom fields, falling back to collection name and sanitized/truncated description. Render metadata through the shared page layout.
- Build `CollectionPage` schema containing an `ItemList`. Include position, absolute product URL, trimmed product name, and image when available. Deduplicate product-variant results by product ID and number positions starting at 1.
- Serialize structured data into `application/ld+json` scripts using the storefront framework's safe serialization facilities.
- Query `id`, `name`, and `preview` for featured assets and asset lists, including assets nested under variants, order lines, and collections. Use an editor-maintained descriptive `Asset.name` for image alt text when available; otherwise fall back to the product name. Do not use generated filenames.
- Serve `/robots.txt` with the intended crawl rules and an absolute sitemap URL. Exclude search/filter crawler traps where appropriate and preserve intentional environment-specific indexing restrictions.
- Generate `/sitemap.xml` from paginated product and collection queries. Fetch `slug`, `updatedAt`, and `totalItems`; continue until all results are included. Include only canonical, indexable URLs with last-modified dates, using translated slugs for localized URLs. Choose static generation, an endpoint, or caching to match the storefront framework.
- Verify ownership in Google Search Console and Bing Webmaster Tools, then submit the sitemap to both. Review crawl errors, indexing status, structured-data warnings, and Core Web Vitals after deployment.

## Verify
- Metadata values are present, unique, localized, and use absolute production URLs.
- Canonical and hreflang URLs use translated entity slugs and agree with navigation URLs.
- JSON-LD parses successfully and contains only supported, truthful fields.
- Product prices use major currency units, not Vendure minor units.
- Availability accurately summarizes variants.
- Image alt text uses descriptive asset names or product names, not generated filenames.
- Robots rules preserve the intended indexing policy and reference the absolute sitemap URL.
- The sitemap includes all canonical, indexable product and collection URLs with translated slugs and last-modified dates.
- A production build and type check pass; report unrelated pre-existing failures separately.
- Optionally validate JSON-LD with Google Rich Results Test or Schema.org Validator; eligibility does not guarantee rich results.

## Limitations
- `noindex` intentionally retained by the user will continue to reduce Lighthouse SEO and prevent indexing despite other improvements.
- Storefront fallbacks cannot repair weak or missing localized content in Vendure.
- Google may ignore valid review or FAQ schema and applies additional eligibility policies.
