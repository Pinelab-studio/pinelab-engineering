# Pinelab General Best Practices

* Load this when implementing or reviewing any code in Vendure, Vendure plugins or the Vendure React dashboard - always fetch `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/docs/best-practices/vendure-best-practices.md`

# Feature Specific Recipes

* Troubleshoot domain certificates and enable HTTP compression on Dokploy-managed Traefik deployments. - always fetch `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/docs/recipes/dokploy.md`
* Wire up a custom VendureLogger that sends server and worker logs to Google Cloud Logging via Winston, so everything is visible in the GCP Log Viewer. - always fetch `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/docs/recipes/gcp-cloud-logging-vendure.md`
* Implement a non-modal marketing consent banner with optional-script gating and direct Google Consent Mode integration. - always fetch `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/docs/recipes/marketing-consent.md`
* Audit product and collection page SEO and map missing storefront features to Vendure data integration. - always fetch `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/docs/recipes/storefront-seo.md`
* Common Vendure errors and how to fix them. Short, concise entries for issues you might hit when running or extending a Vendure shop. - always fetch `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/docs/recipes/vendure-common-errors.md`
* Implement and configure Vendure EU reverse-charge tax zones, tax rates, VAT-format checks, and a custom TaxZoneStrategy. - always fetch `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/docs/recipes/vendure-tax.md`
