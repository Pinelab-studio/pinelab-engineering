---
name: monthly-client-summary
description: "Create a monthly summary for a Pinelab client with completed tasks, metrics, and next steps. Only use when the user explicitly mentions Pinelab and requests this summary."
---

We will create a monthly summary for a specific Pinelab client using tasks from Trello and metrics from the database. The result is a Dutch HTML email whose rendered content the user can copy into an email client. The user must read, verify, and adjust the email as needed before sending it.

Required input: the client and the month to summarize.

## Procedure

1. Retrieve all Trello tasks moved to the Done list during the selected month, including tasks for other clients.
2. Summarize what we completed for this client. Use simple, non-technical bullet points. Combine tasks where this improves readability.
3. Summarize what we completed for other clients as inspiration for possible improvements and available solutions. Do not mention other clients' names. ONLY fetch non-archived cards.
4. Use these Trello cards to fill in the variables in the email template below.
5. Fetch the metrics for this client from the Vendure database with the query below.
6. Use these metrics to fill in the metric variables in the email template
7. Write a one or two sentence conclusion for the metrics, and insert in {{metric_conclusions}}
8. Return the filled in HTML email in chat, so that the user can copy/past it. Do mention what the user needs to replace still.

## SQL query for metrics

This query returns the following per currency:

- Monthly revenue and its percentage change compared with the same month last year and the previous month.
- Average order value and the same percentage comparisons.
- Order count and the same percentage comparisons.

```sql
/* Enter the first day of the selected month here. */
   SET @month_start = DATE('2026-10-01');
   SET @previous_month_start = DATE_SUB(@month_start, INTERVAL 1 MONTH);
   SET @previous_year_start = DATE_SUB(@month_start, INTERVAL 1 YEAR);

   SELECT
       currencyCode,

       ROUND(current_revenue / 100, 0)
           AS revenue_selected_month,
       ROUND(previous_revenue / 100, 0)
           AS revenue_same_month_last_year,
       ROUND(month_revenue / 100, 0)
           AS revenue_previous_month,
       ROUND(
           100.0 * (current_revenue - previous_revenue)
           / NULLIF(previous_revenue, 0),
           1
       ) AS revenue_year_change_pct,
       ROUND(
           100.0 * (current_revenue - month_revenue)
           / NULLIF(month_revenue, 0),
           1
       ) AS revenue_month_change_pct,

       ROUND(current_revenue / NULLIF(current_orders, 0) / 100, 0)
           AS aov_selected_month,
       ROUND(previous_revenue / NULLIF(previous_orders, 0) / 100, 0)
           AS aov_same_month_last_year,
       ROUND(month_revenue / NULLIF(month_orders, 0) / 100, 0)
           AS aov_previous_month,
       ROUND(
           100.0 * (
               (current_revenue / NULLIF(current_orders, 0))
               / NULLIF(previous_revenue / NULLIF(previous_orders, 0), 0)
               - 1
           ),
           1
       ) AS aov_year_change_pct,
       ROUND(
           100.0 * (
               (current_revenue / NULLIF(current_orders, 0))
               / NULLIF(month_revenue / NULLIF(month_orders, 0), 0)
               - 1
           ),
           1
       ) AS aov_month_change_pct,

       current_orders AS orders_selected_month,
       previous_orders AS orders_same_month_last_year,
       month_orders AS orders_previous_month,
       ROUND(
           100.0 * (current_orders - previous_orders)
           / NULLIF(previous_orders, 0),
           1
       ) AS orders_year_change_pct,
       ROUND(
           100.0 * (current_orders - month_orders)
           / NULLIF(month_orders, 0),
           1
       ) AS orders_month_change_pct

   FROM (
       SELECT
           currencyCode,

           SUM(
               CASE WHEN orderPlacedAt >= @month_start
                     AND orderPlacedAt < DATE_ADD(@month_start, INTERVAL 1 MONTH)
                    THEN subTotalWithTax + shippingWithTax
                    ELSE 0
               END
           ) AS current_revenue,
           SUM(
               CASE WHEN orderPlacedAt >= @previous_year_start
                     AND orderPlacedAt < DATE_ADD(@previous_year_start, INTERVAL 1 MONTH)
                    THEN subTotalWithTax + shippingWithTax
                    ELSE 0
               END
           ) AS previous_revenue,
           SUM(
               CASE WHEN orderPlacedAt >= @previous_month_start
                     AND orderPlacedAt < @month_start
                    THEN subTotalWithTax + shippingWithTax
                    ELSE 0
               END
           ) AS month_revenue,

           COUNT(
               CASE WHEN orderPlacedAt >= @month_start
                     AND orderPlacedAt < DATE_ADD(@month_start, INTERVAL 1 MONTH)
                    THEN 1
               END
           ) AS current_orders,
           COUNT(
               CASE WHEN orderPlacedAt >= @previous_year_start
                     AND orderPlacedAt < DATE_ADD(@previous_year_start, INTERVAL 1 MONTH)
                    THEN 1
               END
           ) AS previous_orders,
           COUNT(
               CASE WHEN orderPlacedAt >= @previous_month_start
                     AND orderPlacedAt < @month_start
                    THEN 1
               END
           ) AS month_orders

       FROM `order`
       WHERE state <> 'Cancelled'
         AND (
             (
                 orderPlacedAt >= @previous_month_start
                 AND orderPlacedAt < DATE_ADD(@month_start, INTERVAL 1 MONTH)
             )
             OR
             (
                 orderPlacedAt >= @previous_year_start
                 AND orderPlacedAt < DATE_ADD(@previous_year_start, INTERVAL 1 MONTH)
             )
         )
       GROUP BY currencyCode
   ) AS totals;
```

