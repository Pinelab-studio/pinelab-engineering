---
name: "Lightweight marketing consent without a consent library"
category: frontend
description: "Implement a non-modal marketing consent banner with optional-script gating and direct Google Consent Mode integration."
---

# Lightweight marketing consent without a consent library

## Scope

Build a portable non-modal consent banner that blocks all optional marketing scripts until acceptance and controls Google Consent Mode directly. This recipe does not cover general consent-management platforms or certify legal compliance.

## Prerequisites

- Reference stack: Astro 7, Tailwind CSS 4, daisyUI 5, and plain TypeScript.
- Full-page navigation; SPA navigation requires explicit lifecycle handling.
- Access to the layout, footer, analytics bootstrap, and tag-manager configuration.
- No runtime dependency or React hydration is required.

## Ask before implementing

Resolve these rules first:

- One accept/reject choice or categories? The reference uses one choice.
- Banner placement, dismissal behavior, languages, and privacy URL.
- Storage lifetime, migration, and behavior when storage is blocked.
- Whether reopening settings only shows the banner or immediately withdraws consent.
- Whether pre-consent in-memory events are delivered after acceptance or discarded; checkout events may contain personal data.
- Providers, verified cookie names, and GTM events that must remain compatible. Never copy tracking IDs between projects.

Reference decisions were Dutch/English, equally prominent buttons, six calendar months, a new versioned storage key, page-only state on storage failure, no withdrawal on reopening, and preserved in-memory queues.

## Implementation

1. Separate responsibilities:
   - `src/shared/components/ConsentBanner.astro`: portable markup and localized copy with `locale` and `privacyUrl` props.
   - `src/shared/consent-controller.ts`: framework-independent DOM, persistence, cookie cleanup, and focus behavior.
   - `src/shared/consent.ts`: project-specific Google Consent Mode and provider adapter.

   Keep provider URLs, advertiser IDs, and cookie allowlists in the adapter.

2. Render the banner once in the shared layout only where analytics is enabled. Use a labelled section with `id="consent-banner"`, fixed bottom positioning, safe-area padding, and constrained mobile scrolling. Use equally prominent buttons with `data-consent-accept` and `data-consent-reject`; omit backdrop, scroll lock, focus trap, and close button. Keep it visible in server HTML, then hide it during initialization for a valid saved choice.

3. Implement this controller shape:

   ```ts
   createConsentController({
     banner,
     storageKey,
     marketingCookies,
     onChange,
   }); // returns { open(): void }
   ```

   Persist `{ accepted: boolean, expires: number }` in localStorage. Validate type and expiry. Calculate six calendar months from each explicit choice, clamping month-end dates; do not renew on visits. A missing, invalid, or expired value shows the banner and leaves tracking denied. Catch storage failures and apply the choice only to the page. `open()` reveals the same banner without changing consent, focuses a button, and restores focus after choosing.

4. Set Google defaults before loading providers and preserve the existing queue:

   ```ts
   window.dataLayer = window.dataLayer || [];
   function gtag(..._args: unknown[]) {
     window.dataLayer!.push(arguments as unknown as Record<string, unknown>);
   }
   gtag('consent', 'default', {
     analytics_storage: 'denied',
     ad_storage: 'denied',
     ad_user_data: 'denied',
     ad_personalization: 'denied',
   });
   gtag('set', 'ads_data_redaction', true);
   ```

   Add the Window type declaration once. Denied Consent Mode does not prevent downloads: do not insert GTM or optional scripts before acceptance.

5. In `onChange`, separately track acceptance, scheduled loading, and started loading. Acceptance grants all four Google fields, queues required GTM consent events, and schedules providers after `window.load`, using `requestIdleCallback` when available and a timer otherwise. Handle an already-complete document. Recheck consent in delayed callbacks and provider load handlers. Load providers once; push `{ 'gtm.start': Date.now(), event: 'gtm.js' }` before GTM. Preserve conversion queues and ordering. Retain old Klaro event names only when the GTM container requires them.

6. On rejection or withdrawal, persist denial, hide the banner, update Google consent, and clear only verified accessible marketing cookies across relevant paths and host/parent-domain scopes. Cookie failures must not prevent denial. Pending callbacks must observe denied state. If providers already started, reload after saving denial. Do not clear all cookies or localStorage, and do not add cross-page event persistence implicitly.

7. Initialize the adapter after banner markup is parsed; guard duplicate initialization and missing markup. The footer settings button delegates to the controller's `open()`. Ensure disabled storefronts render neither markup nor scripts and no alternate bootstrap bypasses the gate.
8. Remove obsolete consent-library downloads, configuration, styles, tests, and globals. Document storage version, cookie allowlist, provider configuration, and integration points.

## Verify

- Production build and Astro type check pass; inspect the current generated page.
- Fresh browser: banner is immediately visible; no GTM or optional marketing request occurs before acceptance.
- Accept: choice persists, banner hides, providers load once, and agreed queued events run afterward.
- Reject: providers are not inserted and unrelated storage survives.
- Reload/navigation: valid choices persist without renewing expiry; invalid or expired records ask again.
- Settings reopen the same banner without changing state; keyboard focus restores after selection.
- Accept then reject before delayed work: no provider or conversion runs after denial. Already-started providers trigger reload.
- Blocked storage works for the page and asks again next page.
- Check responsive layout, languages, privacy link, overlays, and disabled storefronts. Avoid sending real analytics while testing.

## Limitations and status

- JavaScript cannot clear HttpOnly, third-party, or unknown-path cookies.
- Delayed scripts still incur network and CPU cost after acceptance.
- Returning visitors may briefly see the server-rendered banner before localStorage is read.
- This does not validate GTM configuration or establish legal compliance.
- The reference build and type check previously passed, but browser/Lighthouse follow-up remained pending due to a stale preview. No fresh verification was performed during documentation conversion.
