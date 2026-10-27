---
name: "GTM Advanced Consent mode with Astro and Vendure"
category: frontend
description: "Set up GTM advanced Consent Mode with a custom cookie banner in Astro, and track purchases and shopping events from Vendure."
---

We’ll set up **GTM advanced Consent Mode** with a custom cookie banner in Astro and purchase tracking from Vendure. GTM loads immediately with consent **denied**, then we show the banner. Google can send measurements without cookies. Clicking **Accept all** changes consent to **granted**, allowing cookie-based tracking.

## 1. Configure GTM

You’ll need access to GTM, GA4, and your Astro layout. Choose your banner text, privacy link, and how long to remember choices. The example uses 180 days; adjust this to your policy.

Set the Google tag to fire on **Initialization – All Pages**. It already checks consent, so don’t make it wait for acceptance. Other tracking tools need their own consent checks and stop controls.

## 2. Load GTM with consent denied

Add this to your Astro layout’s `<head>`, before other tracking scripts. Replace `GTM-XXXXXX`. It restores saved choices before loading GTM.

```html
<script is:inline>
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  function consentState(accepted) {
    const state = accepted ? 'granted' : 'denied';
    return {
      analytics_storage: state, ad_storage: state,
      ad_user_data: state, ad_personalization: state,
    };
  }
  gtag('consent', 'default', consentState(false));
  window.consentChoice = null;
  try {
    const saved = JSON.parse(localStorage.getItem('consent-v1'));
    if (typeof saved?.accepted === 'boolean' &&
        typeof saved.expires === 'number' && saved.expires > Date.now()) {
      window.consentChoice = saved.accepted;
      gtag('consent', 'update', consentState(saved.accepted));
    }
  } catch {}
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXX';
  document.head.appendChild(script);
</script>
```

This follows [Google’s example](https://developers.google.com/tag-platform/security/guides/consent#implementation_example). You can instead use a GTM consent template with `setDefaultConsentState`/`updateConsentState`. Don’t combine both approaches.

## 3. Connect the custom banner

Make accepting and rejecting equally easy. Keep Cookie settings available for changing choices. Place this script after the buttons:

```html
<section id="consent-banner" aria-label="Cookie preferences">
  <p>Allow analytics and advertising? <a href="/privacy">Privacy policy</a></p>
  <button type="button" id="accept">Accept all</button>
  <button type="button" id="reject">Reject all</button>
</section>
<button type="button" id="settings">Cookie settings</button>
<script is:inline>
  const banner = document.getElementById('consent-banner');
  banner.hidden = window.consentChoice !== null;
  function choose(accepted) {
    gtag('consent', 'update', consentState(accepted));
    window.consentChoice = accepted;
    try {
      localStorage.setItem('consent-v1', JSON.stringify({
        accepted, expires: Date.now() + 180 * 86400000,
      }));
    } catch {} // Choice still applies on this page.
    banner.hidden = true;
  }
  document.getElementById('accept').onclick = () => choose(true);
  document.getElementById('reject').onclick = () => choose(false);
  document.getElementById('settings').onclick = () => {
    banner.hidden = false;
    document.getElementById('accept').focus();
  };
</script>
```

Other flows to handle:

- **Reject/no choice:** keep GTM loaded with consent denied.
- **Return visit:** reuse saved choices without extending how long they last. Ask again if choices expired or can’t be read. If saving is blocked, choices last for this page.
- **Settings:** opening changes nothing. Accept/reject updates consent before leaving the page.
- **Withdrawal:** also stop other tools and delete known marketing cookies; Google doesn’t delete them for you.
- **Separate choices:** give analytics and advertising separate consent values.

For Astro client-side navigation, reconnect buttons as needed without loading GTM twice.

## 4. Send ecommerce events

Fetch these Vendure fields. Send a purchase after Vendure confirms the order, not just on reaching the thank-you page. This example converts cents to a two-decimal currency:

```js
window.dataLayer.push({ ecommerce: null });
window.dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: String(order.id),
    currency: order.currencyCode,
    value: order.lines.reduce((sum, l) => sum + l.proratedLinePrice, 0) / 100,
    tax: (order.totalWithTax - order.total) / 100,
    shipping: order.shipping / 100,
    items: order.lines.map(l => ({
      item_id: String(l.productVariant.id),
      item_name: l.productVariant.name,
      price: l.proratedUnitPrice / 100,
      quantity: l.quantity,
    })),
  },
});
```

Value excludes tax/shipping and includes discounts. Match product IDs to your feeds. Send purchases once; keep transaction IDs unchanged on reload to avoid duplicates. Never send personal data.

Also track:

- `page_view`: page visits; use automatic or manual tracking, not both.
- `view_item_list`, `select_item`, `view_item`: seeing lists, choosing products, viewing products.
- `add_to_cart`, `remove_from_cart`, `view_cart`: cart changes/views; send only changed quantities for changes.
- `begin_checkout`, `add_shipping_info`, `add_payment_info`: checkout starts, shipping/payment chosen. Include `shipping_tier`/`payment_type` where relevant.
- `refund`: refunds, using the original transaction ID.

Clear old ecommerce data before each event. In GTM, match Custom Event triggers to GA4 event tags using `{{Event}}`. Enable ecommerce from Data Layer.

For Ads, connect `ecommerce.value`, `ecommerce.currency`, and `ecommerce.transaction_id` to the conversion tag. A `conversion` event needs a matching tag. Avoid counting purchases through both Ads tags and GA4 imports. Send events when they happen, even while denied; don’t resend after acceptance.

## 5. Check everything works

Try [Tag Assistant](https://developers.google.com/tag-platform/security/guides/consent-debugging) with a test container. A fresh visit should show four denied values, Google requests without cookies, and no analytics/ads cookies.

Test accept, reject, reload, expiry, blocked storage, and changing your mind. Check other tools respect consent, [event values](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce) are correct, nothing is counted twice, and no personal data is sent. These browser checks still need doing; reading code isn’t enough.
