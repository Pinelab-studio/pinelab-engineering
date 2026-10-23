---
name: "Dokploy Best Practices"
category: infrastructure
description: "Troubleshoot domain certificates and enable HTTP compression on Dokploy-managed Traefik deployments."
---

# Dokploy Best Practices

A collections of best practices and caveats we ran into at Pinelab.

## Domain

If certificate generation fails, it can help to **fully remove the domain** from the Dokploy dashboard, then add it again. Afterwards, verify that HTTPS works with a valid certificate. This is not a guaranteed fix.

## Compression

Requires access to Dokploy's Traefik files and application domain settings. Confirm your Traefik version supports the shown compression options before applying them.

1. Merge this middleware into `/etc/dokploy/traefik/dynamic/middlewares.yml`, preserving existing entries:

   ```yaml
   http:
     middlewares:
       storefront-compress:
         compress:
           minResponseBodyBytes: 1024
           encodings:
             - br
             - gzip
   ```

2. In the application's Dokploy domain settings, add `storefront-compress@file` under **Middlewares**, then click **Add** and **Update**. An application rebuild is normally unnecessary. Use the domain UI rather than editing generated application YAML, which Dokploy may overwrite.

For Astro storefronts, set `build.inlineStylesheets: 'auto'` in `astro.config.mjs` to emit large stylesheets as cacheable assets. `compressHTML` only minifies HTML; it does not enable HTTP compression.

Verify against a deployed text asset, not local preview:

```bash
curl -sI -H 'Accept-Encoding: br,gzip' \
  https://<storefront-domain>/_astro/<hashed-stylesheet>.css
```

Expect `Content-Encoding: br` or `gzip` and `Vary: Accept-Encoding`. Repeat without `Accept-Encoding` to confirm the asset still loads. Compression mainly benefits text assets, not WebP, JPEG, or PNG.

The compression instructions were migrated from prior knowledge and have not been freshly tested.
