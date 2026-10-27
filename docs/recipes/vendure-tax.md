---
name: "Vendure EU reverse-charge tax"
category: backend
description: "Implement and configure Vendure EU reverse-charge tax zones, tax rates, VAT-format checks, and a custom TaxZoneStrategy."
---

Implement and configure Vendure so eligible intra-Community supplies use 0% VAT for EU destinations outside the merchant's home country. This recipe does not cover unrelated Vendure tax setups.

## Prerequisites and decisions

- Identify the merchant's home country; never assume it is the Netherlands. Substitute its country code wherever examples use `NL`.
- Confirm tax categories for every product class, such as standard, reduced, and zero.
- Decide whether a reverse-charge `TaxZoneStrategy` already exists. If it does, verify its contract before configuring zones. If not, implement and register one as described below.
- Decide whether eligibility requires VAT-country and destination matching, per-channel enablement, or authoritative registry validation. Do not infer project custom fields.

## Configure the zone and rates

1. In **Settings → Zones**, create **EU Reverse Tax Charge** or another agreed name.
2. Add every applicable EU member state except the merchant's home country. Keep membership current.
3. Create and enable a 0% rate in that zone for every applicable tax category. Each category needs a matching rate even though all eligible transactions use 0%.

## Implement the strategy when needed

Create `reverse-tax-zone.strategy.ts`. Use a configured VAT custom-field name, validate format before selecting the reverse zone, consistently use shipping country, exclude the reverse zone from normal country lookup, reject invalid options during construction, and safely fall back if the configured zone is missing.

```ts
import {
  Channel,
  Logger,
  Order,
  RequestContext,
  TaxZoneStrategy,
  Zone,
} from '@vendure/core';
import { validateVatId } from './vat-id.util';

const loggerCtx = 'ReverseTaxZoneStrategy';

export interface ReverseTaxZoneStrategyOptions {
  reverseTaxZoneName: string;
  vatIdCustomFieldName?: string;
}

export class ReverseTaxZoneStrategy implements TaxZoneStrategy {
  private readonly vatIdCustomFieldName: string;

  constructor(private readonly options: ReverseTaxZoneStrategyOptions) {
    if (!options.reverseTaxZoneName) {
      throw new Error('reverseTaxZoneName is required');
    }
    this.vatIdCustomFieldName = options.vatIdCustomFieldName ?? 'vatId';
  }

  determineTaxZone(
    _ctx: RequestContext,
    zones: Zone[],
    channel: Channel,
    order?: Order,
  ): Zone {
    const countryCode = order?.shippingAddress?.countryCode;
    if (!order || !countryCode) return channel.defaultTaxZone;

    const reverseTaxZone = zones.find(
      zone => zone.name === this.options.reverseTaxZoneName,
    );
    const vatId = this.getVatId(order);

    if (
      reverseTaxZone &&
      validateVatId(vatId) &&
      reverseTaxZone.members?.some(member => member.code === countryCode)
    ) {
      return reverseTaxZone;
    }

    if (!reverseTaxZone) {
      Logger.error(
        `No reverse tax zone named '${this.options.reverseTaxZoneName}' found for order '${order.code}'`,
        loggerCtx,
      );
    }

    const destinationZone = zones.find(
      zone =>
        zone.name !== this.options.reverseTaxZoneName &&
        zone.members?.some(member => member.code === countryCode),
    );
    if (destinationZone) return destinationZone;

    Logger.warn(
      `No tax zone found for country '${countryCode}'; using default zone '${channel.defaultTaxZone.name}' for order '${order.code}'`,
      loggerCtx,
    );
    return channel.defaultTaxZone;
  }

  private getVatId(order: Order): string | undefined {
    const fields = order.customFields as Record<string, unknown> | undefined;
    const value = fields?.[this.vatIdCustomFieldName];
    return typeof value === 'string' ? value : undefined;
  }
}
```

This baseline checks VAT syntax and destination-zone membership. Add explicit eligibility logic for agreed rules such as VAT-country matching, home-country exclusion beyond zone configuration, authoritative validation, or per-channel enablement. Do not silently assume `ctx.channel.customFields.allowReverseTaxCharge` exists.

Register it in `vendure-config.ts`:

```ts
taxOptions: {
  taxZoneStrategy: new ReverseTaxZoneStrategy({
    reverseTaxZoneName: 'EU Reverse Tax Charge',
    vatIdCustomFieldName: 'vatId',
  }),
},
```

`determineTaxZone()` is called frequently and may receive no order while product prices are displayed. Keep it synchronous and avoid external VAT calls there.

## VAT-format validation

Normalize to uppercase alphanumeric characters and validate against country-specific patterns. Include patterns only for supported jurisdictions and maintain them as regulations change. Unit-test valid spacing/punctuation variants, supported countries, malformed values, wrong lengths, and unsupported prefixes.

A regex proves syntax only. It does not prove that the number exists, is active, belongs to the customer, matches the shipping destination, or qualifies for reverse charge. Perform authoritative validation outside synchronous tax-zone selection and define outage behavior.

## Verify

- The strategy is registered under `taxOptions.taxZoneStrategy` when custom strategy behavior is required.
- The reverse zone includes intended EU countries and excludes the merchant's home country.
- Every applicable tax category has an enabled 0% rate for the reverse zone.
- Eligible destination plus a validly formatted VAT ID selects the reverse zone and applies 0%.
- Missing or malformed VAT ID uses the normal destination zone.
- Home-country and non-EU orders never select the reverse zone.
- Test additional agreed eligibility rules separately, including VAT-country matching and validation-service failures.

## Limitations and status

- Country syntax rules and EU membership change and require maintenance.
- `GB` VAT syntax must never imply EU eligibility.
- Zone membership plus regex validation alone may be insufficient for the business or legal requirements; obtain appropriate tax advice.
- This recipe was reorganized from prior session knowledge. Its examples were not freshly validated during documentation conversion.
