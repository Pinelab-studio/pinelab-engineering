# Exposed MCP tools

Generated from the server's MCP `tools/list` response. Do not edit manually.
Regenerate with `cd mcp && npm run build`.

Total: **11 tools**. Names are server-local; clients may add a server prefix.

Adds ~847 tokens to context.

## Best practices

| Tool | Description |
| --- | --- |
| `get_coding_best_practices` | Always load these coding and testing best practices before writing or reviewing any code or tests. |
| `get_pull_request_guidelines` | Load when creating pull requests for Pinelab. |
| `get_vendure_best_practices` | Load this when implementing or reviewing any code in Vendure, Vendure plugins or the Vendure React dashboard |

## Workflows

| Tool | Description |
| --- | --- |
| `get_autonomous_implementation` | Instructions to autonomously implement Pinelab Todo tasks labeled pinobi2. Should be explicitly invoked. |
| `get_implement` | Load this when building or starting to implement a Pinelab task. |
| `get_monthly_client_summary` | Only explicitly trigger when asked to create a monthly summary for a Pinelab client. |
| `get_refine` | Refine a Pinelab task's scope, test behaviours, and technical guidance for implementation. |
| `get_review` | Interactively review a GitHub PR the Pinelab way. |

## Other tools

| Tool | Description |
| --- | --- |
| `get_recipe` | Read a feature-specific Vendure or storefront resource by its recipe ID from list_recipes. Load only when relevant to the current feature or task. |
| `list_recipes` | Lists Pinelab Vendure and storefront recipes (guides). Use get_recipe to read a recipe. |
| `pinelab_trello` | Manage Pinelab Trello tasks and recommend today's priorities. Call without action to load workflows and action parameters, then call with action and input for operations. |

