---
name: Vendure Best Practices
description: Load this when implementing or reviewing any code in Vendure, Vendure plugins or the Vendure React dashboard
---

Apply these guidelines when implementing or reviewing Vendure code, plugins, or React dashboard extensions. They cover code structure, event handling, logging, and other implementation constraints.

# General guidelines

- Place resolvers only in `resolvers: []`, not in `providers: []`

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
- Include context like `order.code` or `product.id` or `variant.sku` etc
- Include `e.stack` for errors

```ts
Logger.error(`It failed for order ${order.code}`, loggerCtx, e.stack); // Always use the nearest loggerCtx you can find
Logger.info(`Order ${order.code} has been processed`, loggerCtx);
```

# Testing

- Always use `gql` from `graphql-tag` for GraphQL documents in tests. Never use `/* GraphQL */` template literal comments.
- Place graphql queries at the bottom of the file, below test cases.

# Vendure documentation

Always search the Vendure docs for existing configurations and strategies before implementing your own.

1. Pi's built-in MCP support connects the Vendure MCP server (`https://docs.vendure.io/mcp`) automatically at startup.
2. Use the directly exposed `mcp__vendure_docs__search_docs` tool to search the Vendure docs.
3. Prefer the MCP tool for any Vendure-specific concepts (configuration, strategies, plugins, GraphQL, etc.).


# Vendure Source Code

Most developers will have the Vendure source code checked out locally. Prefer the documentation (`llms.txt`, see above) first, as it takes priority over the source code. When asked to look at the Vendure source code, you can inspect `~/git/vendure/`. Only do this when asked, and ask for permission to do so.
If it's not there, ask the developer where you can find the source code. The Vendure repository has the following structure:

- `packages/core`: The core of Vendure, most of the shop and admin api graphql code is here, as well as the main services, entities and configurable strategies.
- `packages/dashboard`: The source of the Vendure React Dashboard. Use this to find existing UI components, patterns and styling examples.
