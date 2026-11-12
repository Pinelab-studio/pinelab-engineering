# Pinelab Engineering

Human and AI engineering principles used at Pinelab.studio. Our engineering principles consist of these 2 components:

* [`docs/best-practices`](docs/best-practices) - General engineering guidelines at Pinelab that we use in almost all day-to-day tasks.
* [`docs/recipes`](docs/recipes) - Feature specific guides that can be invoked on demand. We only include this when researching new features, before actual implementation. 
* [`docs/workflow`](docs/workflow) - Way of working at Pinelab: Our kanban flow, expected PR handover etc. Mostly internal Pinelab stuff, but use it to your advantage.
  
# For Everyone

Please see https://plugins.pinelab.studio/ai-integration/ on how to use our best practices and recipes in your AI workflow.


# For Pinelab Developers

The Pinelab MCP exposes tools and coding standards and guidelines on how we work. The only real tool is for managing Trello cards, the rest are all skills that explain your local Codex/Pi/Opencode on how to handle tasks.
We care about your context, so we keep the toolset and descriptions short. See [`TOOLS.md`](./mcp/TOOLS.md) the amount of tokens the MCP adds to your context.

Add the Pinelab MCP server to your harness:

```md
{
  "mcpServers": {
    "pinelab": {
      "url": "https://mcp.pinelab-studio.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Workflow skills are designed to only trigger when you mention  **Pinelab** as to not affect your personal way of working.

These instructions in this MCP are based on our kanban workflow:

Raw cards enter Inbox. Refinement saves confirmed cards to Todo. Implementation moves a linked card through Doing to Ready For Review; human approval is required before Done.

Use these prompts to make your AI harness live up to Pinelab's way of working and quality standards:

## 0. Intake
Raw card intake happens automatically. You can also start refinement from text to create a new card.

## 1. Refine

_If a card is in Todo, it is already refined; skip this step._

Refinement accepts an existing card link or text describing new work. It investigates the repository, runs preflight checks, resolves requirements and test behaviours, and records technical guidance and an estimate. After you confirm the full draft and readiness, it updates the existing card or creates a new one in **Todo**. Explicit approval holds must be resolved first.

```text
Refine Pinelab card <Trello card link>
```

Or create a new card from text:

```text
Refine this for Pinelab: <description of the work>
```


## 2. Implement 

Supply one refined card link. The single `implement` workflow runs autonomously: it moves the card to **Doing**, implements and verifies the change, opens and self-reviews its PR, and links the PR on the card before moving it to **Ready For Review**. It makes routine technical decisions without another interview or plan confirmation. No `pinobi2` label or queue scan is required.

On a blocker, it stops, records evidence and the required action on the card, applies the existing red `blocked` label, and preserves partial work in a draft PR where safe. It never merges or deploys.

```text
Implement Pinelab card <Trello card link>
```


:warning: _Always `Pinelab review <gh PR link>` your own PR before asking someone else to review_

## 3. Review

After implementation, **Always** review your own pull request:

```text
Please Pinelab review <link to PR>
```

This will trigger the `pinelab-code-review` flow: Read PR description and comments, checkout the branch locally and reviews the code. It will again interview you, and you can make modification during the review, and push the to the open PR.

## 4. Handover

Implementation already adds PR links and verification evidence to the card. Its autonomous self-review does not replace your own interactive review or another developer's review. After human approval, move the card to **✨Done** through `pinelab_trello`; rejected implementations return to **Doing**. Merge and deployment still require explicit authorization.

See [`TOOLS.md`](./mcp/TOOLS.md) for a list of the exposed MCP tools.