## Email template

### Instructions for filling out the template

- Keep the email content in Dutch.
- Use the corresponding currency symbol in front of amounts: €, £ or $ depending on the currency code.
- Replace all `{{...}}` placeholders before sending the email.
- HTML-escape inserted text. Populate `{{finished_tasks_html}}` with a `<ul>` containing `<li>` elements; escape the task text, not the HTML tags.
- Populate {{other_tasks_html}} with a `<ul>` containing `<li>` elements.
- Populate `{{client_name}}` with the client's name.
- The user must fill `{{planning_url}}` with the link to the planning overview. When preparing a draft, keep the visible TODO while this link is missing. Remove the TODO once the link is supplied. Do not send the email with a missing link or TODO.

### Dates

Derive dates from the query's `@month_start`, not today's date. Use Dutch month names.

- `selected_month_label`: full month and year, for example oktober 2025.
- `previous_year_month_label`: the same month last year, for example okt 2024.
- `previous_month_label`: the preceding month, for example sep 2025.

### Values

Metric placeholders match the SQL column names.

- `revenue_selected_month` and `aov_selected_month`: use the result row's `currencyCode` and Dutch number formatting with no decimal places, for example EUR 42.500. The SQL query already converts cents; do not divide by 100 again.
- `orders_selected_month`: an integer with periods as thousands separators.
- Percentages: append `%`, use one decimal place with a decimal comma, and prefix positive numbers with `+`. Example: `12.40` becomes `+12,4%`, `-3.10` becomes `−3,1%`, and `0` becomes `0,0%`. Percentage changes are calculated from unrounded values. Do not multiply by 100 again.
- `NULL`: display ‘Niet beschikbaar’, never 0 or 0%.

### Colors

Derive each `*_color` placeholder from its corresponding numeric percentage:

- Positive: `#365914`.
- Negative: `#994126`.
- Zero or `NULL`: `#555555`.

Do not invent missing values or leave placeholders unresolved.

