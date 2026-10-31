# Exposed MCP tools

Generated from the server's MCP `tools/list` response. Do not edit manually.
Regenerate with `cd mcp && npm run build`.

Total: **17 tools**. Names are server-local; clients may add a server prefix.

Adds ~2,062 tokens to context.

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
| `get_monthly_client_summary` | Create a monthly summary for a Pinelab client with completed tasks, metrics, and next steps. Only use when the user explicitly mentions Pinelab and requests this summary. |
| `get_pinelab_trello_kanban` | Manage Pinelab’s kanban tasks in Trello: create, refine, move, and label cards from Inbox to Done. Only use when the user explicitly mentions “pinelab” (case-insensitive) |
| `get_plan_and_implement` | Make a plan to implement a given task. Only use when the user explicitly mentions “pinelab” (case-insensitive). |
| `get_refine` | Functionally refine a given task or feature. Only use when the user explicitly mentions “pinelab” (case-insensitive) |
| `get_review` | Interactively review a GitHub PR. Only use when the user explicitly mentions “pinelab” (case-insensitive) |

## Other tools

| Tool | Description |
| --- | --- |
| `add_trello_card_comment` | Adds a comment to a card on the Pinelab Trello Board. Use get_pinelab_trello_kanban for more information. |
| `create_trello_card` | Creates a card on the Pinelab Trello Board. Use get_pinelab_trello_kanban for more information. |
| `get_recipe` | Read a feature-specific Vendure or storefront resource by its recipe ID from list_recipes. Load only when relevant to the current feature or task. |
| `get_trello_board` | Reads the Pinelab Trello Board, lists, labels and members. Use get_pinelab_trello_kanban for more information. |
| `get_trello_card` | Reads a card and recent activity from the Pinelab Trello Board. Use get_pinelab_trello_kanban for more information. |
| `list_recipes` | Lists Pinelab Vendure and storefront recipes. Use get_recipe to read a recipe. |
| `list_trello_cards` | Lists open cards on the Pinelab Trello Board. Lists: Inbox, Waiting For Client Approval, Todo, Doing, Ready For Review, ✨Done. Returns { lists, cards }, including all current open lists. No board discovery needed. Use get_pinelab_trello_kanban for more information. |
| `update_trello_card` | Updates a card on the Pinelab Trello Board. Use get_pinelab_trello_kanban for more information. |

