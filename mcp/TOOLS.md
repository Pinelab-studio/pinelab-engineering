# Exposed MCP tools

Generated from the server's MCP `tools/list` response. Do not edit manually.
Regenerate with `cd mcp && npm run build`.

Total: **11 tools**. Names are server-local; clients may add a server prefix.

Adds ~827 tokens to context.

## Best practices

| Tool | Description |
| --- | --- |
| `get_coding_best_practices` | Always load these coding and testing best practices before writing or reviewing any code or tests. |
| `get_pull_request_guidelines` | Load when creating pull requests for Pinelab. |
| `get_vendure_best_practices` | Load this when implementing or reviewing any code in Vendure, Vendure plugins or the Vendure React dashboard |

## Workflows

| Tool | Description |
| --- | --- |
| `get_kanban_priorities` | Recommend top 5 priorities todo's for today from the Pinelab Trello Kanban task board.  |
| `get_monthly_client_summary` | Only explicitly trigger when asked to create a monthly summary for a Pinelab client. |
| `get_plan_and_implement` | Make a plan to implement a given Pinelab task. |
| `get_refine` | Functionally refine a given Pinelab task or feature. |
| `get_review` | Interactively review a GitHub PR the Pinelab way. |

## Other tools

| Tool | Description |
| --- | --- |
| `get_recipe` | Read a feature-specific Vendure or storefront resource by its recipe ID from list_recipes. Load only when relevant to the current feature or task. |
| `list_recipes` | Lists Pinelab Vendure and storefront recipes. Use get_recipe to read a recipe. |
| `pinelab_trello` | Use only for explicitly requested Pinelab Trello operations. Call without action to load required workflow guidance and action parameters, then call with action and input. |