```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body
    style="font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.5; color:#222222; background-color:#ffffff;"
  >
    <p>Hoi {{client_name}},</p>

    <p>
      {{selected_month_label}} is weer voorbij. Hieronder vind je een
      samenvatting van de maand.
    </p>

    <h2 style="font-size:20px; line-height:28px; margin:24px 0 12px;">
      Wat hebben we gedaan?
    </h2>
    {{finished_tasks_html}}

    <h2 style="font-size:20px; line-height:28px; margin:24px 0 12px;">
      Wat gaan we doen?
    </h2>
    <p>
      Graag bespreek ik samen met je waar we de komende maand op kunnen focussen.
    </p>

    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      style="margin:16px 0 24px;"
    >
      <tr>
        <td
          align="center"
          bgcolor="#bcf660"
          style="background-color:#bcf660; border-radius:6px; mso-padding-alt:12px 24px;"
        >
          <a
            href="https://calendly.com/pinelab-studio/how-can-we-help"
            style="display:inline-block; padding:12px 24px; border:1px solid #bcf660; border-radius:6px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:24px; font-weight:bold; color:#18240d; text-decoration:none; mso-padding-alt:0;"
            >Plan een gesprek</a
          >
        </td>
      </tr>
    </table>

    <p>
      Je kan hier altijd live bekijken wat er in de planning staat en welke taken we al hebben afgerond:
      <a
        href="{{planning_url}}"
        style="color:#365914; text-decoration:underline;"
        >Bekijk de planning</a
      >.
    </p>
    <p>
      <strong
        >TODO voor de gebruiker: vul de link naar de planning in en verwijder
        deze tekst voordat je de e-mail verstuurt.</strong
      >
    </p>

    <h2 style="font-size:20px; line-height:28px; margin:24px 0 12px;">
      Dit hebben we bij andere projecten gedaan
    </h2>
    <p>
      Collectivisatie en hergebruik is onderdeel van Pinelab, dus wie weet zit
      er iets voor je tussen?
    </p>
    {{other_tasks_html}}

    <h2 style="font-size:20px; line-height:28px; margin:24px 0 12px;">
      De cijfers
    </h2>
    <p>Dit zijn de resultaten van je webshop voor {{selected_month_label}}.</p>

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="max-width:600px; table-layout:fixed; border-collapse:collapse; border:1px solid #bcf660; font-family:Arial,Helvetica,sans-serif;"
    >
      <tr>
        <td
          width="33%"
          valign="top"
          bgcolor="#ffffff"
          style="padding:16px 8px; border:1px solid #bcf660; border-top:4px solid #bcf660;"
        >
          <div style="font-size:13px; color:#18240d;">Omzet</div>
          <div
            style="margin-top:8px; font-size:24px; line-height:32px; font-weight:bold; color:#18240d;"
          >
            {{revenue_selected_month}}
          </div>
          <div
            style="margin-top:12px; font-size:12px; line-height:20px; color:#555555;"
          >
            <span
              style="font-weight:bold; color:{{revenue_year_change_pct_color}};"
              >{{revenue_year_change_pct}}</span
            >
            vs {{previous_year_month_label}}<br />
            <span
              style="font-weight:bold; color:{{revenue_month_change_pct_color}};"
              >{{revenue_month_change_pct}}</span
            >
            vs {{previous_month_label}}
          </div>
        </td>

        <td
          width="34%"
          valign="top"
          bgcolor="#ffffff"
          style="padding:16px 8px; border:1px solid #bcf660; border-top:4px solid #bcf660;"
        >
          <div style="font-size:13px; color:#18240d;">Gem. bestelwaarde</div>
          <div
            style="margin-top:8px; font-size:24px; line-height:32px; font-weight:bold; color:#18240d;"
          >
            {{aov_selected_month}}
          </div>
          <div
            style="margin-top:12px; font-size:12px; line-height:20px; color:#555555;"
          >
            <span style="font-weight:bold; color:{{aov_year_change_pct_color}};"
              >{{aov_year_change_pct}}</span
            >
            vs {{previous_year_month_label}}<br />
            <span
              style="font-weight:bold; color:{{aov_month_change_pct_color}};"
              >{{aov_month_change_pct}}</span
            >
            vs {{previous_month_label}}
          </div>
        </td>

        <td
          width="33%"
          valign="top"
          bgcolor="#ffffff"
          style="padding:16px 8px; border:1px solid #bcf660; border-top:4px solid #bcf660;"
        >
          <div style="font-size:13px; color:#18240d;">Bestellingen</div>
          <div
            style="margin-top:8px; font-size:24px; line-height:32px; font-weight:bold; color:#18240d;"
          >
            {{orders_selected_month}}
          </div>
          <div
            style="margin-top:12px; font-size:12px; line-height:20px; color:#555555;"
          >
            <span
              style="font-weight:bold; color:{{orders_year_change_pct_color}};"
              >{{orders_year_change_pct}}</span
            >
            vs {{previous_year_month_label}}<br />
            <span
              style="font-weight:bold; color:{{orders_month_change_pct_color}};"
              >{{orders_month_change_pct}}</span
            >
            vs {{previous_month_label}}
          </div>
        </td>
      </tr>
    </table>

    <p>De getoonde bedragen zijn inclusief BTW. {{metric_conclusions}}</p>

    <p>Heb je vragen? Bel of mail gerust.</p>

    <p>Groeten,<br />Martijn</p>
  </body>
</html>
```
