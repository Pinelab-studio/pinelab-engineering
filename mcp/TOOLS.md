# Exposed MCP tools

Generated from the server's MCP `tools/list` response. Do not edit manually.
Regenerate with `cd mcp && npm run build`.

Total: **14 tools**. Names are server-local; clients may add a server prefix.

Adds ~1,057 tokens to context.

## Best practices

| Tool | Description |
| --- | --- |
| `get_coding_best_practices` | Always load these coding best practices before writing or reviewing any code |
| `get_testing_best_practices` | Apply when planning, writing, or reviewing unit, integration, or end-to-end tests |
| `get_vendure_best_practices` | Load this when implementing or reviewing any code in Vendure, Vendure plugins or the Vendure React dashboard |

## Workflows

| Tool | Description |
| --- | --- |
| `get_auto_classify_pr_risk` | Classify the linked PRs of the supplied Trello card and apply a risk label. Should be explicitly invoked. |
| `get_auto_implement` | Implement the supplied task, add the pinobi2 label, and create a PR for human review. |
| `get_implement` | Implement a Pinelab card from its link |
| `get_monthly_client_summary` | Only explicitly trigger when asked to create a monthly summary for a Pinelab client. |
| `get_read_gcloud_logging` | Read application logs from deployed Pinelab services on Google Cloud (Gcloud). |
| `get_refine` | Refine an existing Pinelab card or text input into an implementation plan. |
| `get_review` | Interactively review and improve a GitHub PR the Pinelab way. |

## Other tools

| Tool | Description |
| --- | --- |
| `get_recipe` | Read a feature-specific Vendure or storefront resource by its recipe ID from list_recipes. Load only when relevant to the current feature or task. |
| `list_plugins` | Lists Pinelab Vendure plugins with names, descriptions and README URLs. Read relevant READMEs before implementing. |
| `list_recipes` | Lists Pinelab Vendure and storefront recipes (guides). Use get_recipe to read a recipe. |
| `pinelab_trello` | Manage Pinelab Trello cards. Call without action to load workflows and action parameters, then call with action and input for operations. |

