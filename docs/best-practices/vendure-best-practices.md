---
name: Vendure Best Practices
description: Load this when implementing or reviewing any code in Vendure, Vendure plugins or the Vendure React dashboard
---

Apply these guidelines when implementing or reviewing Vendure code, plugins, or React dashboard extensions. They cover code structure, event handling, logging, and other implementation constraints.

# General guidelines

- Place resolvers only in `resolvers: []`, not in `providers: []`.
- Make behaviour configurable through a strategy when consumers may reasonably need to change it; avoid speculative abstractions. For example, expose `sendToAnalytics: (order) => ...` so consumers control how orders are formatted and sent.
- Do not update order custom fields in `OrderPlacedEvent` handlers. Concurrent updates by Vendure and the handler can cause race conditions, leaving orders unsettled or active.

# Vendure code structure

- `api/` — GraphQL schema extensions (api-extensions.ts), resolvers and controllers
- `config/` — Vendure configuration, strategies, promotions and shipping strategies. Anything that goes in `vendureConfig` goes here.
- `entities/` — TypeORM entity definitions
- `services/` — Business logic (NestJS @Injectable() services)
- `types.ts` — Plugin options interface and shared type definitions
- `constants.ts` — Injection token symbols, logger context
- `<plugin-name>.plugin.ts` — @VendurePlugin decorator that registers everything

# No async/await in `eventBus.subscribe()`

NEVER use `async/await` inside `eventBus.ofType(*ProductEvent*).subscribe(`. Always wrap the function inside in a `.catch`.

```ts
// NEVER do this, bad
eventBus.ofType(*ProductEvent*).subscribe(async () =>
    await someAsyncFunction();
)

// Do this instead, this is good
eventBus.ofType(*ProductEvent*).subscribe(async () =>
    someAsyncFunction().catch((e) => Logger.error(`Failed: ${e.message}`, loggerCtx, e.stack));
)
```

# Logger

- Use the Vendure built-in logger
- Include `order.code` in order-related messages for traceability; use identifiers such as `product.id` or `variant.sku` for other entities.
- Include `e.stack` for errors

```ts
Logger.error(`It failed for order ${order.code}`, loggerCtx, e.stack); // Always use the nearest loggerCtx you can find
Logger.info(`Order ${order.code} has been processed`, loggerCtx);
```

# Testing

- Prefer GraphQL queries and mutations; call services directly when this makes cases more readable or isolated.
- Never use arbitrary sleeps such as waiting ten seconds. Wait for an observable condition, for example `await waitFor(() => someCondition === true)`, using the test framework's bounded condition-wait helper.
- Always use `gql` from `graphql-tag` for GraphQL documents in tests. Never use `/* GraphQL */` template literal comments.
- Place graphql queries at the bottom of the file, below test cases.

# Vendure documentation

Always search the Vendure docs for existing configurations and strategies before implementing your own.

1. Use the `mcp__vendure_docs__search_docs` tool to search the Vendure docs. Notify me when I dont have it.
2. Prefer the MCP tool for any Vendure-specific concepts (configuration, strategies, plugins, GraphQL, etc.).